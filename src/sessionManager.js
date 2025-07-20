// Sistema de verificação e recuperação de sessões para Render
const fs = require('fs')
const path = require('path')

class SessionManager {
  constructor() {
    this.sessionsPath = process.env.SESSIONS_PATH || './sessions'
    this.isProduction = process.env.NODE_ENV === 'production'
    this.setupSessionDirectory()
  }

  setupSessionDirectory() {
    try {
      console.log('🔧 SessionManager: Configurando diretório de sessões...')
      console.log(`📁 Caminho: ${this.sessionsPath}`)
      console.log(`🌍 Ambiente: ${this.isProduction ? 'Produção' : 'Desenvolvimento'}`)

      // Criar diretório se não existir
      if (!fs.existsSync(this.sessionsPath)) {
        console.log('📁 Criando diretório de sessões...')
        fs.mkdirSync(this.sessionsPath, { recursive: true })
        console.log('✅ Diretório criado com sucesso')
      } else {
        console.log('✅ Diretório de sessões já existe')
      }

      // Verificar permissões
      this.checkPermissions()
      
      // Listar sessões existentes
      this.listExistingSessions()

      // Verificar espaço em disco
      this.checkDiskSpace()

    } catch (error) {
      console.error('❌ Erro ao configurar diretório de sessões:', error.message)
      
      // Tentar caminho alternativo se falhar
      if (this.isProduction && this.sessionsPath !== './sessions') {
        console.log('🔄 Tentando caminho alternativo...')
        this.sessionsPath = './sessions'
        this.setupSessionDirectory()
      }
    }
  }

  checkPermissions() {
    try {
      // Testar escrita
      const testFile = path.join(this.sessionsPath, '.write-test')
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
      console.log('✅ Permissões de escrita: OK')
    } catch (error) {
      console.error('❌ Erro de permissões:', error.message)
      
      // Tentar corrigir permissões (se possível)
      try {
        if (this.isProduction) {
          console.log('🔧 Tentando corrigir permissões...')
          fs.chmodSync(this.sessionsPath, 0o755)
          console.log('✅ Permissões corrigidas')
        }
      } catch (chmodError) {
        console.error('❌ Não foi possível corrigir permissões:', chmodError.message)
      }
    }
  }

  listExistingSessions() {
    try {
      const files = fs.readdirSync(this.sessionsPath)
      const sessionDirs = files.filter(file => {
        const filePath = path.join(this.sessionsPath, file)
        return fs.statSync(filePath).isDirectory() && file.startsWith('session-')
      })

      console.log(`📊 Sessões encontradas: ${sessionDirs.length}`)
      
      sessionDirs.forEach(sessionDir => {
        const sessionPath = path.join(this.sessionsPath, sessionDir)
        const sessionFiles = fs.readdirSync(sessionPath)
        const stats = fs.statSync(sessionPath)
        
        console.log(`   📂 ${sessionDir}:`)
        console.log(`      - Arquivos: ${sessionFiles.length}`)
        console.log(`      - Modificado: ${stats.mtime.toISOString()}`)
        
        // Verificar se tem arquivos essenciais do WhatsApp Web
        const hasLocalStorage = sessionFiles.some(f => f.includes('Local Storage'))
        const hasSessionStorage = sessionFiles.some(f => f.includes('Session Storage'))
        const hasIndexedDB = sessionFiles.some(f => f.includes('IndexedDB'))
        
        if (hasLocalStorage && (hasSessionStorage || hasIndexedDB)) {
          console.log(`      - ✅ Sessão válida`)
        } else {
          console.log(`      - ⚠️  Sessão pode estar incompleta`)
        }
      })

    } catch (error) {
      console.error('❌ Erro ao listar sessões:', error.message)
    }
  }

  checkDiskSpace() {
    try {
      const stats = fs.statSync(this.sessionsPath)
      console.log(`💾 Diretório acessível: ${stats.isDirectory() ? 'Sim' : 'Não'}`)
      
      // Se estiver no Linux/Unix (Render), tentar verificar espaço
      if (this.isProduction) {
        const { execSync } = require('child_process')
        try {
          const diskInfo = execSync(`df -h "${this.sessionsPath}"`, { encoding: 'utf8' })
          console.log('📊 Espaço em disco:')
          console.log(diskInfo)
        } catch (dfError) {
          console.log('ℹ️  Informações de disco não disponíveis')
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao verificar disco:', error.message)
    }
  }

  // Método para verificar se uma sessão específica existe e é válida
  isSessionValid(sessionId) {
    try {
      const sessionDir = path.join(this.sessionsPath, `session-${sessionId}`)
      
      if (!fs.existsSync(sessionDir)) {
        return { valid: false, reason: 'Diretório não existe' }
      }

      const files = fs.readdirSync(sessionDir)
      const hasLocalStorage = files.some(f => f.includes('Local Storage'))
      const hasSessionStorage = files.some(f => f.includes('Session Storage'))
      const hasIndexedDB = files.some(f => f.includes('IndexedDB'))

      if (!hasLocalStorage) {
        return { valid: false, reason: 'Local Storage ausente' }
      }

      if (!hasSessionStorage && !hasIndexedDB) {
        return { valid: false, reason: 'Session Storage e IndexedDB ausentes' }
      }

      const stats = fs.statSync(sessionDir)
      const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)

      return {
        valid: true,
        filesCount: files.length,
        lastModified: stats.mtime,
        daysSinceModified: Math.round(daysSinceModified * 100) / 100
      }

    } catch (error) {
      return { valid: false, reason: `Erro: ${error.message}` }
    }
  }

  // Método para limpar sessões antigas/corrompidas
  cleanupOldSessions(maxDays = 7) {
    try {
      console.log(`🧹 Limpando sessões antigas (>${maxDays} dias)...`)
      
      const files = fs.readdirSync(this.sessionsPath)
      const sessionDirs = files.filter(file => {
        const filePath = path.join(this.sessionsPath, file)
        return fs.statSync(filePath).isDirectory() && file.startsWith('session-')
      })

      let cleanedCount = 0
      sessionDirs.forEach(sessionDir => {
        const sessionPath = path.join(this.sessionsPath, sessionDir)
        const stats = fs.statSync(sessionPath)
        const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)

        if (daysSinceModified > maxDays) {
          try {
            fs.rmSync(sessionPath, { recursive: true, force: true })
            console.log(`   🗑️  Removida: ${sessionDir} (${Math.round(daysSinceModified)} dias)`)
            cleanedCount++
          } catch (removeError) {
            console.error(`   ❌ Erro ao remover ${sessionDir}:`, removeError.message)
          }
        }
      })

      console.log(`✅ Limpeza concluída: ${cleanedCount} sessões removidas`)

    } catch (error) {
      console.error('❌ Erro na limpeza:', error.message)
    }
  }

  // Método para criar um backup das sessões (se necessário)
  backupSessions() {
    // Implementar se necessário para debugging
    console.log('💾 Backup não implementado - usar Persistent Disk do Render')
  }

  // Método para forçar sincronização (flush) dos dados
  syncSessions() {
    try {
      console.log('🔄 Sincronizando dados das sessões...')
      
      // No Node.js, forçar sincronização do filesystem
      if (typeof process !== 'undefined' && process.platform !== 'win32') {
        const { execSync } = require('child_process')
        try {
          execSync('sync', { stdio: 'ignore' })
          console.log('✅ Sincronização forçada')
        } catch (syncError) {
          console.log('ℹ️  Comando sync não disponível')
        }
      }
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error.message)
    }
  }

  getStatus() {
    return {
      sessionsPath: this.sessionsPath,
      isProduction: this.isProduction,
      directoryExists: fs.existsSync(this.sessionsPath),
      canWrite: this.canWrite(),
      sessionCount: this.getSessionCount()
    }
  }

  canWrite() {
    try {
      const testFile = path.join(this.sessionsPath, '.write-test-' + Date.now())
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
      return true
    } catch (error) {
      return false
    }
  }

  getSessionCount() {
    try {
      const files = fs.readdirSync(this.sessionsPath)
      return files.filter(file => {
        const filePath = path.join(this.sessionsPath, file)
        return fs.statSync(filePath).isDirectory() && file.startsWith('session-')
      }).length
    } catch (error) {
      return 0
    }
  }
}

// Singleton para uso global
const sessionManager = new SessionManager()

module.exports = {
  SessionManager,
  sessionManager
}
