const { Client, LocalAuth } = require('whatsapp-web.js')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const sessions = new Map()
const sessionRetryCount = new Map() // Rastreamento de tentativas de reinício
const sessionRestartLock = new Map() // Lock para evitar múltiplas restaurações simultâneas
const { baseWebhookURL, sessionFolderPath, maxAttachmentSize, setMessagesAsSeen, webVersion, webVersionCacheType, recoverSessions, headlessBrowser, verboseLogs, autoStartPolling, pollingIntervalSeconds } = require('./config')
const { triggerWebhook, waitForNestedObject, checkIfEventisEnabled, applyMarkedUnreadPatch } = require('./utils')

// Detecta o caminho do Chromium automaticamente
const detectChromiumPath = () => {
  if (process.env.CHROME_BIN) {
    if (fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN
    console.warn(`⚠️  CHROME_BIN definido como "${process.env.CHROME_BIN}" mas não existe. Tentando auto-detectar...`)
  }
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/local/bin/chromium'
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`✅ Chromium encontrado em: ${p}`)
      return p
    }
  }
  return null // Deixa o puppeteer usar o bundled
}
const chromiumExecutablePath = detectChromiumPath()

// Sistema de Diagnóstico de Eventos
const eventCounters = new Map() // Contador de eventos por sessão
const eventTimestamps = new Map() // Últimos timestamps de eventos
const pollingIntervals = new Map() // Intervalos de polling ativo

// Inicializar contadores de eventos para uma sessão
function initEventCounters(sessionId) {
  eventCounters.set(sessionId, {
    message: 0,
    message_create: 0,
    message_ack: 0,
    qr: 0,
    ready: 0,
    authenticated: 0,
    lastMessageTimestamp: null,
    lastCreateTimestamp: null,
    sessionStartTime: new Date().toISOString()
  })
  eventTimestamps.set(sessionId, [])
}

// Registrar evento disparado
function logEventFired(sessionId, eventType, extraData = {}) {
  const counters = eventCounters.get(sessionId)
  if (!counters) return

  const timestamp = new Date().toISOString()
  
  // Incrementar contador
  if (counters[eventType] !== undefined) {
    counters[eventType]++
  }
  
  // Atualizar timestamp específico
  if (eventType === 'message') {
    counters.lastMessageTimestamp = timestamp
  } else if (eventType === 'message_create') {
    counters.lastCreateTimestamp = timestamp
  }
  
  // Guardar histórico (últimos 50 eventos)
  const timestamps = eventTimestamps.get(sessionId) || []
  timestamps.push({
    event: eventType,
    timestamp,
    ...extraData
  })
  if (timestamps.length > 50) timestamps.shift()
  eventTimestamps.set(sessionId, timestamps)
  
  if (verboseLogs) {
    console.log(`📊 [${sessionId}] Evento '${eventType}' disparado (total: ${counters[eventType]})`, extraData)
  }
}

// Obter diagnóstico de eventos de uma sessão
function getEventDiagnostics(sessionId) {
  return {
    counters: eventCounters.get(sessionId) || {},
    recentEvents: (eventTimestamps.get(sessionId) || []).slice(-10),
    pollingActive: pollingIntervals.has(sessionId)
  }
}

// Constantes para controle de retry
const MAX_RETRY_ATTEMPTS = 3
const RETRY_COOLDOWN_MS = 30000 // 30 segundos
const QR_MAX_RETRY_COOLDOWN_MS = 60000 // 60 segundos após max qr retries

/**
 * Sistema de Reconexão Automática
 * 
 * Características:
 * 1. Detecta erros de rede (ERR_NAME_NOT_RESOLVED, ERR_INTERNET_DISCONNECTED, etc)
 * 2. Não conta erros de rede no limite de tentativas
 * 3. Tenta reconectar automaticamente após 30 segundos quando sem internet
 * 4. Previne múltiplas tentativas simultâneas usando lock de sessão
 * 5. Destrói navegador adequadamente antes de reconectar
 * 6. Handlers unificados para evitar conflitos entre page_closed e browser_disconnected
 */

// Function to validate if the session is ready
const validateSession = async (sessionId) => {
  try {
    const returnData = { success: false, state: null, message: '' }

    // Session not Connected 😢
    if (!sessions.has(sessionId) || !sessions.get(sessionId)) {
      returnData.message = 'session_not_found'
      return returnData
    }

    const client = sessions.get(sessionId)
    // wait until the client is created
    await waitForNestedObject(client, 'pupPage')
      .catch((err) => { return { success: false, state: null, message: err.message } })

    // Wait for client.pupPage to be evaluable
    let maxRetry = 0
    while (true) {
      try {
        if (client.pupPage.isClosed()) {
          return { success: false, state: null, message: 'browser tab closed' }
        }
        await Promise.race([
          client.pupPage.evaluate('1'),
          new Promise(resolve => setTimeout(resolve, 1000))
        ])
        break
      } catch (error) {
        if (maxRetry === 2) {
          return { success: false, state: null, message: 'session closed' }
        }
        maxRetry++
      }
    }

    try {
      const state = await client.getState()
      returnData.state = state
      if (state !== 'CONNECTED') {
        returnData.message = 'session_not_connected'
        return returnData
      }
    } catch (stateError) {
      console.log('Error getting state:', stateError.message)
      // Try alternative state check
      try {
        const isReady = await client.pupPage.evaluate(() => {
          return window.Store && window.Store.State && window.Store.State.default && window.Store.State.default.state === 'CONNECTED'
        })
        if (!isReady) {
          returnData.message = 'session_not_connected'
          return returnData
        }
        returnData.state = 'CONNECTED'
      } catch (altError) {
        returnData.message = 'session_state_unknown'
        return returnData
      }
    }

    // Session Connected 🎉
    returnData.success = true
    returnData.message = 'session_connected'
    return returnData
  } catch (error) {
    console.log(error)
    return { success: false, state: null, message: error.message }
  }
}

// Function to handle client session restoration
const restoreSessions = () => {
  try {
    if (!fs.existsSync(sessionFolderPath)) {
      fs.mkdirSync(sessionFolderPath) // Cria a pasta de sessões se não existir
    }

    // Matar processos Chromium órfãos do container anterior antes de restaurar
    // (evita erro "profile in use" / Code: 21 no startup)
    console.log('🧹 Limpando processos Chromium órfãos e locks residuais...')
    killOrphanChromium()
    // Remover TODOS os locks de todas as sessões antes de restaurar
    // Usar find sem parentheses para evitar problema de escaping de template literals JS
    try {
      execSync(`find "${sessionFolderPath}" -name "SingletonLock" -delete 2>/dev/null; find "${sessionFolderPath}" -name "SingletonSocket" -delete 2>/dev/null; find "${sessionFolderPath}" -name "SingletonCookie" -delete 2>/dev/null; true`, { shell: true, stdio: 'ignore' })
    } catch (_) {}

    // Lê o conteúdo da pasta de sessões
    fs.readdir(sessionFolderPath, (_, files) => {
      if (!files) return

      // Filtra apenas pastas de sessão válidas
      const sessionFiles = files.filter(file => file.match(/^session-(.+)$/))

      if (sessionFiles.length === 0) return

      console.log(`\n📱 Restaurando ${sessionFiles.length} sessão(ões) existente(s)...`)

      // Restaura sessões com delay escalonado de 5s entre cada uma
      // Evita que múltiplas instâncias do Chrome subam ao mesmo tempo e sobrecarreguem a memória
      let index = 0
      for (const file of sessionFiles) {
        const match = file.match(/^session-(.+)$/)
        if (!match) continue

        const sessionId = match[1]

        if (sessions.has(sessionId) || sessionRestartLock.get(sessionId)) {
          console.log(`   ↳ ⏭️ Sessão ${sessionId} já está em processo de restauração, ignorando...`)
          continue
        }

        const delayMs = index * 5000 // 5 segundos de intervalo entre cada sessão
        index++

        setTimeout(() => {
          if (!sessions.has(sessionId) && !sessionRestartLock.get(sessionId)) {
            console.log(`   ↳ 🔄 Restaurando sessão: ${sessionId}`)
            setupSession(sessionId)
          }
        }, delayMs)
      }

      console.log(`✅ Agendadas ${index} sessão(ões) para restauração (intervalo de 5s entre cada uma)\n`)
    })
  } catch (error) {
    console.log(error)
    console.error('❌ Falha ao restaurar sessões:', error)
  }
}

// Remove Chromium SingletonLock para evitar erro "profile in use" após restart do container
// Remove locks do Chromium — SingletonLock é um SYMLINK QUEBRADO no novo container
// fs.existsSync retorna false para symlinks quebrados (segue o target), por isso
// usamos fs.rmSync({ force: true }) que remove o symlink sem verificar o target
const clearChromiumLocks = (sessionId) => {
  try {
    const sessionDir = path.join(sessionFolderPath, `session-${sessionId}`)
    const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie']
    const searchDirs = [sessionDir, path.join(sessionDir, 'Default')]
    for (const dir of searchDirs) {
      for (const lockFile of lockFiles) {
        const lockPath = path.join(dir, lockFile)
        try {
          // force:true: não lança erro se não existir; remove symlink sem seguir o target
          fs.rmSync(lockPath, { force: true })
        } catch (_) {}
      }
    }
    // find com -maxdepth e sem parentheses para evitar problema de escaping em JS
    try {
      execSync(`find "${sessionDir}" -name "SingletonLock" -delete 2>/dev/null; find "${sessionDir}" -name "SingletonSocket" -delete 2>/dev/null; find "${sessionDir}" -name "SingletonCookie" -delete 2>/dev/null; true`, { shell: true, stdio: 'ignore' })
    } catch (_) {}
    console.log(`🔓 Locks limpos para sessão ${sessionId}`)
  } catch (e) {
    console.warn(`⚠️ Não foi possível remover lock para ${sessionId}:`, e.message)
  }
}

// Mata todos os processos Chromium órfãos do container anterior
const killOrphanChromium = () => {
  try {
    execSync('pkill -9 -f chromium 2>/dev/null || true', { shell: true, stdio: 'ignore' })
    execSync('pkill -9 -f chrome 2>/dev/null || true', { shell: true, stdio: 'ignore' })
    execSync('pkill -9 -f "headless_shell" 2>/dev/null || true', { shell: true, stdio: 'ignore' })
  } catch (_) {}
}

// Setup Session
const setupSession = (sessionId) => {
  try {
    // Verificar se a sessão já existe E está ativa
    if (sessions.has(sessionId)) {
      const existingClient = sessions.get(sessionId)
      // Se o cliente existe e está inicializando/conectado, não criar nova instância
      if (existingClient && !sessionRestartLock.get(sessionId)) {
        console.log(`⚠️ Sessão ${sessionId} já existe e está ativa. Ignorando nova criação.`)
        return { success: false, message: `Session already exists for: ${sessionId}`, client: existingClient }
      }
    }

    // Limpar locks do Chromium antes de iniciar (evita erro "profile in use" após crash/restart)
    clearChromiumLocks(sessionId)

    // Disable the delete folder from the logout function (will be handled separately)
    const localAuth = new LocalAuth({ clientId: sessionId, dataPath: sessionFolderPath })
    delete localAuth.logout
    localAuth.logout = () => { }

    const clientOptions = {
      puppeteer: {
        executablePath: chromiumExecutablePath,
        headless: headlessBrowser,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-gpu', 
          '--no-process-singleton-dialog', // Impede o Chromium de bloquear por SingletonLock entre containers
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update',
          '--disable-features=site-per-process',
          '--disable-features=TranslateUI',
          '--disable-features=BlinkGenPropertyTrees',
          '--disable-software-rasterizer',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      authStrategy: localAuth,
      // Configurações para estabilidade SEM takeover automático
      takeoverOnConflict: false,  // DESABILITADO: Evita LOGOUTs automáticos indesejados
      authTimeoutMs: 120000,      // Tempo para autenticação
      qrMaxRetries: 5,            // Tentativas máximas de QR code
      restartOnAuthFail: false    // NÃO reiniciar automaticamente em falhas
    }

    if (webVersion) {
      clientOptions.webVersion = webVersion
      switch (webVersionCacheType.toLowerCase()) {
        case 'local':
          clientOptions.webVersionCache = {
            type: 'local'
          }
          break
        case 'remote':
          clientOptions.webVersionCache = {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/' + webVersion + '.html'
          }
          break
        default:
          clientOptions.webVersionCache = {
            type: 'none'
          }
      }
    }

    const client = new Client(clientOptions)

    // Inicializar contador de retries para esta sessão
    if (!sessionRetryCount.has(sessionId)) {
      sessionRetryCount.set(sessionId, 0)
    }

    // Inicialização com tratamento robusto de erros
    client.initialize().catch(async err => {
      console.log(`❌ Erro na inicialização da sessão ${sessionId}:`, err.message)
      
      // Verificar se já existe um processo de reconexão em andamento
      if (sessionRestartLock.get(sessionId)) {
        console.log(`⏭️ Já existe uma tentativa de reconexão em andamento para ${sessionId}`)
        return
      }
      
      const currentRetries = sessionRetryCount.get(sessionId) || 0

      // Detectar erro de profile lock do Chromium (Code: 21 / "profile appears to be in use")
      // Ocorre após restart do container quando o processo anterior não encerrou limpo
      const isProfileLocked = err.message.includes('profile appears to be in use') ||
                              err.message.includes('Code: 21') ||
                              err.message.includes('SingletonLock')

      if (isProfileLocked) {
        const lockRetries = (sessionRetryCount.get(sessionId) || 0) + 1
        sessionRetryCount.set(sessionId, lockRetries)

        // Após 3 tentativas sem sucesso: o process 1176 do container anterior
        // ainda mantém o lock no volume. Parar de tentar — aguardar 10 min
        // para o Railway limpar definitivamente o container antigo.
        const MAX_LOCK_RETRIES = 3
        if (lockRetries > MAX_LOCK_RETRIES) {
          const waitMin = 10
          console.warn(`⛔ Profile lock persistente em ${sessionId} após ${lockRetries} tentativas. O container anterior (processo 1176) ainda segura o lock no volume. Aguardando ${waitMin} min antes de tentar novamente.`)
          sessionRestartLock.set(sessionId, true)
          try { await client.destroy().catch(() => {}) } catch (e) {}
          sessions.delete(sessionId)
          setTimeout(() => {
            console.log(`🔁 Retomando tentativa de iniciar ${sessionId} após ${waitMin} min de espera...`)
            sessionRetryCount.set(sessionId, 0)
            sessionRestartLock.delete(sessionId)
            setupSession(sessionId)
          }, waitMin * 60 * 1000)
          return
        }

        const delayMs = lockRetries * 10000 // 10s, 20s, 30s
        console.log(`🔓 Profile lock detectado para ${sessionId} (tentativa ${lockRetries}/${MAX_LOCK_RETRIES}). Removendo lock e reconectando em ${delayMs / 1000}s...`)
        sessionRestartLock.set(sessionId, true)
        try { await client.destroy().catch(() => {}) } catch (e) {}
        sessions.delete(sessionId)
        killOrphanChromium()
        clearChromiumLocks(sessionId)
        setTimeout(() => {
          sessionRestartLock.delete(sessionId)
          console.log(`🔄 Reiniciando ${sessionId} após remoção do lock...`)
          setupSession(sessionId)
        }, delayMs)
        return
      }
      
      // Detectar se o navegador já está rodando
      const isBrowserAlreadyRunning = err.message.includes('browser is already running')
      
      if (isBrowserAlreadyRunning) {
        console.log(`⚠️ Navegador já está rodando para ${sessionId}. Aguardando cleanup...`)
        sessionRestartLock.set(sessionId, true)
        
        // Destruir o navegador forçadamente
        try {
          await client.destroy().catch(() => {})
          await new Promise(resolve => setTimeout(resolve, 3000))
        } catch (e) {}
        
        sessions.delete(sessionId)
        sessionRestartLock.delete(sessionId)
        
        setTimeout(() => {
          console.log(`🔄 Tentando reiniciar ${sessionId} após cleanup do navegador...`)
          setupSession(sessionId)
        }, 5000)
        return
      }
      
      // Detectar erros de rede (sem internet)
      const isNetworkError = err.message.includes('ERR_NAME_NOT_RESOLVED') ||
                            err.message.includes('ERR_INTERNET_DISCONNECTED') ||
                            err.message.includes('ERR_CONNECTION_REFUSED') ||
                            err.message.includes('ERR_CONNECTION_TIMED_OUT') ||
                            err.message.includes('ERR_NETWORK_CHANGED') ||
                            err.message.includes('net::ERR')
      
      // Erros de rede não contam para o limite de tentativas
      if (isNetworkError) {
        console.log(`🌐 Erro de rede detectado para sessão ${sessionId}`)
        console.log(`⏳ Aguardando 30s antes de tentar reconectar...`)
        
        sessionRestartLock.set(sessionId, true)
        
        // Destruir navegador antes de reconectar
        try {
          await client.destroy().catch(() => {})
        } catch (e) {}
        
        sessions.delete(sessionId)
        
        // Aguardar e tentar reconectar UMA VEZ
        setTimeout(() => {
          sessionRestartLock.delete(sessionId)
          console.log(`🔄 Tentando reconectar sessão ${sessionId}...`)
          setupSession(sessionId)
        }, 30000)
        
        return
      }
      
      // Verificar se atingiu o limite de tentativas (apenas para erros não relacionados a rede)
      if (currentRetries >= MAX_RETRY_ATTEMPTS) {
        console.log(`⚠️ Sessão ${sessionId} atingiu o limite máximo de ${MAX_RETRY_ATTEMPTS} tentativas de reinício`)
        console.log(`⏸️ Sessão ${sessionId} será pausada. Reinicie manualmente quando necessário.`)
        sessions.delete(sessionId)
        sessionRetryCount.delete(sessionId)
        sessionRestartLock.delete(sessionId)
        return
      }
      
      // Se o erro for de contexto destruído, tentar novamente após um delay
      if (err.message.includes('Execution context was destroyed') || 
          err.message.includes('Protocol error')) {
        
        sessionRetryCount.set(sessionId, currentRetries + 1)
        const retryDelay = RETRY_COOLDOWN_MS + (currentRetries * 10000) // Aumenta o delay a cada tentativa
        
        console.log(`⏳ Aguardando ${retryDelay / 1000} segundos antes de tentar novamente... (Tentativa ${currentRetries + 1}/${MAX_RETRY_ATTEMPTS})`)
        
        setTimeout(() => {
          if (!sessionRestartLock.get(sessionId)) {
            console.log(`🔄 Tentando reinicializar sessão ${sessionId}... (Tentativa ${currentRetries + 1}/${MAX_RETRY_ATTEMPTS})`)
            sessions.delete(sessionId)
            setupSession(sessionId)
          }
        }, retryDelay)
      }
    })

    initializeEvents(client, sessionId)

    // Save the session to the Map
    sessions.set(sessionId, client)
    return { success: true, message: 'Session initiated successfully', client }
  } catch (error) {
    return { success: false, message: error.message, client: null }
  }
}

const getSessionWebhookUrls = (sessionId) => {
  try {
    const file = path.join(sessionFolderPath, 'webhooks.json')
    const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
    return [
      ...(data[sessionId] || []),
      ...(data['*'] || []),
      process.env[sessionId.toUpperCase() + '_WEBHOOK_URL'],
      baseWebhookURL
    ].filter(Boolean)
  } catch (_) {
    return [baseWebhookURL].filter(Boolean)
  }
}

const initializeEvents = (client, sessionId) => {
  // Mescla webhooks do JSON persistido + env var + global
  const webhookUrls = getSessionWebhookUrls(sessionId)
  const sessionWebhook = webhookUrls.length === 1 ? webhookUrls[0] : webhookUrls

  // Flags para evitar eventos duplicados
  let readyFired = false
  let authenticatedFired = false
  let logoutProcessed = false
  let disconnectedProcessed = false
  
  // Event handler para quando o cliente estiver pronto
  checkIfEventisEnabled('ready')
    .then(_ => {
      client.on('ready', async () => {
        // Evitar disparar o evento múltiplas vezes
        if (readyFired) {
          if (verboseLogs) {
            console.log(`⏭️ Evento 'ready' duplicado ignorado para sessão ${sessionId}`)
          }
          return
        }
        readyFired = true
        
        console.log(`✅ Sessão ${sessionId} pronta e conectada!`)
        
        // Inicializar contadores de eventos
        initEventCounters(sessionId)
        logEventFired(sessionId, 'ready')
        
        // Aplicar patch para corrigir erro markedUnread
        await applyMarkedUnreadPatch(client, sessionId)
        
        // Resetar contador de retries ao conectar com sucesso
        sessionRetryCount.set(sessionId, 0)
        sessionRestartLock.delete(sessionId)
        triggerWebhook(sessionWebhook, sessionId, 'ready')
        
        // Auto-start polling se configurado
        if (autoStartPolling && !isPollingActive(sessionId)) {
          console.log(`🔄 Auto-iniciando polling para ${sessionId} (intervalo: ${pollingIntervalSeconds}s)`)
          startMessagePolling(sessionId, client, sessionWebhook, pollingIntervalSeconds)
        }
      })
    })

  // Event handler para erros durante loading
  client.on('loading_screen', (percent, message) => {
    if (verboseLogs) {
      console.log(`⏳ Carregando sessão ${sessionId}: ${percent}% - ${message}`)
    }
  })

  if (recoverSessions) {
    waitForNestedObject(client, 'pupPage').then(() => {
      // Wrapper para capturar erros de contexto destruído
      const safeEvaluate = async (fn, ...args) => {
        try {
          return await fn(...args)
        } catch (error) {
          if (error.message && (
            error.message.includes('Execution context was destroyed') ||
            error.message.includes('Target closed') ||
            error.message.includes('Protocol error')
          )) {
            if (verboseLogs) {
              console.log(`⚠️ Erro de contexto ignorado para ${sessionId}:`, error.message)
            }
            return null
          }
          throw error
        }
      }
      
      const restartSession = async (sessionId, reason = 'unknown', cooldownMs = RETRY_COOLDOWN_MS) => {
        // Verificar se já existe um restart em andamento ou se foi LOGOUT
        if (sessionRestartLock.get(sessionId)) {
          if (verboseLogs) {
            console.log(`⏭️ Reinício da sessão ${sessionId} bloqueado (lock ativo)`)
          }
          return
        }
        
        // Verificar se foi LOGOUT - não restaurar automaticamente
        if (logoutProcessed) {
          console.log(`⏸️ Sessão ${sessionId} não será restaurada automaticamente após LOGOUT.`)
          return
        }
        
        sessionRestartLock.set(sessionId, true)
        
        const currentRetries = sessionRetryCount.get(sessionId) || 0
        
        // Verificar limite de tentativas
        if (currentRetries >= MAX_RETRY_ATTEMPTS) {
          console.log(`🛑 Sessão ${sessionId} atingiu o limite de ${MAX_RETRY_ATTEMPTS} tentativas. Pausando reinícios automáticos.`)
          sessions.delete(sessionId)
          sessionRetryCount.delete(sessionId)
          sessionRestartLock.delete(sessionId)
          return
        }
        
        if (verboseLogs) {
          console.log(`🔄 Preparando reinício de ${sessionId} (Motivo: ${reason}, Tentativa: ${currentRetries + 1}/${MAX_RETRY_ATTEMPTS})`)
        }
        
        sessions.delete(sessionId)
        
        // Destruir cliente com tratamento de erros
        try {
          await client.destroy().catch(() => {})
          await new Promise(resolve => setTimeout(resolve, 2000)) // Aguardar cleanup
        } catch (e) {}
        
        sessionRetryCount.set(sessionId, currentRetries + 1)
        
        // Aguardar antes de reiniciar
        console.log(`⏳ Aguardando ${cooldownMs / 1000}s antes de reiniciar ${sessionId}...`)
        setTimeout(() => {
          sessionRestartLock.delete(sessionId)
          setupSession(sessionId)
        }, cooldownMs)
      }
      
      // Handler unificado para fechamento/erro da página
      let pageErrorHandled = false
      
      client.pupPage.once('close', function () {
        if (pageErrorHandled) return
        pageErrorHandled = true
        
        if (verboseLogs) {
          console.log(`⚠️ Página do navegador fechada para ${sessionId}`)
        }
        
        // Não fazer nada aqui - deixar o browser.disconnected tratar
      })
      
      client.pupPage.once('error', function (error) {
        if (pageErrorHandled) return
        pageErrorHandled = true
        
        console.log(`❌ Erro na página do navegador para ${sessionId}:`, error.message)
        
        // Detectar se é erro de rede
        const isNetworkError = error.message.includes('ERR_NAME_NOT_RESOLVED') ||
                              error.message.includes('ERR_INTERNET_DISCONNECTED') ||
                              error.message.includes('ERR_CONNECTION_REFUSED') ||
                              error.message.includes('ERR_CONNECTION_TIMED_OUT') ||
                              error.message.includes('ERR_NETWORK_CHANGED') ||
                              error.message.includes('net::ERR')
        
        if (isNetworkError) {
          console.log(`🌐 Erro de rede na página. Aguardando browser.disconnected...`)
          return
        }
        
        if (!sessionRestartLock.get(sessionId)) {
          restartSession(sessionId, 'page_error', RETRY_COOLDOWN_MS)
        }
      })
      
      // Handler principal para desconexão
      client.pupBrowser.once('disconnected', () => {
        if (verboseLogs) {
          console.log(`⚠️ Navegador desconectado para ${sessionId}`)
        }
        
        // Apenas restaurar se não houver lock ativo
        if (!sessionRestartLock.get(sessionId)) {
          console.log(`🔄 Preparando para reiniciar ${sessionId}...`)
          restartSession(sessionId, 'browser_disconnected', RETRY_COOLDOWN_MS)
        }
      })
      
    }).catch(e => { 
      console.log(`⚠️ Erro ao configurar handlers de recuperação para ${sessionId}:`, e.message)
    })
  }

  checkIfEventisEnabled('auth_failure')
    .then(_ => {
      client.on('auth_failure', (msg) => {
        console.log(`❌ Falha de autenticação para ${sessionId}:`, msg)
        triggerWebhook(sessionWebhook, sessionId, 'status', { msg })
      })
    })

  checkIfEventisEnabled('authenticated')
    .then(_ => {
      client.on('authenticated', () => {
        // Evitar disparar o evento múltiplas vezes
        if (authenticatedFired) {
          if (verboseLogs) {
            console.log(`⏭️ Evento 'authenticated' duplicado ignorado para sessão ${sessionId}`)
          }
          return
        }
        authenticatedFired = true
        
        console.log(`🔐 Sessão ${sessionId} autenticada`)
        // Resetar contador ao autenticar
        sessionRetryCount.set(sessionId, 0)
        triggerWebhook(sessionWebhook, sessionId, 'authenticated')
      })
    })

  checkIfEventisEnabled('call')
    .then(_ => {
      client.on('call', async (call) => {
        triggerWebhook(sessionWebhook, sessionId, 'call', { call })
      })
    })

  checkIfEventisEnabled('change_state')
    .then(_ => {
      client.on('change_state', state => {
        if (verboseLogs) {
          console.log(`🔄 Estado da sessão ${sessionId} alterado para: ${state}`)
        }
        triggerWebhook(sessionWebhook, sessionId, 'change_state', { state })
      })
    })

  checkIfEventisEnabled('disconnected')
    .then(_ => {
      client.on('disconnected', (reason) => {
        // Prevenir processamento duplicado
        if (disconnectedProcessed) {
          if (verboseLogs) {
            console.log(`⏭️ Evento 'disconnected' duplicado ignorado para sessão ${sessionId}`)
          }
          return
        }
        disconnectedProcessed = true
        
        console.log(`⚠️ Sessão ${sessionId} desconectada. Motivo:`, reason)
        
        // Se desconectar por excesso de tentativas de QR code, não tentar reiniciar automaticamente
        if (reason === 'Max qrcode retries reached') {
          console.log(`🛑 Sessão ${sessionId} será pausada. É necessário escanear o QR code manualmente.`)
          console.log(`💡 Use o endpoint /session/start/${sessionId} para reiniciar quando estiver pronto.`)
          
          // Limpar a sessão sem tentar reiniciar
          sessions.delete(sessionId)
          sessionRetryCount.delete(sessionId)
          sessionRestartLock.delete(sessionId)
          logoutProcessed = true
        }
        
        // Se desconectar por LOGOUT, NÃO fazer nada automático - deixar usuário decidir
        if (reason === 'LOGOUT') {
          console.log(`⚠️ Sessão ${sessionId} recebeu LOGOUT. Sessão será mantida para reconexão manual.`)
          console.log(`💡 Se foi intencional, use o endpoint /session/terminate/${sessionId} para remover.`)
          console.log(`💡 Para reconectar, use o endpoint /session/start/${sessionId}`)
          
          // Marcar como processado mas NÃO limpar automaticamente
          logoutProcessed = true
          sessionRestartLock.set(sessionId, true) // Prevenir auto-restart
        }
        
        triggerWebhook(sessionWebhook, sessionId, 'disconnected', { reason })
      })
    })

  checkIfEventisEnabled('group_join')
    .then(_ => {
      client.on('group_join', (notification) => {
        triggerWebhook(sessionWebhook, sessionId, 'group_join', { notification })
      })
    })

  checkIfEventisEnabled('group_leave')
    .then(_ => {
      client.on('group_leave', (notification) => {
        triggerWebhook(sessionWebhook, sessionId, 'group_leave', { notification })
      })
    })

  checkIfEventisEnabled('group_update')
    .then(_ => {
      client.on('group_update', (notification) => {
        triggerWebhook(sessionWebhook, sessionId, 'group_update', { notification })
      })
    })

  checkIfEventisEnabled('loading_screen')
    .then(_ => {
      client.on('loading_screen', (percent, message) => {
        triggerWebhook(sessionWebhook, sessionId, 'loading_screen', { percent, message })
      })
    })

  checkIfEventisEnabled('media_uploaded')
    .then(_ => {
      client.on('media_uploaded', (message) => {
        triggerWebhook(sessionWebhook, sessionId, 'media_uploaded', { message })
      })
    })

  checkIfEventisEnabled('message')
    .then(_ => {
      client.on('message', async (message) => {
        // Filtrar mensagens de status para não fazer spam nos logs
        if (message.from === 'status@broadcast' || message.isStatus) {
          return // Ignorar mensagens de status do WhatsApp
        }
        
        // Logging detalhado para diagnóstico
        logEventFired(sessionId, 'message', {
          from: message.from,
          hasMedia: message.hasMedia,
          type: message.type
        })
        
        triggerWebhook(sessionWebhook, sessionId, 'message', { message })
        if (message.hasMedia && message._data?.size < maxAttachmentSize) {
          // custom service event
          checkIfEventisEnabled('media').then(_ => {
            message.downloadMedia().then(messageMedia => {
              triggerWebhook(sessionWebhook, sessionId, 'media', { messageMedia, message })
            }).catch(e => {
              console.log('Download media error:', e.message)
            })
          })
        }
        if (setMessagesAsSeen) {
          try {
            const chat = await message.getChat()
            // Verificar se o chat e o m\u00e9todo sendSeen est\u00e3o dispon\u00edveis antes de chamar
            if (chat && typeof chat.sendSeen === 'function') {
              await chat.sendSeen()
            }
          } catch (error) {
            // Ignorar erros do sendSeen para n\u00e3o interromper o fluxo
            if (verboseLogs) {
              console.log(`\u26a0\ufe0f Erro ao marcar mensagem como lida (${sessionId}):`, error.message)
            }
          }
        }
      })
    })

  checkIfEventisEnabled('message_ack')
    .then(_ => {
      client.on('message_ack', async (message, ack) => {
        triggerWebhook(sessionWebhook, sessionId, 'message_ack', { message, ack })
        if (setMessagesAsSeen) {
          try {
            const chat = await message.getChat()
            if (chat && typeof chat.sendSeen === 'function') {
              await chat.sendSeen()
            }
          } catch (error) {
            if (verboseLogs) {
              console.log(`⚠️ Erro ao marcar mensagem como lida (${sessionId}):`, error.message)
            }
          }
        }
      })
    })

  checkIfEventisEnabled('message_create')
    .then(_ => {
      client.on('message_create', async (message) => {
        // Filtrar mensagens de status para não fazer spam nos logs
        if (message.from === 'status@broadcast' || message.isStatus) {
          return // Ignorar mensagens de status do WhatsApp
        }
        
        // Logging detalhado para diagnóstico
        logEventFired(sessionId, 'message_create', {
          from: message.from,
          hasMedia: message.hasMedia,
          type: message.type,
          fromMe: message.fromMe
        })
        
        triggerWebhook(sessionWebhook, sessionId, 'message_create', { message })
        if (setMessagesAsSeen) {
          try {
            const chat = await message.getChat()
            if (chat && typeof chat.sendSeen === 'function') {
              await chat.sendSeen()
            }
          } catch (error) {
            if (verboseLogs) {
              console.log(`⚠️ Erro ao marcar mensagem como lida (${sessionId}):`, error.message)
            }
          }
        }
      })
    })

  checkIfEventisEnabled('message_reaction')
    .then(_ => {
      client.on('message_reaction', (reaction) => {
        triggerWebhook(sessionWebhook, sessionId, 'message_reaction', { reaction })
      })
    })

  checkIfEventisEnabled('message_edit')
    .then(_ => {
      client.on('message_edit', (message, newBody, prevBody) => {
        triggerWebhook(sessionWebhook, sessionId, 'message_edit', { message, newBody, prevBody })
      })
    })

  checkIfEventisEnabled('message_ciphertext')
    .then(_ => {
      client.on('message_ciphertext', (message) => {
        triggerWebhook(sessionWebhook, sessionId, 'message_ciphertext', { message })
      })
    })

  checkIfEventisEnabled('message_revoke_everyone')
    .then(_ => {
      // eslint-disable-next-line camelcase
      client.on('message_revoke_everyone', async (message) => {
        // Filtrar mensagens de status para não fazer spam nos logs
        if (message.from === 'status@broadcast' || message.isStatus) {
          return // Ignorar mensagens de status do WhatsApp
        }
        
        // eslint-disable-next-line camelcase
        triggerWebhook(sessionWebhook, sessionId, 'message_revoke_everyone', { message })
      })
    })

  checkIfEventisEnabled('message_revoke_me')
    .then(_ => {
      client.on('message_revoke_me', async (message) => {
        // Filtrar mensagens de status para não fazer spam nos logs
        if (message.from === 'status@broadcast' || message.isStatus) {
          return // Ignorar mensagens de status do WhatsApp
        }
        
        triggerWebhook(sessionWebhook, sessionId, 'message_revoke_me', { message })
      })
    })

  client.on('qr', (qr) => {
    // inject qr code into session
    client.qr = qr
    checkIfEventisEnabled('qr')
      .then(_ => {
        triggerWebhook(sessionWebhook, sessionId, 'qr', { qr })
      })
  })

  checkIfEventisEnabled('ready')
    .then(_ => {
      client.on('ready', () => {
        triggerWebhook(sessionWebhook, sessionId, 'ready')
      })
    })

  checkIfEventisEnabled('contact_changed')
    .then(_ => {
      client.on('contact_changed', async (message, oldId, newId, isContact) => {
        triggerWebhook(sessionWebhook, sessionId, 'contact_changed', { message, oldId, newId, isContact })
      })
    })

  checkIfEventisEnabled('chat_removed')
    .then(_ => {
      client.on('chat_removed', async (chat) => {
        triggerWebhook(sessionWebhook, sessionId, 'chat_removed', { chat })
      })
    })

  checkIfEventisEnabled('chat_archived')
    .then(_ => {
      client.on('chat_archived', async (chat, currState, prevState) => {
        triggerWebhook(sessionWebhook, sessionId, 'chat_archived', { chat, currState, prevState })
      })
    })

  checkIfEventisEnabled('unread_count')
    .then(_ => {
      client.on('unread_count', async (chat) => {
        triggerWebhook(sessionWebhook, sessionId, 'unread_count', { chat })
      })
    })
}

/**
 * Sistema de Fallback com Polling
 * 
 * Quando os eventos nativos do whatsapp-web.js não estão funcionando,
 * este sistema faz polling periódico dos chats para detectar novas mensagens.
 * 
 * Características:
 * 1. Verifica chats ativos a cada X segundos (configurável)
 * 2. Detecta novas mensagens comparando timestamps
 * 3. Dispara webhooks manualmente para manter compatibilidade
 * 4. Pode ser ativado/desativado por sessão
 * 5. Registra mensagens já processadas para evitar duplicatas
 */

// Mapa para rastrear mensagens já processadas
const processedMessages = new Map()

// Inicializar set de mensagens processadas para uma sessão
function initProcessedMessages(sessionId) {
  if (!processedMessages.has(sessionId)) {
    processedMessages.set(sessionId, new Set())
  }
}

// Verificar se mensagem já foi processada
function isMessageProcessed(sessionId, messageId) {
  const processed = processedMessages.get(sessionId)
  if (!processed) return false
  return processed.has(messageId)
}

// Marcar mensagem como processada (manter apenas últimas 1000)
function markMessageProcessed(sessionId, messageId) {
  let processed = processedMessages.get(sessionId)
  if (!processed) {
    processed = new Set()
    processedMessages.set(sessionId, processed)
  }
  
  processed.add(messageId)
  
  // Limitar tamanho do Set
  if (processed.size > 1000) {
    const arr = Array.from(processed)
    processed.clear()
    arr.slice(-800).forEach(id => processed.add(id))
  }
}

// Sistema de polling para detectar mensagens
async function startMessagePolling(sessionId, client, sessionWebhook, intervalSeconds = 5) {
  // Verificar se já existe polling ativo
  if (pollingIntervals.has(sessionId)) {
    console.log(`⚠️ Polling já está ativo para ${sessionId}`)
    return
  }
  
  initProcessedMessages(sessionId)
  
  console.log(`🔄 Iniciando polling de mensagens para ${sessionId} (intervalo: ${intervalSeconds}s)`)
  
  const pollFunction = async () => {
    try {
      const state = await client.getState()
      if (state !== 'CONNECTED') {
        return // Não fazer polling se não estiver conectado
      }
      
      // Buscar chats com mensagens não lidas
      const chats = await client.getChats()
      const unreadChats = chats.filter(chat => chat.unreadCount > 0)
      
      if (verboseLogs && unreadChats.length > 0) {
        console.log(`📨 Polling ${sessionId}: ${unreadChats.length} chats com mensagens não lidas`)
      }
      
      for (const chat of unreadChats) {
        try {
          // Buscar últimas mensagens do chat
          const messages = await chat.fetchMessages({ limit: chat.unreadCount + 5 })
          
          for (const message of messages) {
            // Filtrar mensagens de status
            if (message.from === 'status@broadcast' || message.isStatus) {
              continue
            }
            
            // Verificar se mensagem já foi processada
            if (isMessageProcessed(sessionId, message.id._serialized)) {
              continue
            }
            
            // Marcar como processada
            markMessageProcessed(sessionId, message.id._serialized)
            
            // Disparar webhook manualmente (simulando evento)
            console.log(`🔔 [POLLING] Nova mensagem detectada em ${sessionId}: ${message.from}`)
            logEventFired(sessionId, 'message_polled', {
              from: message.from,
              hasMedia: message.hasMedia,
              type: message.type,
              method: 'polling'
            })
            
            // Disparar webhook igual aos eventos nativos
            await triggerWebhook(sessionWebhook, sessionId, 'message', { message })
            
            // Se tiver mídia, baixar também
            if (message.hasMedia && message._data?.size < maxAttachmentSize) {
              try {
                const messageMedia = await message.downloadMedia()
                await triggerWebhook(sessionWebhook, sessionId, 'media', { messageMedia, message })
              } catch (e) {
                console.log('Download media error (polling):', e.message)
              }
            }
            
            // Marcar como lida se configurado
            if (setMessagesAsSeen) {
              try {
                if (chat && typeof chat.sendSeen === 'function') {
                  await chat.sendSeen()
                }
              } catch (error) {
                // Ignorar erros
              }
            }
          }
        } catch (chatError) {
          if (verboseLogs) {
            console.log(`⚠️ Erro ao processar chat no polling (${sessionId}):`, chatError.message)
          }
        }
      }
    } catch (error) {
      if (verboseLogs) {
        console.log(`⚠️ Erro no polling de mensagens (${sessionId}):`, error.message)
      }
    }
  }
  
  // Executar polling imediatamente e depois em intervalos
  pollFunction()
  const intervalId = setInterval(pollFunction, intervalSeconds * 1000)
  pollingIntervals.set(sessionId, intervalId)
}

// Parar polling de mensagens
function stopMessagePolling(sessionId) {
  const intervalId = pollingIntervals.get(sessionId)
  if (intervalId) {
    clearInterval(intervalId)
    pollingIntervals.delete(sessionId)
    console.log(`⏹️ Polling parado para ${sessionId}`)
    return true
  }
  return false
}

// Verificar se polling está ativo
function isPollingActive(sessionId) {
  return pollingIntervals.has(sessionId)
}

// Function to delete client session folder
const deleteSessionFolder = async (sessionId) => {
  try {
    const targetDirPath = path.join(sessionFolderPath, `session-${sessionId}`)
    const resolvedTargetDirPath = await fs.promises.realpath(targetDirPath)
    const resolvedSessionPath = await fs.promises.realpath(sessionFolderPath)

    // Ensure the target directory path ends with a path separator
    const safeSessionPath = `${resolvedSessionPath}${path.sep}`

    // Validate the resolved target directory path is a subdirectory of the session folder path
    if (!resolvedTargetDirPath.startsWith(safeSessionPath)) {
      throw new Error('Invalid path: Directory traversal detected')
    }
    await fs.promises.rm(resolvedTargetDirPath, { recursive: true, force: true })
  } catch (error) {
    console.log('Folder deletion error', error)
    throw error
  }
}

// Function to reload client session without removing browser cache
const reloadSession = async (sessionId) => {
  try {
    const client = sessions.get(sessionId)
    if (!client) {
      return
    }
    // Protege contra pupPage null (quando o browser nunca chegou a inicializar)
    if (client.pupPage) {
      client.pupPage.removeAllListeners('close')
      client.pupPage.removeAllListeners('error')
    }
    try {
      if (client.pupBrowser) {
        const pages = await client.pupBrowser.pages()
        await Promise.all(pages.map((page) => page.close()))
        await Promise.race([
          client.pupBrowser.close(),
          new Promise(resolve => setTimeout(resolve, 5000))
        ])
      }
    } catch (e) {
      try {
        const childProcess = client.pupBrowser?.process()
        if (childProcess) childProcess.kill(9)
      } catch (_) {}
    }
    sessions.delete(sessionId)
    setupSession(sessionId)
  } catch (error) {
    console.log(error)
    throw error
  }
}

const deleteSession = async (sessionId, validation) => {
  try {
    const client = sessions.get(sessionId)
    if (!client) {
      return
    }
    if (client.pupPage) {
      client.pupPage.removeAllListeners('close')
      client.pupPage.removeAllListeners('error')
    }
    if (validation.success) {
      // Client Connected, request logout
      console.log(`Logging out session ${sessionId}`)
      await client.logout()
    } else if (validation.message === 'session_not_connected') {
      // Client not Connected, request destroy
      console.log(`Destroying session ${sessionId}`)
      await client.destroy()
    }
    // Wait 10 secs for client.pupBrowser to be disconnected before deleting the folder
    let maxDelay = 0
    while (client.pupBrowser?.isConnected() && (maxDelay < 10)) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      maxDelay++
    }
    await deleteSessionFolder(sessionId)
    sessions.delete(sessionId)
  } catch (error) {
    console.log(error)
    throw error
  }
}

// Function to handle session flush
const flushSessions = async (deleteOnlyInactive) => {
  try {
    // Read the contents of the sessions folder
    const files = await fs.promises.readdir(sessionFolderPath)
    // Iterate through the files in the parent folder
    for (const file of files) {
      // Use regular expression to extract the string from the folder name
      const match = file.match(/^session-(.+)$/)
      if (match) {
        const sessionId = match[1]
        const validation = await validateSession(sessionId)
        if (!deleteOnlyInactive || !validation.success) {
          await deleteSession(sessionId, validation)
        }
      }
    }
  } catch (error) {
    console.log(error)
    throw error
  }
}

module.exports = {
  sessions,
  // Usado pelo middleware para bloquear ações enquanto a sessão está em reinício/LOGOUT
  sessionRestartLock,
  setupSession,
  restoreSessions,
  validateSession,
  deleteSession,
  reloadSession,
  flushSessions,
  // Funções de diagnóstico
  getEventDiagnostics,
  eventCounters,
  pollingIntervals,
  // Funções de polling
  startMessagePolling,
  stopMessagePolling,
  isPollingActive
}
