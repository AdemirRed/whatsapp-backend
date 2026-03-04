const { getEventDiagnostics, sessions, pollingIntervals, startMessagePolling, stopMessagePolling, isPollingActive } = require('../sessions')
const { sendErrorResponse } = require('../utils')

/**
 * Retorna diagnóstico detalhado de eventos para uma sessão
 * 
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to diagnose.
 * @returns {Promise<void>}
 */
const getSessionDiagnostics = async (req, res) => {
  // #swagger.summary = 'Get session event diagnostics'
  // #swagger.description = 'Returns detailed event diagnostics for a session including event counters, recent events, and polling status.'
  try {
    const sessionId = req.params.sessionId
    
    // Verificar se sessão existe
    if (!sessions.has(sessionId)) {
      /* #swagger.responses[404] = {
        description: "Session not found.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 404, 'session_not_found')
      return
    }
    
    const client = sessions.get(sessionId)
    const diagnostics = getEventDiagnostics(sessionId)
    
    // Obter informações adicionais do cliente
    let clientInfo = {
      connected: false,
      pupPageExists: false,
      storeExists: false
    }
    
    try {
      const state = await client.getState()
      clientInfo.connected = state === 'CONNECTED'
      clientInfo.state = state
      clientInfo.pupPageExists = !!client.pupPage
      
      // Verificar se a store interna existe
      if (client.pupPage) {
        try {
          const hasStore = await client.pupPage.evaluate(() => {
            return typeof window.Store !== 'undefined' && 
                   typeof window.Store.Msg !== 'undefined'
          })
          clientInfo.storeExists = hasStore
        } catch (e) {
          clientInfo.storeError = e.message
        }
      }
    } catch (error) {
      clientInfo.error = error.message
    }
    
    /* #swagger.responses[200] = {
      description: "Session diagnostics data.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              sessionId: { type: "string", example: "session-ademir" },
              diagnostics: {
                type: "object",
                properties: {
                  counters: {
                    type: "object",
                    properties: {
                      message: { type: "number", example: 42 },
                      message_create: { type: "number", example: 38 },
                      qr: { type: "number", example: 1 },
                      ready: { type: "number", example: 1 },
                      lastMessageTimestamp: { type: "string", example: "2026-01-29T10:30:00Z" }
                    }
                  },
                  recentEvents: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        event: { type: "string", example: "message" },
                        timestamp: { type: "string", example: "2026-01-29T10:30:00Z" },
                        from: { type: "string", example: "555197756708@c.us" }
                      }
                    }
                  },
                  pollingActive: { type: "boolean", example: false }
                }
              },
              clientInfo: {
                type: "object",
                properties: {
                  connected: { type: "boolean", example: true },
                  state: { type: "string", example: "CONNECTED" },
                  pupPageExists: { type: "boolean", example: true },
                  storeExists: { type: "boolean", example: true }
                }
              }
            }
          }
        }
      }
    }
    */
    res.json({
      success: true,
      sessionId,
      diagnostics,
      clientInfo,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.log('getSessionDiagnostics ERROR', error)
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
 * Testa manualmente se o cliente consegue receber mensagens
 * 
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to test.
 * @returns {Promise<void>}
 */
const testMessageRetrieval = async (req, res) => {
  // #swagger.summary = 'Test message retrieval'
  // #swagger.description = 'Manually tests if the client can retrieve messages from WhatsApp by fetching recent chats and their messages.'
  try {
    const sessionId = req.params.sessionId
    
    if (!sessions.has(sessionId)) {
      sendErrorResponse(res, 404, 'session_not_found')
      return
    }
    
    const client = sessions.get(sessionId)
    
    try {
      const state = await client.getState()
      if (state !== 'CONNECTED') {
        /* #swagger.responses[422] = {
          description: "Session not connected.",
          content: {
            "application/json": {
              schema: { "$ref": "#/definitions/ErrorResponse" }
            }
          }
        }
        */
        sendErrorResponse(res, 422, `session_not_connected: ${state}`)
        return
      }
      
      // Buscar últimos 5 chats
      const chats = await client.getChats()
      const recentChats = chats.slice(0, 5)
      
      const testResults = []
      for (const chat of recentChats) {
        try {
          // Buscar últimas 5 mensagens de cada chat
          const messages = await chat.fetchMessages({ limit: 5 })
          testResults.push({
            chatId: chat.id._serialized,
            chatName: chat.name,
            messageCount: messages.length,
            lastMessage: messages.length > 0 ? {
              from: messages[0].from,
              timestamp: messages[0].timestamp,
              body: messages[0].body ? messages[0].body.substring(0, 50) : '[mídia]',
              hasMedia: messages[0].hasMedia
            } : null
          })
        } catch (error) {
          testResults.push({
            chatId: chat.id._serialized,
            chatName: chat.name,
            error: error.message
          })
        }
      }
      
      /* #swagger.responses[200] = {
        description: "Message retrieval test results.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                sessionId: { type: "string", example: "session-ademir" },
                state: { type: "string", example: "CONNECTED" },
                totalChats: { type: "number", example: 50 },
                testedChats: { type: "number", example: 5 },
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      chatId: { type: "string", example: "555197756708@c.us" },
                      chatName: { type: "string", example: "Exemplo" },
                      messageCount: { type: "number", example: 5 },
                      lastMessage: {
                        type: "object",
                        properties: {
                          from: { type: "string", example: "555197756708@c.us" },
                          timestamp: { type: "number", example: 1738147200 },
                          body: { type: "string", example: "Olá, tudo bem?" },
                          hasMedia: { type: "boolean", example: false }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      */
      res.json({
        success: true,
        sessionId,
        state,
        totalChats: chats.length,
        testedChats: recentChats.length,
        results: testResults,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      sendErrorResponse(res, 500, error.message)
    }
  } catch (error) {
    console.log('testMessageRetrieval ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Health check completo do sistema
 * 
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 */
const healthCheck = async (req, res) => {
  // #swagger.summary = 'System health check'
  // #swagger.description = 'Returns overall system health including all sessions status and event diagnostics.'
  try {
    const sessionsStatus = []
    
    for (const [sessionId, client] of sessions) {
      try {
        const state = await client.getState()
        const diagnostics = getEventDiagnostics(sessionId)
        
        sessionsStatus.push({
          sessionId,
          state,
          connected: state === 'CONNECTED',
          eventCounters: diagnostics.counters,
          pollingActive: diagnostics.pollingActive
        })
      } catch (error) {
        sessionsStatus.push({
          sessionId,
          error: error.message,
          connected: false
        })
      }
    }
    
    /* #swagger.responses[200] = {
      description: "System health status.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              totalSessions: { type: "number", example: 2 },
              connectedSessions: { type: "number", example: 1 },
              sessions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sessionId: { type: "string", example: "session-ademir" },
                    state: { type: "string", example: "CONNECTED" },
                    connected: { type: "boolean", example: true },
                    eventCounters: {
                      type: "object",
                      properties: {
                        message: { type: "number", example: 42 },
                        message_create: { type: "number", example: 38 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    */
    res.json({
      success: true,
      totalSessions: sessions.size,
      connectedSessions: sessionsStatus.filter(s => s.connected).length,
      sessions: sessionsStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.log('healthCheck ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Ativa o polling de mensagens para uma sessão
 * 
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {number} req.body.intervalSeconds - Polling interval in seconds (default: 5).
 * @returns {Promise<void>}
 */
const startPolling = async (req, res) => {
  // #swagger.summary = 'Start message polling'
  // #swagger.description = 'Activates polling-based message detection as a fallback when native events are not working.'
  /* #swagger.requestBody = {
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            intervalSeconds: {
              type: "number",
              example: 5,
              description: "Polling interval in seconds (default: 5)"
            }
          }
        }
      }
    }
  }
  */
  try {
    const sessionId = req.params.sessionId
    const intervalSeconds = req.body?.intervalSeconds || 5
    
    if (!sessions.has(sessionId)) {
      sendErrorResponse(res, 404, 'session_not_found')
      return
    }
    
    if (isPollingActive(sessionId)) {
      /* #swagger.responses[422] = {
        description: "Polling already active.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 422, 'polling_already_active')
      return
    }
    
    const client = sessions.get(sessionId)
    const baseWebhookURL = process.env.BASE_WEBHOOK_URL
    
    await startMessagePolling(sessionId, client, baseWebhookURL, intervalSeconds)
    
    /* #swagger.responses[200] = {
      description: "Polling started successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Polling iniciado com sucesso" },
              sessionId: { type: "string", example: "session-ademir" },
              intervalSeconds: { type: "number", example: 5 }
            }
          }
        }
      }
    }
    */
    res.json({
      success: true,
      message: 'Polling iniciado com sucesso',
      sessionId,
      intervalSeconds
    })
  } catch (error) {
    console.log('startPolling ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Desativa o polling de mensagens para uma sessão
 * 
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID.
 * @returns {Promise<void>}
 */
const stopPolling = async (req, res) => {
  // #swagger.summary = 'Stop message polling'
  // #swagger.description = 'Deactivates polling-based message detection for a session.'
  try {
    const sessionId = req.params.sessionId
    
    if (!sessions.has(sessionId)) {
      sendErrorResponse(res, 404, 'session_not_found')
      return
    }
    
    const stopped = stopMessagePolling(sessionId)
    
    if (!stopped) {
      sendErrorResponse(res, 422, 'polling_not_active')
      return
    }
    
    /* #swagger.responses[200] = {
      description: "Polling stopped successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Polling parado com sucesso" },
              sessionId: { type: "string", example: "session-ademir" }
            }
          }
        }
      }
    }
    */
    res.json({
      success: true,
      message: 'Polling parado com sucesso',
      sessionId
    })
  } catch (error) {
    console.log('stopPolling ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  getSessionDiagnostics,
  testMessageRetrieval,
  healthCheck,
  startPolling,
  stopPolling
}
