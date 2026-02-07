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
      const extractPairingCodeFromText = (text) => {
        if (!text) return null
        const match = text.match(/\b[A-Z0-9]{4}[- ]?[A-Z0-9]{4}\b/)
        return match ? match[0] : null
      }

      // Fallback: tenta gerar o código exatamente como o usuário faz no site (clicando e lendo da tela).
      // Isso ajuda quando as APIs internas do whatsapp-web.js/WAWeb mudam.
      const tryRequestPairingCodeViaUi = async () => {
        // Ir para o fluxo "Conectar com número de telefone" / "Link with phone number"
        await session.pupPage.evaluate(() => {
          const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"]'))
          const el = candidates.find(e => {
            const text = (e.innerText || '').trim()
            return /conectar\s+com\s+n[uú]mero\s+de\s+telefone/i.test(text) ||
              /link\s+with\s+phone\s+number/i.test(text) ||
              /use\s+phone\s+number/i.test(text)
          })
          if (el) el.click()
        }).catch(() => {})

        await new Promise(resolve => setTimeout(resolve, 1200))

        // Preencher número (melhor esforço). Para BR (55...), separa DDI e número se houver 2 campos.
        await session.pupPage.evaluate((rawPhone) => {
          const digits = String(rawPhone || '').replace(/\D/g, '')

          const setValue = (el, value) => {
            if (!el) return
            el.focus()
            el.value = value
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
          }

          const inputs = Array.from(document.querySelectorAll('input'))
          const numericInputs = inputs.filter(i => {
            const type = (i.getAttribute('type') || '').toLowerCase()
            const inputMode = (i.getAttribute('inputmode') || '').toLowerCase()
            return type === 'tel' || inputMode === 'numeric' || inputMode === 'tel'
          })

          if (numericInputs.length >= 2) {
            // Heurística para Brasil
            if (digits.startsWith('55') && digits.length > 11) {
              setValue(numericInputs[0], '55')
              setValue(numericInputs[1], digits.slice(2))
            } else {
              setValue(numericInputs[1], digits)
            }
            return
          }

          if (numericInputs.length === 1) {
            setValue(numericInputs[0], digits)
          }
        }, phoneNumber).catch(() => {})

        await new Promise(resolve => setTimeout(resolve, 400))

        // Avançar/continuar
        await session.pupPage.evaluate(() => {
          const candidates = Array.from(document.querySelectorAll('button, div[role="button"], a'))
          const el = candidates.find(e => {
            const text = (e.innerText || '').trim()
            return /avan[cç]ar/i.test(text) || /continuar/i.test(text) || /pr[oó]ximo/i.test(text) || /next/i.test(text) || /continue/i.test(text)
          })
          if (el) el.click()
        }).catch(() => {})

        // Esperar o código aparecer na tela
        const codeFromWait = await session.pupPage.waitForFunction(() => {
          const text = (document.body && document.body.innerText) ? document.body.innerText : ''
          const match = text.match(/\b[A-Z0-9]{4}[- ]?[A-Z0-9]{4}\b/)
          return match ? match[0] : false
        }, { timeout: 30000 }).then(h => h.jsonValue()).catch(() => null)

        const codeFromText = extractPairingCodeFromText(typeof codeFromWait === 'string' ? codeFromWait : '')
        if (codeFromText) {
          return codeFromText
        }

        // Fallback extra: varrer o texto inteiro
        const pageText = await session.pupPage.evaluate(() => (document.body && document.body.innerText) ? document.body.innerText : '').catch(() => '')
        return extractPairingCodeFromText(pageText)
      }

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

      // Algumas versões mostram primeiro a tela de "Baixar WhatsApp".
      // Tentamos clicar automaticamente em "Usar WhatsApp Web" para avançar.
      try {
        const clicked = await session.pupPage.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('a,button'))
          const el = elements.find(e => {
            const text = (e.innerText || '').trim()
            return /usar\s+whatsapp\s+web/i.test(text) || /use\s+whatsapp\s+web/i.test(text)
          })
          if (el) {
            el.click()
            return true
          }
          return false
        }).catch(() => false)

        if (clicked) {
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      } catch (e) {
        // Ignorar e seguir
      }

      // Aguardar o WhatsApp Web inicializar scripts necessários para pairing.
      // Isso reduz erros intermitentes como: window.onCodeReceivedEvent is not a function
      try {
        await session.pupPage.waitForFunction(() => {
          return (
            typeof window.onCodeReceivedEvent === 'function' ||
            (window.AuthStore && window.AuthStore.PairingCodeLinkUtils)
          )
        }, { timeout: 15000 })
      } catch (e) {
        // Não bloquear: seguimos com as tentativas e retornamos erro amigável se não suportar
      }

      // Tentar diferentes métodos de pairing code
      let pairingCode
      let method = 'unknown'
      
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

            // Fallback via UI (mesmo fluxo do site)
            const uiCode = await tryRequestPairingCodeViaUi().catch(e => {
              console.log('UI pairing fallback failed:', e.message)
              return null
            })

            if (uiCode) {
              res.json({
                success: true,
                pairingCode: uiCode.replace(/[^A-Z0-9]/g, ''),
                pairingCodeFormatted: uiCode,
                phoneNumber,
                method: 'ui',
                message: 'Pairing code gerado via UI do WhatsApp Web. Digite este código no celular em até 60 segundos.',
                instructions: 'Abra o WhatsApp no celular > Aparelhos conectados > Conectar um aparelho > Digitar código'
              })
              return
            }

            // Se todos falharam, fornecer instruções claras
            sendErrorResponse(res, 400,
              `Pairing code is not supported in current session state. This usually means:\n` +
              `1. Session is already connected (use terminate first)\n` +
              `2. WhatsApp Web version doesn't support pairing code\n` +
              `3. Account type doesn't support multi-device\n\n` +
              `Please try:\n` +
              `- Use QR code authentication instead\n` +
              `- Terminate session and restart for fresh authentication\n\n` +
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
          hasOnCodeReceivedEvent: typeof window.onCodeReceivedEvent === 'function',
          pairingUtils: !!(window.AuthStore && window.AuthStore.PairingCodeLinkUtils),
          pairingUtilsHasRequestPairingCode: !!(window.AuthStore && window.AuthStore.PairingCodeLinkUtils && typeof window.AuthStore.PairingCodeLinkUtils.requestPairingCode === 'function'),
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
      (diagnosis.webState?.hasQrCanvas || diagnosis.webState?.hasQrTestId) &&
      (diagnosis.webState?.hasOnCodeReceivedEvent || diagnosis.webState?.pairingUtilsHasRequestPairingCode || diagnosis.webState?.waWebPairingApi)

    diagnosis.recommendations = []
    
    if (diagnosis.sessionState.success) {
      diagnosis.recommendations.push('Session is already connected. Terminate session first for pairing code.')
    } else if (!diagnosis.hasPupPage) {
      diagnosis.recommendations.push('Browser page not available. Start session first.')
    } else if (!diagnosis.webState?.hasQrCanvas && !diagnosis.webState?.hasQrTestId) {
      diagnosis.recommendations.push('WhatsApp Web not on authentication screen. Session may need restart.')
    } else if (!diagnosis.webState?.hasOnCodeReceivedEvent && !diagnosis.webState?.pairingUtilsHasRequestPairingCode && !diagnosis.webState?.waWebPairingApi) {
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
