const { sessions } = require('../sessions')
const { sendErrorResponse } = require('../utils')

/**
 * Controller para gerenciar mídia de visualização única (view once)
 * Permite detectar, baixar e gerenciar fotos/vídeos enviados como view once
 */

/**
 * Busca mensagens com mídia de visualização única em um chat
 * @async
 * @function getViewOnceMedia
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {string} req.params.sessionId - The session ID
 * @param {string} req.body.chatId - The chat ID to search
 * @param {number} req.body.limit - Maximum number of messages to fetch (default: 50)
 * @param {boolean} req.body.includeExpired - Include expired view once messages (default: false)
 * @returns {Promise<void>}
 */
const getViewOnceMedia = async (req, res) => {
  /*
    #swagger.summary = 'Get view once media from chat'
    #swagger.description = 'Retrieves all view once (disappearing) photos and videos from a specific chat. These are media files that are meant to be viewed only once before disappearing.'
    #swagger.tags = ['View Once']
    #swagger.parameters['sessionId'] = {
      in: 'path',
      description: 'Session ID',
      required: true,
      type: 'string',
      example: 'redblack'
    }
    #swagger.requestBody = {
      required: true,
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            required: ['chatId'],
            properties: {
              chatId: {
                type: 'string',
                description: 'The Chat ID to search for view once media',
                example: '555197756708@c.us'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of messages to fetch (default: 50)',
                example: 50
              },
              includeExpired: {
                type: 'boolean',
                description: 'Include expired view once messages (default: false)',
                example: false
              }
            }
          },
          examples: {
            default: {
              value: {
                chatId: '555197756708@c.us',
                limit: 50,
                includeExpired: false
              }
            },
            includeExpired: {
              value: {
                chatId: '555197756708@c.us',
                limit: 100,
                includeExpired: true
              }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'View once media retrieved successfully',
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  chatId: { type: 'string', example: '555197756708@c.us' },
                  totalFound: { type: 'number', example: 5 },
                  returned: { type: 'number', example: 5 },
                  includeExpired: { type: 'boolean', example: false },
                  messages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'true_555197756708@c.us_3EB0XXXXX' },
                        from: { type: 'string', example: '555197756708@c.us' },
                        timestamp: { type: 'number', example: 1698765432 },
                        type: { type: 'string', example: 'image' },
                        hasMedia: { type: 'boolean', example: true },
                        isViewOnce: { type: 'boolean', example: true },
                        viewed: { type: 'boolean', example: false },
                        canDownload: { type: 'boolean', example: true },
                        mimetype: { type: 'string', example: 'image/jpeg' },
                        caption: { type: 'string', example: 'Check this out!' }
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
    #swagger.responses[404] = { description: 'Session not found' }
    #swagger.responses[500] = { description: 'Internal server error' }
  */
  try {
    const { chatId, limit = 50, includeExpired = false } = req.body
    
    // Verificar se sessão existe
    if (!sessions.has(req.params.sessionId)) {
      return sendErrorResponse(res, 404, 'Session not found')
    }
    
    const client = sessions.get(req.params.sessionId)
    
    if (!client) {
      return sendErrorResponse(res, 404, 'Session not found')
    }

    // Buscar mensagens do chat
    const chat = await client.getChatById(chatId)
    const messages = await chat.fetchMessages({ limit: limit * 2 }) // Buscar mais para filtrar

    // Filtrar mensagens de view once
    const viewOnceMessages = messages.filter(message => {
      // Verificar se a mensagem tem propriedades de view once
      const hasViewOnce = message._data && (
        message._data.isViewOnce || 
        message._data.viewOnce || 
        (message._data.ephemeralOutOfSync !== undefined) ||
        (message.type === 'image' && message._data.ephemeral) ||
        (message.type === 'video' && message._data.ephemeral)
      )
      
      if (!hasViewOnce) return false
      
      // Se includeExpired for false, filtrar apenas não expiradas
      if (!includeExpired) {
        // Verificar se ainda não expirou (heurística baseada no timestamp)
        const now = Date.now()
        const messageTime = message.timestamp * 1000
        const timeDiff = now - messageTime
        
        // View once normalmente expira após ser visto ou após algum tempo
        // Consideramos "não expirado" se foi enviado recentemente (últimas 24h) 
        // ou se ainda não foi marcado como visto
        return timeDiff < (24 * 60 * 60 * 1000) || !message._data.viewed
      }
      
      return true
    })

    // Preparar resposta com metadados
    const viewOnceData = viewOnceMessages.slice(0, limit).map(message => {
      const messageData = {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        author: message.author,
        timestamp: message.timestamp,
        type: message.type,
        hasMedia: message.hasMedia,
        body: message.body,
        caption: message._data.caption || '',
        fromMe: message.fromMe,
        
        // Dados específicos de view once
        isViewOnce: message._data.isViewOnce || message._data.viewOnce || false,
        ephemeral: message._data.ephemeral || false,
        viewed: message._data.viewed || false,
        ephemeralOutOfSync: message._data.ephemeralOutOfSync,
        
        // Metadados de mídia
        mediaKey: message._data.mediaKey,
        mimetype: message._data.mimetype,
        filename: message._data.filename,
        filesize: message._data.size,
        
        // Status do download
        mediaStage: message._data.mediaData?.mediaStage,
        canDownload: message.hasMedia && !message._data.viewed
      }
      
      return messageData
    })

    res.json({
      success: true,
      data: {
        chatId: chatId,
        totalFound: viewOnceMessages.length,
        returned: viewOnceData.length,
        includeExpired,
        messages: viewOnceData
      }
    })

  } catch (error) {
    console.error('Erro ao buscar mídia view once:', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Baixa mídia de uma mensagem view once específica
 * @async
 * @function downloadViewOnceMedia
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {string} req.params.sessionId - The session ID
 * @param {string} req.body.messageId - The message ID containing view once media
 * @param {string} req.body.chatId - The chat ID
 * @param {boolean} req.body.force - Force download even if expired (default: false)
 * @returns {Promise<void>}
 */
const downloadViewOnceMedia = async (req, res) => {
  /*
    #swagger.summary = 'Download view once media'
    #swagger.description = 'Downloads media from a specific view once message. This allows saving disappearing photos/videos before they expire. Use with caution and respect privacy.'
    #swagger.tags = ['View Once']
    #swagger.parameters['sessionId'] = {
      in: 'path',
      description: 'Session ID',
      required: true,
      type: 'string',
      example: 'redblack'
    }
    #swagger.requestBody = {
      required: true,
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            required: ['messageId', 'chatId'],
            properties: {
              messageId: {
                type: 'string',
                description: 'The message ID containing view once media',
                example: '3EB0XXXXXXXXXXXXX'
              },
              chatId: {
                type: 'string',
                description: 'The Chat ID where the message is located',
                example: '555197756708@c.us'
              },
              force: {
                type: 'boolean',
                description: 'Force download even if expired or already viewed (default: false)',
                example: false
              }
            }
          },
          examples: {
            default: {
              value: {
                messageId: '3EB0XXXXXXXXXXXXX',
                chatId: '555197756708@c.us',
                force: false
              }
            },
            forceDownload: {
              value: {
                messageId: '3EB0XXXXXXXXXXXXX',
                chatId: '555197756708@c.us',
                force: true
              }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'View once media downloaded successfully',
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  media: {
                    type: 'object',
                    properties: {
                      mimetype: { type: 'string', example: 'image/jpeg' },
                      data: { type: 'string', example: 'base64encodeddata...' },
                      filename: { type: 'string', example: 'viewonce_1698765432.jpg' }
                    }
                  },
                  metadata: {
                    type: 'object',
                    properties: {
                      messageId: { type: 'string', example: 'true_555197756708@c.us_3EB0XXXXX' },
                      from: { type: 'string', example: '555197756708@c.us' },
                      timestamp: { type: 'number', example: 1698765432 },
                      type: { type: 'string', example: 'image' },
                      isViewOnce: { type: 'boolean', example: true },
                      downloadedAt: { type: 'number', example: 1698765500 },
                      warning: { type: 'string', example: 'This is view once media that was meant to be seen only once. Handle responsibly.' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    #swagger.responses[404] = { description: 'Session or message not found' }
    #swagger.responses[500] = { description: 'Internal server error or media expired' }
  */
  try {
    const { messageId, chatId, force = false } = req.body
    
    // Verificar se sessão existe
    if (!sessions.has(req.params.sessionId)) {
      return sendErrorResponse(res, 404, 'Session not found')
    }
    
    const client = sessions.get(req.params.sessionId)
    
    if (!client) {
      return sendErrorResponse(res, 404, 'Session not found')
    }

    // Buscar a mensagem específica
    const chat = await client.getChatById(chatId)
    const messages = await chat.fetchMessages({ limit: 100 })
    const message = messages.find(msg => msg.id._serialized === messageId)

    if (!message) {
      throw new Error('Message not found')
    }

    // Verificar se é uma mensagem view once
    const isViewOnce = message._data && (
      message._data.isViewOnce || 
      message._data.viewOnce || 
      message._data.ephemeral
    )

    if (!isViewOnce) {
      throw new Error('Message is not a view once media')
    }

    if (!message.hasMedia) {
      throw new Error('Message does not contain media')
    }

    // Verificar se já foi visualizado (a menos que force seja true)
    if (!force && message._data.viewed) {
      throw new Error('View once media has already been viewed and may no longer be available')
    }

    try {
      // Tentar baixar a mídia
      const messageMedia = await message.downloadMedia()
      
      if (!messageMedia) {
        throw new Error('Failed to download media - may have expired or been viewed')
      }

      // Preparar metadados adicionais
      const metadata = {
        messageId: message.id._serialized,
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        caption: message._data.caption || '',
        mimetype: messageMedia.mimetype,
        filename: messageMedia.filename || `viewonce_${Date.now()}.${messageMedia.mimetype?.split('/')[1] || 'bin'}`,
        filesize: messageMedia.filesize,
        isViewOnce: true,
        downloadedAt: Date.now(),
        
        // Informações de segurança
        warning: 'This is view once media that was meant to be seen only once. Handle responsibly.'
      }

      res.json({
        success: true,
        data: {
          media: messageMedia,
          metadata: metadata
        }
      })

    } catch (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`)
    }

  } catch (error) {
    console.error('Erro ao baixar mídia view once:', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Obtém estatísticas de mensagens view once em um chat
 * @async
 * @function getViewOnceStats
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {string} req.params.sessionId - The session ID
 * @param {string} req.body.chatId - The chat ID to analyze
 * @param {number} req.body.days - Number of days to look back (default: 30)
 * @returns {Promise<void>}
 */
const getViewOnceStats = async (req, res) => {
  /*
    #swagger.summary = 'Get view once statistics'
    #swagger.description = 'Retrieves statistics about view once messages in a specific chat, including counts by type, status, sender, and date.'
    #swagger.tags = ['View Once']
    #swagger.parameters['sessionId'] = {
      in: 'path',
      description: 'Session ID',
      required: true,
      type: 'string',
      example: 'redblack'
    }
    #swagger.requestBody = {
      required: true,
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            required: ['chatId'],
            properties: {
              chatId: {
                type: 'string',
                description: 'The Chat ID to analyze',
                example: '555197756708@c.us'
              },
              days: {
                type: 'number',
                description: 'Number of days to look back (default: 30)',
                example: 30
              }
            }
          },
          examples: {
            last30days: {
              value: {
                chatId: '555197756708@c.us',
                days: 30
              }
            },
            last7days: {
              value: {
                chatId: '555197756708@c.us',
                days: 7
              }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'View once statistics retrieved successfully',
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  chatId: { type: 'string', example: '555197756708@c.us' },
                  periodDays: { type: 'number', example: 30 },
                  cutoffDate: { type: 'string', example: '2025-10-01T00:00:00.000Z' },
                  stats: {
                    type: 'object',
                    properties: {
                      totalMessages: { type: 'number', example: 150 },
                      viewOnceMessages: { type: 'number', example: 12 },
                      images: { type: 'number', example: 8 },
                      videos: { type: 'number', example: 4 },
                      viewed: { type: 'number', example: 7 },
                      unviewed: { type: 'number', example: 5 },
                      fromMe: { type: 'number', example: 3 },
                      fromOthers: { type: 'number', example: 9 },
                      byDate: { 
                        type: 'object',
                        example: { '2025-10-30': 2, '2025-10-29': 3 }
                      },
                      bySender: {
                        type: 'object',
                        example: { 'me': 3, '555197756708@c.us': 9 }
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
    #swagger.responses[404] = { description: 'Session not found' }
    #swagger.responses[500] = { description: 'Internal server error' }
  */
  try {
    const { chatId, days = 30 } = req.body
    
    // Verificar se sessão existe
    if (!sessions.has(req.params.sessionId)) {
      return sendErrorResponse(res, 404, 'Session not found')
    }
    
    const client = sessions.get(req.params.sessionId)
    
    if (!client) {
      return sendErrorResponse(res, 404, 'Session not found')
    }

    const chat = await client.getChatById(chatId)
    const messages = await chat.fetchMessages({ limit: 500 })
    
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000)
    
    const stats = {
      totalMessages: 0,
      viewOnceMessages: 0,
      images: 0,
      videos: 0,
      viewed: 0,
      unviewed: 0,
      fromMe: 0,
      fromOthers: 0,
      byDate: {},
      bySender: {}
    }

    messages.forEach(message => {
      const messageTime = message.timestamp * 1000
      if (messageTime < cutoffDate) return
      
      stats.totalMessages++
      
      // Verificar se é view once
      const isViewOnce = message._data && (
        message._data.isViewOnce || 
        message._data.viewOnce || 
        message._data.ephemeral
      )
      
      if (isViewOnce) {
        stats.viewOnceMessages++
        
        if (message.type === 'image') stats.images++
        if (message.type === 'video') stats.videos++
        
        if (message._data.viewed) stats.viewed++
        else stats.unviewed++
        
        if (message.fromMe) stats.fromMe++
        else stats.fromOthers++
        
        // Estatísticas por data
        const dateKey = new Date(messageTime).toISOString().split('T')[0]
        stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1
        
        // Estatísticas por remetente
        const sender = message.fromMe ? 'me' : (message.author || message.from)
        stats.bySender[sender] = (stats.bySender[sender] || 0) + 1
      }
    })

    res.json({
      success: true,
      data: {
        chatId,
        periodDays: days,
        cutoffDate: new Date(cutoffDate).toISOString(),
        stats
      }
    })

  } catch (error) {
    console.error('Erro ao obter estatísticas view once:', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Lista todos os chats que contêm mensagens view once
 * @async
 * @function getChatsWithViewOnce
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {string} req.params.sessionId - The session ID
 * @param {number} req.body.limit - Maximum number of chats to check (default: 50)
 * @returns {Promise<void>}
 */
const getChatsWithViewOnce = async (req, res) => {
  /*
    #swagger.summary = 'List chats with view once messages'
    #swagger.description = 'Scans chats to find which ones contain view once messages. Returns a list of chats sorted by the number of view once messages found.'
    #swagger.tags = ['View Once']
    #swagger.parameters['sessionId'] = {
      in: 'path',
      description: 'Session ID',
      required: true,
      type: 'string',
      example: 'redblack'
    }
    #swagger.requestBody = {
      required: false,
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of chats to check (default: 50)',
                example: 50
              }
            }
          },
          examples: {
            default: {
              value: {
                limit: 50
              }
            },
            checkAll: {
              value: {
                limit: 100
              }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'Chats with view once messages retrieved successfully',
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  totalChatsChecked: { type: 'number', example: 50 },
                  chatsWithViewOnce: { type: 'number', example: 5 },
                  chats: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        chatId: { type: 'string', example: '555197756708@c.us' },
                        name: { type: 'string', example: 'João Silva' },
                        isGroup: { type: 'boolean', example: false },
                        viewOnceCount: { type: 'number', example: 12 },
                        lastActivity: { type: 'number', example: 1698765432 }
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
    #swagger.responses[404] = { description: 'Session not found' }
    #swagger.responses[500] = { description: 'Internal server error' }
  */
  try {
    const { limit = 50 } = req.body
    
    // Verificar se sessão existe
    if (!sessions.has(req.params.sessionId)) {
      return sendErrorResponse(res, 404, 'Session not found')
    }
    
    const client = sessions.get(req.params.sessionId)
    
    if (!client) {
      return sendErrorResponse(res, 404, 'Session not found')
    }

    const chats = await client.getChats()
    const chatsWithViewOnce = []

    for (const chat of chats.slice(0, limit)) {
      try {
        const messages = await chat.fetchMessages({ limit: 100 })
        const viewOnceCount = messages.filter(message => {
          return message._data && (
            message._data.isViewOnce || 
            message._data.viewOnce || 
            message._data.ephemeral
          )
        }).length

        if (viewOnceCount > 0) {
          chatsWithViewOnce.push({
            chatId: chat.id._serialized,
            name: chat.name || 'Unknown',
            isGroup: chat.isGroup,
            viewOnceCount,
            lastActivity: messages[0]?.timestamp
          })
        }
      } catch (error) {
        console.log(`Erro ao verificar chat ${chat.id._serialized}:`, error.message)
      }
    }

    // Ordenar por contagem de view once (descrescente)
    chatsWithViewOnce.sort((a, b) => b.viewOnceCount - a.viewOnceCount)

    res.json({
      success: true,
      data: {
        totalChatsChecked: Math.min(chats.length, limit),
        chatsWithViewOnce: chatsWithViewOnce.length,
        chats: chatsWithViewOnce
      }
    })

  } catch (error) {
    console.error('Erro ao buscar chats com view once:', error)
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  getViewOnceMedia,
  downloadViewOnceMedia,
  getViewOnceStats,
  getChatsWithViewOnce
}