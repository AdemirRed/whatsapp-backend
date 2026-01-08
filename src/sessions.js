const { Client, LocalAuth } = require('whatsapp-web.js')
const fs = require('fs')
const path = require('path')
const sessions = new Map()
const sessionRetryCount = new Map() // Rastreamento de tentativas de reinício
const sessionRestartLock = new Map() // Lock para evitar múltiplas restaurações simultâneas
const { baseWebhookURL, sessionFolderPath, maxAttachmentSize, setMessagesAsSeen, webVersion, webVersionCacheType, recoverSessions, headlessBrowser, verboseLogs } = require('./config')
const { triggerWebhook, waitForNestedObject, checkIfEventisEnabled } = require('./utils')

// Constantes para controle de retry
const MAX_RETRY_ATTEMPTS = 3
const RETRY_COOLDOWN_MS = 30000 // 30 segundos
const QR_MAX_RETRY_COOLDOWN_MS = 60000 // 60 segundos após max qr retries

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
      fs.mkdirSync(sessionFolderPath) // Create the session directory if it doesn't exist
    }
    // Read the contents of the folder
    fs.readdir(sessionFolderPath, (_, files) => {
      // Iterate through the files in the parent folder
      const sessionFiles = files.filter(file => file.match(/^session-(.+)$/))
      
      if (sessionFiles.length > 0) {
        console.log(`\n📱 Restaurando ${sessionFiles.length} sessão(ões) existente(s)...`)
      }
      
      for (const file of sessionFiles) {
        // Use regular expression to extract the string from the folder name
        const match = file.match(/^session-(.+)$/)
        if (match) {
          const sessionId = match[1]
          // Verificar se a sessão já não está sendo restaurada
          if (!sessions.has(sessionId) && !sessionRestartLock.get(sessionId)) {
            console.log(`   ↳ 🔄 Restaurando sessão: ${sessionId}`)
            setupSession(sessionId)
          } else {
            console.log(`   ↳ ⏭️ Sessão ${sessionId} já está em processo de restauração, ignorando...`)
          }
        }
      }
      
      if (sessionFiles.length > 0) {
        console.log(`✅ Todas as sessões foram iniciadas!\n`)
      }
    })
  } catch (error) {
    console.log(error)
    console.error('❌ Falha ao restaurar sessões:', error)
  }
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

    // Disable the delete folder from the logout function (will be handled separately)
    const localAuth = new LocalAuth({ clientId: sessionId, dataPath: sessionFolderPath })
    delete localAuth.logout
    localAuth.logout = () => { }

    const clientOptions = {
      puppeteer: {
        executablePath: process.env.CHROME_BIN || null,
        headless: headlessBrowser,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-gpu', 
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
          '--disable-features=BlinkGenPropertyTrees'
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
    client.initialize().catch(err => {
      console.log(`❌ Erro na inicialização da sessão ${sessionId}:`, err.message)
      
      const currentRetries = sessionRetryCount.get(sessionId) || 0
      
      // Verificar se atingiu o limite de tentativas
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

const initializeEvents = (client, sessionId) => {
  // check if the session webhook is overridden
  const sessionWebhook = process.env[sessionId.toUpperCase() + '_WEBHOOK_URL'] || baseWebhookURL

  // Flags para evitar eventos duplicados
  let readyFired = false
  let authenticatedFired = false
  let logoutProcessed = false
  let disconnectedProcessed = false
  
  // Event handler para quando o cliente estiver pronto
  checkIfEventisEnabled('ready')
    .then(_ => {
      client.on('ready', () => {
        // Evitar disparar o evento múltiplas vezes
        if (readyFired) {
          if (verboseLogs) {
            console.log(`⏭️ Evento 'ready' duplicado ignorado para sessão ${sessionId}`)
          }
          return
        }
        readyFired = true
        
        console.log(`✅ Sessão ${sessionId} pronta e conectada!`)
        // Resetar contador de retries ao conectar com sucesso
        sessionRetryCount.set(sessionId, 0)
        sessionRestartLock.delete(sessionId)
        triggerWebhook(sessionWebhook, sessionId, 'ready')
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
            console.log(`⏭️ Reinício da sessão ${sessionId} bloqueado (lock ativo ou LOGOUT detectado)`)
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
        
        console.log(`🔄 Reiniciando sessão ${sessionId}... (Motivo: ${reason}, Tentativa: ${currentRetries + 1}/${MAX_RETRY_ATTEMPTS})`)
        
        sessions.delete(sessionId)
        
        // Destruir cliente com tratamento de erros
        await safeEvaluate(async () => await client.destroy())
        
        sessionRetryCount.set(sessionId, currentRetries + 1)
        
        // Aguardar antes de reiniciar
        console.log(`⏳ Aguardando ${cooldownMs / 1000}s antes de reiniciar...`)
        setTimeout(() => {
          sessionRestartLock.delete(sessionId)
          setupSession(sessionId)
        }, cooldownMs)
      }
      
      client.pupPage.once('close', function () {
        // emitted when the page closes
        console.log(`❌ Página do navegador fechada para ${sessionId}. Restaurando...`)
        restartSession(sessionId, 'page_closed', RETRY_COOLDOWN_MS)
      })
      
      client.pupPage.once('error', function (error) {
        // emitted when the page crashes
        console.log(`❌ Erro na página do navegador para ${sessionId}:`, error.message)
        restartSession(sessionId, 'page_error', RETRY_COOLDOWN_MS)
      })
      
      // Adicionar handler para erros de protocolo
      client.pupBrowser.on('disconnected', () => {
        console.log(`❌ Navegador desconectado para ${sessionId}. Restaurando...`)
        // Apenas restaurar se não houver lock ativo
        if (!sessionRestartLock.get(sessionId)) {
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
          const chat = await message.getChat()
          chat.sendSeen()
        }
      })
    })

  checkIfEventisEnabled('message_ack')
    .then(_ => {
      client.on('message_ack', async (message, ack) => {
        triggerWebhook(sessionWebhook, sessionId, 'message_ack', { message, ack })
        if (setMessagesAsSeen) {
          const chat = await message.getChat()
          chat.sendSeen()
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
        
        triggerWebhook(sessionWebhook, sessionId, 'message_create', { message })
        if (setMessagesAsSeen) {
          const chat = await message.getChat()
          chat.sendSeen()
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
    client.pupPage.removeAllListeners('close')
    client.pupPage.removeAllListeners('error')
    try {
      const pages = await client.pupBrowser.pages()
      await Promise.all(pages.map((page) => page.close()))
      await Promise.race([
        client.pupBrowser.close(),
        new Promise(resolve => setTimeout(resolve, 5000))
      ])
    } catch (e) {
      const childProcess = client.pupBrowser.process()
      if (childProcess) {
        childProcess.kill(9)
      }
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
    client.pupPage.removeAllListeners('close')
    client.pupPage.removeAllListeners('error')
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
    while (client.pupBrowser.isConnected() && (maxDelay < 10)) {
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
  setupSession,
  restoreSessions,
  validateSession,
  deleteSession,
  reloadSession,
  flushSessions
}
