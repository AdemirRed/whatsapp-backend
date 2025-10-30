const { sessions } = require('../sessions')
const { sendErrorResponse } = require('../utils')

/**
 * @function
 * @async
 * @name getClassInfo
 * @description Gets information about a chat using the chatId and sessionId
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} req.body.chatId - The ID of the chat to get information for
 * @param {string} req.params.sessionId - The ID of the session to use
 * @returns {Object} - Returns a JSON object with the success status and chat information
 * @throws {Error} - Throws an error if chat is not found or if there is a server error
 */
const getClassInfo = async (req, res) => {
  try {
    const { chatId } = req.body
    const client = sessions.get(req.params.sessionId)
    const chat = await client.getChatById(chatId)
    if (!chat) { sendErrorResponse(res, 404, 'Chat not Found') }
    res.json({ success: true, chat })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Clears all messages in a chat.
 *
 * @function
 * @async
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The ID of the session.
 * @param {string} req.body.chatId - The ID of the chat to clear messages from.
 * @throws {Error} If the chat is not found or there is an internal server error.
 * @returns {Object} The success status and the cleared messages.
 */
const clearMessages = async (req, res) => {
  try {
    const { chatId } = req.body
    const client = sessions.get(req.params.sessionId)
    const chat = await client.getChatById(chatId)
    if (!chat) { sendErrorResponse(res, 404, 'Chat not Found') }
    const clearMessages = await chat.clearMessages()
    res.json({ success: true, clearMessages })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Stops typing or recording in chat immediately.
 *
 * @function
 * @async
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @param {string} req.body.chatId - ID of the chat to clear the state for.
 * @param {string} req.params.sessionId - ID of the session the chat belongs to.
 * @returns {Promise<void>} - A Promise that resolves with a JSON object containing a success flag and the result of clearing the state.
 * @throws {Error} - If there was an error while clearing the state.
 */
const clearState = async (req, res) => {
  try {
    const { chatId } = req.body
    const client = sessions.get(req.params.sessionId)
    const chat = await client.getChatById(chatId)
    if (!chat) { sendErrorResponse(res, 404, 'Chat not Found') }
    const clearState = await chat.clearState()
    res.json({ success: true, clearState })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Delete a chat.
 *
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.chatId - The ID of the chat to be deleted.
 * @returns {Object} A JSON response indicating whether the chat was deleted successfully.
 * @throws {Object} If there is an error while deleting the chat, an error response is sent with a status code of 500.
 * @throws {Object} If the chat is not found, an error response is sent with a status code of 404.
 */
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.body
    const client = sessions.get(req.params.sessionId)
    const chat = await client.getChatById(chatId)
    if (!chat) { sendErrorResponse(res, 404, 'Chat not Found') }
    const deleteChat = await chat.delete()
    res.json({ success: true, deleteChat })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Fetches messages from a specified chat with advanced options.
 *
 * @function
 * @async
 *
 * @param {Object} req - The request object containing sessionId, chatId, and searchOptions.
 * @param {string} req.params.sessionId - The ID of the session associated with the chat.
 * @param {Object} req.body - The body of the request containing chatId and searchOptions.
 * @param {string} req.body.chatId - The ID of the chat from which to fetch messages.
 * @param {Object} req.body.searchOptions - The search options to use when fetching messages.
 * @param {boolean} req.body.includeReactions - Include message reactions (default: false).
 * @param {boolean} req.body.includeMentions - Include message mentions (default: false).
 * @param {boolean} req.body.includeQuoted - Include quoted messages (default: false).
 * @param {boolean} req.body.includeMedia - Include media information (default: false).
 * @param {boolean} req.body.includeContacts - Include contact information (default: false).
 *
 * @param {Object} res - The response object to send the fetched messages.
 * @returns {Promise<Object>} A JSON object containing the success status and enhanced messages.
 *
 * @throws {Error} If the chat is not found or there is an error fetching messages.
 */
const fetchMessages = async (req, res) => {
  try {
    /*
    #swagger.summary = 'Fetch messages from chat with advanced options'
    #swagger.description = 'Retrieves messages from a specific chat with optional enhanced information including reactions, mentions, quoted messages, media details, and contacts. This is a powerful endpoint that can provide comprehensive message data in a single request.'
    #swagger.tags = ['Chat']
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
                description: 'Unique whatsApp identifier for the given Chat (either group or personal)',
                example: '555197756708@c.us'
              },
              searchOptions: {
                type: 'object',
                description: 'Search options for fetching messages (limit, fromMe, etc)',
                properties: {
                  limit: { type: 'number', example: 50 },
                  fromMe: { type: 'boolean', example: false }
                },
                example: { limit: 50 }
              },
              includeReactions: {
                type: 'boolean',
                description: 'Include emoji reactions on messages (adds _enhanced.reactions array)',
                example: false
              },
              includeMentions: {
                type: 'boolean',
                description: 'Include @mentioned contacts in messages (adds _enhanced.mentions array)',
                example: false
              },
              includeQuoted: {
                type: 'boolean',
                description: 'Include quoted/replied messages (adds _enhanced.quotedMessage object)',
                example: false
              },
              includeMedia: {
                type: 'boolean',
                description: 'Include detailed media information without downloading (adds _enhanced.mediaInfo object)',
                example: false
              },
              includeContacts: {
                type: 'boolean',
                description: 'Include contact card information for vcard messages (adds _enhanced.contacts array)',
                example: false
              }
            }
          },
          examples: {
            basic: {
              summary: 'Basic fetch (no enhancements)',
              value: {
                chatId: '555197756708@c.us',
                searchOptions: { limit: 50 }
              }
            },
            withReactions: {
              summary: 'Fetch with reactions',
              value: {
                chatId: '555197756708@c.us',
                searchOptions: { limit: 20 },
                includeReactions: true
              }
            },
            withMentionsAndQuoted: {
              summary: 'Fetch with mentions and quoted messages',
              value: {
                chatId: '555197756708-1234567890@g.us',
                searchOptions: { limit: 30 },
                includeMentions: true,
                includeQuoted: true
              }
            },
            fullEnhanced: {
              summary: 'Fetch with all enhancements',
              value: {
                chatId: '555197756708@c.us',
                searchOptions: { limit: 10 },
                includeReactions: true,
                includeMentions: true,
                includeQuoted: true,
                includeMedia: true,
                includeContacts: true
              }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'Messages fetched successfully',
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'object', example: { _serialized: 'true_555197756708@c.us_3EB0XXXXX' } },
                    body: { type: 'string', example: 'Hello, how are you?' },
                    type: { type: 'string', example: 'chat' },
                    timestamp: { type: 'number', example: 1698765432 },
                    from: { type: 'string', example: '555197756708@c.us' },
                    to: { type: 'string', example: '555198804804@c.us' },
                    fromMe: { type: 'boolean', example: false },
                    hasMedia: { type: 'boolean', example: false },
                    hasQuotedMsg: { type: 'boolean', example: false },
                    hasReaction: { type: 'boolean', example: false },
                    _enhanced: {
                      type: 'object',
                      description: 'Enhanced information (only present if requested)',
                      properties: {
                        reactions: {
                          type: 'array',
                          description: 'Emoji reactions to this message',
                          example: [
                            { id: '555199999999@c.us', reaction: '👍', timestamp: 1698765500 }
                          ]
                        },
                        mentions: {
                          type: 'array',
                          description: 'Mentioned contacts in this message',
                          example: [
                            { id: '555188888888@c.us', name: 'Maria', number: '5551888888888' }
                          ]
                        },
                        quotedMessage: {
                          type: 'object',
                          description: 'The message that was quoted/replied to',
                          example: {
                            id: 'true_555197756708@c.us_3EB0YYYYY',
                            body: 'Original message',
                            from: '555197756708@c.us'
                          }
                        },
                        mediaInfo: {
                          type: 'object',
                          description: 'Media metadata without downloading',
                          example: {
                            mimetype: 'image/jpeg',
                            filename: 'photo.jpg',
                            filesize: 245678,
                            downloadable: true
                          }
                        },
                        contacts: {
                          type: 'array',
                          description: 'Contact cards shared in message',
                          example: [
                            { id: '555177777777@c.us', name: 'Pedro Santos' }
                          ]
                        }
                      }
                    }
                  }
                }
              },
              enhanced: {
                type: 'object',
                description: 'Enhancement metadata (only present if enhancements requested)',
                properties: {
                  includeReactions: { type: 'boolean', example: true },
                  includeMentions: { type: 'boolean', example: true },
                  includeQuoted: { type: 'boolean', example: true },
                  includeMedia: { type: 'boolean', example: true },
                  includeContacts: { type: 'boolean', example: true },
                  totalMessages: { type: 'number', example: 10 },
                  processedAt: { type: 'string', example: '2025-10-30T15:30:00.000Z' }
                }
              }
            }
          }
        }
      }
    }
    #swagger.responses[404] = { description: 'Session or chat not found' }
    #swagger.responses[500] = { description: 'Internal server error' }
  */
    const { 
      chatId, 
      searchOptions = {}, 
      includeReactions = false,
      includeMentions = false,
      includeQuoted = false,
      includeMedia = false,
      includeContacts = false
    } = req.body
    
    const client = sessions.get(req.params.sessionId)
    const chat = await client.getChatById(chatId)
    if (!chat) { 
      return sendErrorResponse(res, 404, 'Chat not Found') 
    }
    
    const messages = await chat.fetchMessages(searchOptions)
    
    // Se nenhuma opção avançada foi solicitada, retornar mensagens básicas
    if (!includeReactions && !includeMentions && !includeQuoted && !includeMedia && !includeContacts) {
      return res.json({ success: true, messages })
    }
    
    // Processar mensagens com informações avançadas
    const enhancedMessages = []
    
    for (const message of messages) {
      try {
        const enhancedMessage = {
          ...message,
          _enhanced: {}
        }
        
        // Incluir reações se solicitado
        if (includeReactions) {
          try {
            if (message.hasReaction) {
              const reactions = await message.getReactions()
              enhancedMessage._enhanced.reactions = reactions
            } else {
              enhancedMessage._enhanced.reactions = []
            }
          } catch (error) {
            console.log(`Erro ao buscar reações da mensagem ${message.id._serialized}:`, error.message)
            enhancedMessage._enhanced.reactions = []
          }
        }
        
        // Incluir menções se solicitado
        if (includeMentions) {
          try {
            const mentions = await message.getMentions()
            enhancedMessage._enhanced.mentions = mentions.map(mention => ({
              id: mention.id._serialized,
              name: mention.name,
              pushname: mention.pushname,
              number: mention.number,
              isMe: mention.isMe,
              isUser: mention.isUser,
              isGroup: mention.isGroup,
              isWAContact: mention.isWAContact,
              profilePicThumbObj: mention.profilePicThumbObj
            }))
          } catch (error) {
            console.log(`Erro ao buscar menções da mensagem ${message.id._serialized}:`, error.message)
            enhancedMessage._enhanced.mentions = []
          }
        }
        
        // Incluir mensagem citada se solicitado
        if (includeQuoted) {
          try {
            if (message.hasQuotedMsg) {
              const quotedMessage = await message.getQuotedMessage()
              enhancedMessage._enhanced.quotedMessage = {
                id: quotedMessage.id._serialized,
                body: quotedMessage.body,
                type: quotedMessage.type,
                timestamp: quotedMessage.timestamp,
                from: quotedMessage.from,
                to: quotedMessage.to,
                author: quotedMessage.author,
                fromMe: quotedMessage.fromMe,
                hasMedia: quotedMessage.hasMedia,
                caption: quotedMessage._data?.caption || null
              }
            } else {
              enhancedMessage._enhanced.quotedMessage = null
            }
          } catch (error) {
            console.log(`Erro ao buscar mensagem citada ${message.id._serialized}:`, error.message)
            enhancedMessage._enhanced.quotedMessage = null
          }
        }
        
        // Incluir informações de mídia se solicitado
        if (includeMedia && message.hasMedia) {
          try {
            enhancedMessage._enhanced.mediaInfo = {
              mimetype: message._data.mimetype,
              filename: message._data.filename,
              filesize: message._data.size,
              mediaKey: message._data.mediaKey,
              caption: message._data.caption || null,
              isGif: message._data.isGif || false,
              isAnimated: message._data.isAnimated || false,
              mediaStage: message._data.mediaData?.mediaStage || null,
              // Não baixar a mídia automaticamente para economizar recursos
              // Use o endpoint /message/downloadMedia para baixar quando necessário
              downloadable: true
            }
          } catch (error) {
            console.log(`Erro ao buscar informações de mídia ${message.id._serialized}:`, error.message)
            enhancedMessage._enhanced.mediaInfo = null
          }
        }
        
        // Incluir informações de contato se solicitado
        if (includeContacts) {
          try {
            if (message.type === 'vcard' || message.type === 'multi_vcard') {
              const contacts = await message.getContacts()
              enhancedMessage._enhanced.contacts = contacts.map(contact => ({
                id: contact.id._serialized,
                name: contact.name,
                pushname: contact.pushname,
                number: contact.number,
                isMe: contact.isMe,
                isUser: contact.isUser,
                isGroup: contact.isGroup,
                isWAContact: contact.isWAContact
              }))
            } else {
              enhancedMessage._enhanced.contacts = []
            }
          } catch (error) {
            console.log(`Erro ao buscar contatos da mensagem ${message.id._serialized}:`, error.message)
            enhancedMessage._enhanced.contacts = []
          }
        }
        
        enhancedMessages.push(enhancedMessage)
        
      } catch (error) {
        console.log(`Erro ao processar mensagem ${message.id?._serialized}:`, error.message)
        // Adicionar mensagem sem melhorias em caso de erro
        enhancedMessages.push(message)
      }
    }
    
    res.json({ 
      success: true, 
      messages: enhancedMessages,
      enhanced: {
        includeReactions,
        includeMentions,
        includeQuoted,
        includeMedia,
        includeContacts,
        totalMessages: enhancedMessages.length,
        processedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Gets the contact for a chat
 * @async
 * @function
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {string} req.params.sessionId - The ID of the current session
 * @param {string} req.body.chatId - The ID of the chat to get the contact for
 * @returns {Promise<void>} - Promise that resolves with the chat's contact information
 * @throws {Error} - Throws an error if chat is not found or if there is an error getting the contact information
 */
const getContact = async (req, res) => {
  try {
    const { chatId } = req.body
    const client = sessions.get(req.params.sessionId)
    const chat = await client.getChatById(chatId)
    if (!chat) { sendErrorResponse(res, 404, 'Chat not Found') }
    const contact = await chat.getContact()
    res.json({ success: true, contact })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Send a recording state to a WhatsApp chat.
 * @async
 * @function
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {object} req.body - The request body.
 * @param {string} req.body.chatId - The ID of the chat to send the recording state to.
 * @returns {object} - An object containing a success message and the result of the sendStateRecording method.
 * @throws {object} - An error object containing a status code and error message if an error occurs.
 */
const sendStateRecording = async (req, res) => {
  try {
    const { chatId } = req.body
    const client = sessions.get(req.params.sessionId)
    const chat = await client.getChatById(chatId)
    if (!chat) { sendErrorResponse(res, 404, 'Chat not Found') }
    const sendStateRecording = await chat.sendStateRecording()
    res.json({ success: true, sendStateRecording })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Send a typing state to a WhatsApp chat.
 * @async
 * @function
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {object} req.body - The request body.
 * @param {string} req.body.chatId - The ID of the chat to send the typing state to.
 * @returns {object} - An object containing a success message and the result of the sendStateTyping method.
 * @throws {object} - An error object containing a status code and error message if an error occurs.
 */
const sendStateTyping = async (req, res) => {
  try {
    const { chatId } = req.body
    const client = sessions.get(req.params.sessionId)
    const chat = await client.getChatById(chatId)
    if (!chat) { sendErrorResponse(res, 404, 'Chat not Found') }
    const sendStateTyping = await chat.sendStateTyping()
    res.json({ success: true, sendStateTyping })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  getClassInfo,
  clearMessages,
  clearState,
  deleteChat,
  fetchMessages,
  getContact,
  sendStateRecording,
  sendStateTyping
}
