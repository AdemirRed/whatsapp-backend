const { Client, LocalAuth } = require('whatsapp-web.js')
const fs = require('fs')
const path = require('path')
const sessions = new Map()
const hibernatedSessions = new Map() // Para armazenar sessões hibernadas
const { baseWebhookURL, sessionFolderPath, maxAttachmentSize, setMessagesAsSeen, webVersion, webVersionCacheType, recoverSessions } = require('./config')
const { triggerWebhook, waitForNestedObject, checkIfEventisEnabled } = require('./utils')

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
    while (true) {
      try {
        if (client.pupPage.isClosed()) {
          return { success: false, state: null, message: 'browser tab closed' }
        }
        await client.pupPage.evaluate('1'); break
      } catch (error) {
        // Ignore error and wait for a bit before trying again
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const state = await client.getState()
    returnData.state = state
    if (state !== 'CONNECTED') {
      returnData.message = 'session_not_connected'
      return returnData
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
      for (const file of files) {
        // Use regular expression to extract the string from the folder name
        const match = file.match(/^session-(.+)$/)
        if (match) {
          const sessionId = match[1]
          console.log('existing session detected', sessionId)
          setupSession(sessionId)
        }
      }
    })
  } catch (error) {
    console.log(error)
    console.error('Failed to restore sessions:', error)
  }
}

// Setup Session
const setupSession = (sessionId) => {
  try {
    if (sessions.has(sessionId)) {
      return { success: false, message: `Session already exists for: ${sessionId}`, client: sessions.get(sessionId) }
    }

    // Disable the delete folder from the logout function (will be handled separately)
    const localAuth = new LocalAuth({ clientId: sessionId, dataPath: sessionFolderPath })
    delete localAuth.logout
    localAuth.logout = () => { }

    const clientOptions = {
      puppeteer: {
        executablePath: process.env.CHROME_BIN || null,
        // headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      authStrategy: localAuth
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

    client.initialize().catch(err => console.log('Initialize error:', err.message))

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
  // helper to emit webhook only when session is not hibernated
  const emit = (eventName, payload) => {
    try {
      if (client.hibernated) return
      triggerWebhook(sessionWebhook, sessionId, eventName, payload)
    } catch (e) {
      console.log('emit error', e.message)
    }
  }

  if (recoverSessions) {
    waitForNestedObject(client, 'pupPage').then(() => {
      const restartSession = async (sessionId) => {
        sessions.delete(sessionId)
        await client.destroy().catch(e => {})
        setupSession(sessionId)
      }
      client.pupPage.once('close', function () {
        // emitted when the page closes
        console.log(`Browser page closed for ${sessionId}. Restoring`)
        restartSession(sessionId)
      })
      client.pupPage.once('error', function () {
        // emitted when the page crashes
        console.log(`Error occurred on browser page for ${sessionId}. Restoring`)
        restartSession(sessionId)
      })
    }).catch(e => {})
  }

  checkIfEventisEnabled('auth_failure')
    .then(_ => {
      client.on('auth_failure', (msg) => {
        emit('status', { msg })
      })
    })

  checkIfEventisEnabled('authenticated')
    .then(_ => {
      client.on('authenticated', () => {
        emit('authenticated')
      })
    })

  checkIfEventisEnabled('call')
    .then(_ => {
      client.on('call', async (call) => {
        emit('call', { call })
      })
    })

  checkIfEventisEnabled('change_state')
    .then(_ => {
      client.on('change_state', state => {
        emit('change_state', { state })
      })
    })

  checkIfEventisEnabled('disconnected')
    .then(_ => {
      client.on('disconnected', (reason) => {
        emit('disconnected', { reason })
      })
    })

  checkIfEventisEnabled('group_join')
    .then(_ => {
      client.on('group_join', (notification) => {
        emit('group_join', { notification })
      })
    })

  checkIfEventisEnabled('group_leave')
    .then(_ => {
      client.on('group_leave', (notification) => {
        emit('group_leave', { notification })
      })
    })

  checkIfEventisEnabled('group_update')
    .then(_ => {
      client.on('group_update', (notification) => {
        emit('group_update', { notification })
      })
    })

  checkIfEventisEnabled('loading_screen')
    .then(_ => {
      client.on('loading_screen', (percent, message) => {
        emit('loading_screen', { percent, message })
      })
    })

  checkIfEventisEnabled('media_uploaded')
    .then(_ => {
      client.on('media_uploaded', (message) => {
        emit('media_uploaded', { message })
      })
    })

  checkIfEventisEnabled('message')
    .then(_ => {
      client.on('message', async (message) => {
        if (client.hibernated) return
        emit('message', { message })
        if (message.hasMedia && message._data?.size < maxAttachmentSize) {
          // custom service event
          checkIfEventisEnabled('media').then(_ => {
            message.downloadMedia().then(messageMedia => {
              emit('media', { messageMedia, message })
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
        if (client.hibernated) return
        emit('message_ack', { message, ack })
        if (setMessagesAsSeen) {
          const chat = await message.getChat()
          chat.sendSeen()
        }
      })
    })

  checkIfEventisEnabled('message_create')
    .then(_ => {
      client.on('message_create', async (message) => {
        if (client.hibernated) return
        emit('message_create', { message })
        if (setMessagesAsSeen) {
          const chat = await message.getChat()
          chat.sendSeen()
        }
      })
    })

  checkIfEventisEnabled('message_reaction')
    .then(_ => {
      client.on('message_reaction', (reaction) => {
        emit('message_reaction', { reaction })
      })
    })

  checkIfEventisEnabled('vote_update')
    .then(_ => {
      client.on('vote_update', (vote) => {
        emit('vote_update', { vote })
      })
    })

  checkIfEventisEnabled('message_revoke_everyone')
    .then(_ => {
      client.on('message_revoke_everyone', async (after, before) => {
        emit('message_revoke_everyone', { after, before })
      })
    })

  client.on('qr', (qr) => {
    // inject qr code into session
    client.qr = qr
    checkIfEventisEnabled('qr')
      .then(_ => {
        emit('qr', { qr })
      })
  })

  checkIfEventisEnabled('ready')
    .then(_ => {
      client.on('ready', () => {
        emit('ready')
      })
    })

  checkIfEventisEnabled('contact_changed')
    .then(_ => {
      client.on('contact_changed', async (message, oldId, newId, isContact) => {
        emit('contact_changed', { message, oldId, newId, isContact })
      })
    })
}
 

// Function to check if folder is writeable
const deleteSessionFolder = async (sessionId) => {
  try {
    const targetDirPath = `${sessionFolderPath}/session-${sessionId}/`
    const resolvedTargetDirPath = await fs.promises.realpath(targetDirPath)
    const resolvedSessionPath = await fs.promises.realpath(sessionFolderPath)
    // Check if the target directory path is a subdirectory of the sessions folder path
    if (!resolvedTargetDirPath.startsWith(resolvedSessionPath)) {
      throw new Error('Invalid path')
    }
    await fs.promises.rm(targetDirPath, { recursive: true, force: true })
  } catch (error) {
    console.log('Folder deletion error', error)
    throw error
  }
}

// Function to delete client session
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

    // Wait for client.pupBrowser to be disconnected before deleting the folder
    while (client.pupBrowser.isConnected()) {
      await new Promise(resolve => setTimeout(resolve, 100))
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
      if (match && match[1]) {
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

// Função para hibernar uma sessão (pausar sem desconectar)
const hibernateSession = async (sessionId) => {
  try {
    if (!sessions.has(sessionId)) {
      throw new Error('Session not found')
    }

    const client = sessions.get(sessionId)
    const validation = await validateSession(sessionId)
    
    if (!validation.success) {
      throw new Error('Session not connected')
    }

    // Salvar informações da sessão antes de hibernar
    const sessionInfo = {
      sessionId,
      timestamp: new Date().toISOString(),
      state: validation.state,
      puppeteerPage: client.pupPage ? true : false
    }

    // Obter informações do usuário se conectado
    try {
      const userInfo = await client.info
      if (userInfo && userInfo.wid) {
        sessionInfo.phoneNumber = userInfo.wid._serialized
        sessionInfo.pushName = userInfo.pushname
        
        // Tentar obter foto de perfil
        try {
          const profilePic = await client.getProfilePicUrl(userInfo.wid._serialized)
          sessionInfo.profilePicUrl = profilePic
        } catch (picError) {
          console.log(`Could not get profile pic for ${sessionId}:`, picError.message)
          sessionInfo.profilePicUrl = null
        }
      }
    } catch (infoError) {
      console.log(`Could not get session info for ${sessionId}:`, infoError.message)
      sessionInfo.phoneNumber = null
      sessionInfo.profilePicUrl = null
      sessionInfo.pushName = null
    }

    // Remover listeners para evitar atividade desnecessária
    if (client.pupPage) {
      client.pupPage.removeAllListeners('close')
      client.pupPage.removeAllListeners('error')
    }

    // Pausar o navegador (não fechar, apenas minimizar atividade)
    if (client.pupBrowser && client.pupPage) {
      // Navegar para uma página em branco para reduzir uso de recursos
      await client.pupPage.goto('about:blank')
    }

    // Mover sessão para hibernação
    hibernatedSessions.set(sessionId, {
      client,
      sessionInfo,
      hibernatedAt: Date.now()
    })

    // Remover da lista ativa (mas não destruir)
    sessions.delete(sessionId)

    console.log(`Session ${sessionId} hibernated successfully`)
    return { success: true, message: 'Session hibernated successfully' }
  } catch (error) {
    console.log('hibernateSession ERROR', error)
    throw error
  }
}

// Função para reativar uma sessão hibernada
const reactivateSession = async (sessionId) => {
  try {
    if (!hibernatedSessions.has(sessionId)) {
      throw new Error('Hibernated session not found')
    }

    const hibernatedData = hibernatedSessions.get(sessionId)
    const client = hibernatedData.client

    // Verificar se o cliente ainda está válido
    if (client.pupBrowser && !client.pupBrowser.isConnected()) {
      // Se o navegador foi desconectado, precisamos recriar a sessão
      hibernatedSessions.delete(sessionId)
      return setupSession(sessionId)
    }

    // Navegar de volta para o WhatsApp Web
    if (client.pupPage) {
      await client.pupPage.goto('https://web.whatsapp.com')
      
      // Re-adicionar os listeners
      if (recoverSessions) {
        const restartSession = async (sessionId) => {
          sessions.delete(sessionId)
          hibernatedSessions.delete(sessionId)
          await client.destroy().catch(e => {})
          setupSession(sessionId)
        }
        
        client.pupPage.once('close', function () {
          console.log(`Browser page closed for ${sessionId}. Restoring`)
          restartSession(sessionId)
        })
        
        client.pupPage.once('error', function () {
          console.log(`Error occurred on browser page for ${sessionId}. Restoring`)
          restartSession(sessionId)
        })
      }
    }

    // Mover de volta para sessões ativas
    sessions.set(sessionId, client)
    hibernatedSessions.delete(sessionId)

    console.log(`Session ${sessionId} reactivated successfully`)
    return { success: true, message: 'Session reactivated successfully' }
  } catch (error) {
    console.log('reactivateSession ERROR', error)
    throw error
  }
}

// Função para hibernar todas as sessões ativas
const hibernateAllSessions = async () => {
  try {
    const results = []
    const activeSessionIds = Array.from(sessions.keys())
    
    for (const sessionId of activeSessionIds) {
      try {
        const result = await hibernateSession(sessionId)
        results.push({ sessionId, ...result })
      } catch (error) {
        results.push({ sessionId, success: false, message: error.message })
      }
    }
    
    return { success: true, results, hibernatedCount: results.filter(r => r.success).length }
  } catch (error) {
    console.log('hibernateAllSessions ERROR', error)
    throw error
  }
}

// Função para reativar todas as sessões hibernadas
const reactivateAllSessions = async () => {
  try {
    const results = []
    const hibernatedSessionIds = Array.from(hibernatedSessions.keys())
    
    for (const sessionId of hibernatedSessionIds) {
      try {
        const result = await reactivateSession(sessionId)
        results.push({ sessionId, ...result })
      } catch (error) {
        results.push({ sessionId, success: false, message: error.message })
      }
    }
    
    return { success: true, results, reactivatedCount: results.filter(r => r.success).length }
  } catch (error) {
    console.log('reactivateAllSessions ERROR', error)
    throw error
  }
}

// Função para listar sessões hibernadas
const listHibernatedSessions = () => {
  const hibernatedList = []
  
  hibernatedSessions.forEach((data, sessionId) => {
    hibernatedList.push({
      sessionId,
      hibernatedAt: new Date(data.hibernatedAt).toISOString(),
      sessionInfo: data.sessionInfo
    })
  })
  
  return hibernatedList
}

// Função para obter status completo (ativas + hibernadas)
const getCompleteSessionStatus = async () => {
  try {
    const activeSessions = []
    const hibernatedList = listHibernatedSessions()
    
    // Processar sessões ativas
    for (const [sessionId, client] of sessions.entries()) {
      try {
        const validation = await validateSession(sessionId)
        let phoneNumber = null
        let profilePicUrl = null
        let pushName = null
        
        // Obter informações do usuário se conectado
        if (validation.success) {
          try {
            const sessionInfo = await client.info
            if (sessionInfo && sessionInfo.wid) {
              phoneNumber = sessionInfo.wid._serialized
              pushName = sessionInfo.pushname
              
              // Tentar obter foto de perfil
              try {
                const profilePic = await client.getProfilePicUrl(phoneNumber)
                profilePicUrl = profilePic
              } catch (picError) {
                console.log(`Could not get profile pic for ${sessionId}:`, picError.message)
              }
            }
          } catch (infoError) {
            console.log(`Could not get session info for ${sessionId}:`, infoError.message)
          }
        }
        
        activeSessions.push({
          sessionId,
          status: validation.success ? validation.state : 'DISCONNECTED',
          message: validation.message,
          type: 'active',
          phoneNumber,
          profilePicUrl,
          pushName
        })
      } catch (error) {
        activeSessions.push({
          sessionId,
          status: 'ERROR',
          message: error.message,
          type: 'active',
          phoneNumber: null,
          profilePicUrl: null,
          pushName: null
        })
      }
    }
    
    // Processar sessões hibernadas
    const hibernatedSessions = hibernatedList.map(session => ({
      sessionId: session.sessionId,
      status: 'HIBERNATED',
      message: `Hibernated since ${session.hibernatedAt}`,
      type: 'hibernated',
      hibernatedAt: session.hibernatedAt,
      phoneNumber: session.sessionInfo?.phoneNumber || null,
      profilePicUrl: session.sessionInfo?.profilePicUrl || null,
      pushName: session.sessionInfo?.pushName || null
    }))
    
    return {
      success: true,
      sessions: [...activeSessions, ...hibernatedSessions],
      summary: {
        active: activeSessions.length,
        hibernated: hibernatedSessions.length,
        total: activeSessions.length + hibernatedSessions.length
      }
    }
  } catch (error) {
    console.log('getCompleteSessionStatus ERROR', error)
    throw error
  }
}

module.exports = {
  sessions,
  hibernatedSessions,
  setupSession,
  restoreSessions,
  validateSession,
  deleteSession,
  flushSessions,
  hibernateSession,
  reactivateSession,
  hibernateAllSessions,
  reactivateAllSessions,
  listHibernatedSessions,
  getCompleteSessionStatus
}
