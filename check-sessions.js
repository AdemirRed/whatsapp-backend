// Script para verificar e restaurar sessões no Render
const fs = require('fs')
const path = require('path')

const checkSessions = () => {
  const sessionsPath = process.env.SESSIONS_PATH || './sessions'
  
  console.log('🔍 Verificando sessões...')
  console.log(`📁 Caminho das sessões: ${sessionsPath}`)
  
  try {
    // Verificar se o diretório existe
    if (!fs.existsSync(sessionsPath)) {
      console.log('❌ Diretório de sessões não existe, criando...')
      fs.mkdirSync(sessionsPath, { recursive: true })
      console.log('✅ Diretório criado')
      return
    }
    
    console.log('✅ Diretório de sessões existe')
    
    // Listar conteúdo do diretório
    const files = fs.readdirSync(sessionsPath)
    console.log(`📊 Arquivos encontrados: ${files.length}`)
    
    if (files.length === 0) {
      console.log('⚠️  Nenhuma sessão salva encontrada')
      return
    }
    
    // Verificar cada sessão
    files.forEach(file => {
      const filePath = path.join(sessionsPath, file)
      const stats = fs.statSync(filePath)
      
      if (stats.isDirectory()) {
        console.log(`📂 Sessão encontrada: ${file}`)
        
        // Verificar conteúdo da sessão
        try {
          const sessionFiles = fs.readdirSync(filePath)
          console.log(`   - Arquivos na sessão: ${sessionFiles.length}`)
          console.log(`   - Tamanho: ${getDirectorySize(filePath)} bytes`)
          console.log(`   - Última modificação: ${stats.mtime}`)
          
          // Verificar se tem arquivos essenciais do WhatsApp
          const hasLocalStorage = sessionFiles.some(f => f.includes('Local Storage'))
          const hasSession = sessionFiles.some(f => f.includes('Session'))
          
          if (hasLocalStorage && hasSession) {
            console.log('   - ✅ Sessão parece válida')
          } else {
            console.log('   - ⚠️  Sessão pode estar incompleta')
          }
        } catch (err) {
          console.log(`   - ❌ Erro ao ler sessão: ${err.message}`)
        }
      } else {
        console.log(`📄 Arquivo: ${file} (${stats.size} bytes)`)
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao verificar sessões:', error.message)
  }
}

const getDirectorySize = (dir) => {
  let totalSize = 0
  try {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stats = fs.statSync(filePath)
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath)
      } else {
        totalSize += stats.size
      }
    }
  } catch (err) {
    // Ignorar erros de permissão
  }
  return totalSize
}

const checkDiskSpace = () => {
  const sessionsPath = process.env.SESSIONS_PATH || './sessions'
  console.log('\n💾 Verificando espaço em disco...')
  
  // Executar comando df se disponível (Linux/Unix)
  try {
    const { execSync } = require('child_process')
    const output = execSync(`df -h "${sessionsPath}" 2>/dev/null || echo "Comando df não disponível"`, { encoding: 'utf8' })
    console.log(output)
  } catch (err) {
    console.log('ℹ️  Não foi possível verificar espaço em disco')
  }
}

// Executar verificações
console.log('🔧 WhatsApp Sessions Health Check')
console.log('================================\n')

checkSessions()
checkDiskSpace()

console.log('\n================================')
console.log('✅ Verificação concluída')

module.exports = { checkSessions, checkDiskSpace }
