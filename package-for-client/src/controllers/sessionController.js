const qr = require('qr-image')
const { setupSession, deleteSession, reloadSession, validateSession, flushSessions, sessions } = require('../sessions')
const { sendErrorResponse, waitForNestedObject } = require('../utils')

/**
 * Starts a session for the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error starting the session.
 */
const startSession = async (req, res) => {
  // #swagger.summary = 'Start new session'
  // #swagger.description = 'Starts a session for the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const setupSessionReturn = setupSession(sessionId)
    if (!setupSessionReturn.success) {
      /* #swagger.responses[422] = {
        description: "Unprocessable Entity.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 422, setupSessionReturn.message)
      return
    }
    /* #swagger.responses[200] = {
      description: "Status of the initiated session.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/StartSessionResponse" }
        }
      }
    }
    */
    // wait until the client is created
    waitForNestedObject(setupSessionReturn.client, 'pupPage')
      .then(res.json({ success: true, message: setupSessionReturn.message }))
      .catch((err) => { sendErrorResponse(res, 500, err.message) })
  } catch (error) {
  /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('startSession ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Status of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
const statusSession = async (req, res) => {
  // #swagger.summary = 'Get session status'
  // #swagger.description = 'Status of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const sessionData = await validateSession(sessionId)
    /* #swagger.responses[200] = {
      description: "Status of the session.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/StatusSessionResponse" }
        }
      }
    }
    */
    res.json(sessionData)
  } catch (error) {
    console.log('statusSession ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * QR code of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
const sessionQrCode = async (req, res) => {
  // #swagger.summary = 'Get session QR code'
  // #swagger.description = 'QR code of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const session = sessions.get(sessionId)
    if (!session) {
      return res.json({ success: false, message: 'session_not_found' })
    }
    if (session.qr) {
      return res.json({ success: true, qr: session.qr })
    }
    return res.json({ success: false, message: 'qr code not ready or already scanned' })
  } catch (error) {
    console.log('sessionQrCode ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * QR code as image of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
const sessionQrCodeImage = async (req, res) => {
  // #swagger.summary = 'Get session QR code as image'
  // #swagger.description = 'QR code as image of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const session = sessions.get(sessionId)
    if (!session) {
      return res.json({ success: false, message: 'session_not_found' })
    }
    if (session.qr) {
      const qrImage = qr.image(session.qr)
      /* #swagger.responses[200] = {
          description: "QR image.",
          content: {
            "image/png": {}
          }
        }
      */
      res.writeHead(200, {
        'Content-Type': 'image/png'
      })
      return qrImage.pipe(res)
    }
    return res.json({ success: false, message: 'qr code not ready or already scanned' })
  } catch (error) {
    console.log('sessionQrCodeImage ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Restarts the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to terminate.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the session.
 */
const restartSession = async (req, res) => {
  // #swagger.summary = 'Restart session'
  // #swagger.description = 'Restarts the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const validation = await validateSession(sessionId)
    if (validation.message === 'session_not_found') {
      return res.json(validation)
    }
    await reloadSession(sessionId)
    /* #swagger.responses[200] = {
      description: "Sessions restarted.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/RestartSessionResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Restarted successfully' })
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('restartSession ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Terminates the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to terminate.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the session.
 */
const terminateSession = async (req, res) => {
  // #swagger.summary = 'Terminate session'
  // #swagger.description = 'Terminates the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const validation = await validateSession(sessionId)
    if (validation.message === 'session_not_found') {
      return res.json(validation)
    }
    await deleteSession(sessionId, validation)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateSession ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Terminates all inactive sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the sessions.
 */
const terminateInactiveSessions = async (req, res) => {
  // #swagger.summary = 'Terminate inactive sessions'
  // #swagger.description = 'Terminates all inactive sessions.'
  try {
    await flushSessions(true)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionsResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Flush completed successfully' })
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateInactiveSessions ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Terminates all sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the sessions.
 */
const terminateAllSessions = async (req, res) => {
  // #swagger.summary = 'Terminate all sessions'
  // #swagger.description = 'Terminates all sessions.'
  try {
    await flushSessions(false)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionsResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Flush completed successfully' })
  } catch (error) {
  /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateAllSessions ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * List all sessions with their status.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error listing the sessions.
 */
const listSessions = async (req, res) => {
  // #swagger.summary = 'List all sessions'
  // #swagger.description = 'Lists all sessions with their current status.'
  try {
    const sessionList = []
    
    for (const [sessionId, client] of sessions.entries()) {
      try {
        const sessionData = await validateSession(sessionId)
        sessionList.push({
          sessionId,
          status: sessionData.state || 'DISCONNECTED',
          success: sessionData.success,
          message: sessionData.message
        })
      } catch (error) {
        sessionList.push({
          sessionId,
          status: 'ERROR',
          success: false,
          message: error.message
        })
      }
    }
    
    /* #swagger.responses[200] = {
      description: "List of all sessions.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              sessions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sessionId: { type: "string" },
                    status: { type: "string" },
                    success: { type: "boolean" },
                    message: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    }
    */
    res.json({ success: true, sessions: sessionList })
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('listSessions ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Request pairing code for phone number authentication.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.phoneNumber - Phone number in international format.
 * @param {boolean} req.body.showNotification - Show notification on phone.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error requesting pairing code.
 */
const requestPairingCode = async (req, res) => {
  // #swagger.summary = 'Request pairing code'
  // #swagger.description = 'Request authentication via pairing code instead of QR code for phone number authentication.'
  /* #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { 
            $ref: "#/definitions/RequestPairingCodeBody" 
          },
          examples: {
            brasil: {
              summary: "Example with Brazilian number",
              value: {
                phoneNumber: "555197756708",
                showNotification: true
              }
            },
            usa: {
              summary: "Example with US number",
              value: {
                phoneNumber: "12025550108",
                showNotification: true
              }
            }
          }
        }
      }
    }
  */
  try {
    const sessionId = req.params.sessionId
    const { phoneNumber, showNotification = true } = req.body

    if (!phoneNumber) {
      /* #swagger.responses[400] = {
        description: "Bad Request - Phone number is required.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 400, 'Phone number is required')
      return
    }

    // Check if session exists
    const session = sessions.get(sessionId)
    if (!session) {
      /* #swagger.responses[404] = {
        description: "Session not found.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 404, 'Session not found')
      return
    }

    // Request pairing code - só funciona durante o setup inicial da sessão
    try {
      // Verificar se a sessão está pronta para pairing code
      const sessionValidation = await validateSession(sessionId)
      
      // Se a sessão já está conectada, não é possível usar pairing code
      if (sessionValidation.success) {
        sendErrorResponse(res, 400, 'Session is already connected. Pairing code is only available during initial setup. Please terminate the session first if you want to re-authenticate.')
        return
      }

      // Se a sessão não está em estado de autenticação, ela precisa estar aguardando autenticação
      if (sessionValidation.message !== 'session_not_connected' && sessionValidation.message !== 'session_not_found') {
        sendErrorResponse(res, 400, `Session not ready for pairing code: ${sessionValidation.message}. Please ensure session is in authentication state.`)
        return
      }

      // Verificar se a sessão tem pupPage disponível
      if (!session.pupPage) {
        sendErrorResponse(res, 400, 'Session browser page not available. Please start the session first.')
        return
      }

      // Verificar se o WhatsApp Web está carregado e pronto para pairing
      const isReadyForPairing = await session.pupPage.evaluate(() => {
        // Verificar se estamos na tela de autenticação
        return document.querySelector('canvas') !== null || // QR code canvas
               document.querySelector('[data-testid="qr-canvas"]') !== null ||
               document.body.innerHTML.includes('phone-number') ||
               window.location.href.includes('web.whatsapp.com')
      }).catch(() => false)

      if (!isReadyForPairing) {
        sendErrorResponse(res, 400, 'WhatsApp Web is not ready for authentication. Please ensure the browser is on the login page.')
        return
      }

      // Tentar diferentes métodos de pairing code
      let pairingCode
      let method = 'unknown'

      // Garantir que onCodeReceivedEvent está registrado na página antes de chamar requestPairingCode
      // Isso resolve o erro "window.onCodeReceivedEvent is not a function" quando a sessão
      // não foi inicializada com a opção pairWithPhoneNumber
      try {
        await session.pupPage.exposeFunction('onCodeReceivedEvent', (code) => {
          return code
        })
      } catch (exposeErr) {
        // Ignorar: função já foi registrada anteriormente
      }
      
      try {
        // Método 1: Usar requestPairingCode nativo (mais confiável)
        pairingCode = await session.requestPairingCode(phoneNumber, showNotification)
        method = 'native'
      } catch (primaryError) {
        console.log('Native pairing method failed:', primaryError.message)
        
        try {
          // Método 2: Tentar via pupPage.evaluate com AuthStore
          pairingCode = await session.pupPage.evaluate(async (phone) => {
            if (window.AuthStore && window.AuthStore.PairingCodeLinkUtils && 
                typeof window.AuthStore.PairingCodeLinkUtils.requestPairingCode === 'function') {
              return await window.AuthStore.PairingCodeLinkUtils.requestPairingCode(phone)
            }
            throw new Error('AuthStore.PairingCodeLinkUtils not available')
          }, phoneNumber)
          method = 'authstore'
        } catch (secondaryError) {
          console.log('AuthStore pairing method failed:', secondaryError.message)
          
          try {
            // Método 3: Tentar com WAWebPairingCodeLinkingApi
            pairingCode = await session.pupPage.evaluate(async (phone) => {
              if (window.require && window.require('WAWebPairingCodeLinkingApi')) {
                const api = window.require('WAWebPairingCodeLinkingApi')
                if (typeof api.requestPairingCode === 'function') {
                  return await api.requestPairingCode(phone)
                }
              }
              throw new Error('WAWebPairingCodeLinkingApi not available')
            }, phoneNumber)
            method = 'linkingapi'
          } catch (tertiaryError) {
            console.log('LinkingApi pairing method failed:', tertiaryError.message)
            
            // Se todos os métodos falharam, fornecer instruções claras
            sendErrorResponse(res, 500, 
              `Pairing code is not supported in current session state. This usually means:\n` +
              `1. Session is already connected (use terminate first)\n` +
              `2. WhatsApp Web version doesn't support pairing code\n` +
              `3. Account type doesn't support multi-device\n\n` +
              `Please try:\n` +
              `- Use QR code authentication instead\n` +
              `- Terminate session and restart for fresh authentication\n` +
              `- Use WhatsApp Business account which has better multi-device support\n\n` +
              `Original error: ${primaryError.message}`
            )
            return
          }
        }
      }

      /* #swagger.responses[200] = {
        description: "Pairing code generated successfully.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/RequestPairingCodeResponse" }
          }
        }
      }
      */
      res.json({ 
        success: true, 
        pairingCode,
        phoneNumber,
        method,
        message: `Pairing code generated successfully using ${method} method. Enter this code on your phone within 60 seconds.`,
        instructions: 'Open WhatsApp on your phone > Settings > Linked Devices > Link a Device > Enter the code above'
      })
    } catch (pairingError) {
      throw pairingError
    }
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('requestPairingCode ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

// Função para diagnosticar o estado da sessão para pairing code
const diagnosePairingCode = async (req, res) => {
  /* #swagger.tags = ['Sessions']
    #swagger.summary = 'Diagnosticar estado da sessão para pairing code'
    #swagger.description = 'Verifica se a sessão está pronta para usar pairing code e fornece informações de debug'
  */

  try {
    const sessionId = req.params.sessionId

    // Check if session exists
    const session = sessions.get(sessionId)
    if (!session) {
      sendErrorResponse(res, 404, 'Session not found')
      return
    }

    const sessionValidation = await validateSession(sessionId)
    
    // Verificar estado detalhado da sessão
    const diagnosis = {
      sessionExists: !!session,
      sessionState: sessionValidation,
      hasPupPage: !!session.pupPage,
      timestamp: new Date().toISOString()
    }

    try {
      // Verificar estado do WhatsApp Web
      const webState = await session.pupPage.evaluate(() => {
        const result = {
          url: window.location.href,
          hasQrCanvas: !!document.querySelector('canvas'),
          hasQrTestId: !!document.querySelector('[data-testid="qr-canvas"]'),
          hasPhoneNumberInput: document.body.innerHTML.includes('phone-number'),
          windowStore: !!window.Store,
          windowAuthStore: !!window.AuthStore,
          pairingUtils: !!(window.AuthStore && window.AuthStore.PairingCodeLinkUtils),
          waWebPairingApi: !!(window.require && window.require('WAWebPairingCodeLinkingApi')),
          bodyText: document.body.innerText.substring(0, 200)
        }
        
        // Verificar métodos de pairing disponíveis
        if (window.AuthStore && window.AuthStore.PairingCodeLinkUtils) {
          result.pairingMethods = Object.getOwnPropertyNames(window.AuthStore.PairingCodeLinkUtils)
        }
        
        return result
      })
      
      diagnosis.webState = webState
    } catch (webStateError) {
      diagnosis.webStateError = webStateError.message
    }

    // Determinar se pairing code é possível
    diagnosis.pairingCodeSupported = 
      diagnosis.hasPupPage && 
      (diagnosis.sessionState.message === 'session_not_connected' || 
       diagnosis.sessionState.message === 'session_not_found') &&
      (diagnosis.webState?.hasQrCanvas || diagnosis.webState?.hasQrTestId)

    diagnosis.recommendations = []
    
    if (diagnosis.sessionState.success) {
      diagnosis.recommendations.push('Session is already connected. Terminate session first for pairing code.')
    } else if (!diagnosis.hasPupPage) {
      diagnosis.recommendations.push('Browser page not available. Start session first.')
    } else if (!diagnosis.webState?.hasQrCanvas && !diagnosis.webState?.hasQrTestId) {
      diagnosis.recommendations.push('WhatsApp Web not on authentication screen. Session may need restart.')
    } else if (!diagnosis.webState?.pairingUtils && !diagnosis.webState?.waWebPairingApi) {
      diagnosis.recommendations.push('Pairing code APIs not available. Try QR code authentication instead.')
    } else {
      diagnosis.recommendations.push('Session appears ready for pairing code attempt.')
    }

    res.json({
      success: true,
      diagnosis
    })
  } catch (error) {
    console.log('diagnosePairingCode ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  startSession,
  statusSession,
  sessionQrCode,
  sessionQrCodeImage,
  restartSession,
  terminateSession,
  terminateInactiveSessions,
  terminateAllSessions,
  listSessions,
  requestPairingCode,
  diagnosePairingCode
}
