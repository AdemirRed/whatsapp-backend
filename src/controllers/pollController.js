const { sessions } = require('../sessions')
const { sendErrorResponse } = require('../utils')

/**
 * Get poll votes from a specific message
 *
 * @async
 * @function getPollVotes
 * @param {Object} req - The request object containing the request parameters
 * @param {string} req.params.sessionId - The id of the WhatsApp session to be used
 * @param {Object} req.body - The request body containing the messageId
 * @param {string} req.body.messageId - The ID of the poll message
 * @param {Object} res - The response object
 * @returns {Object} - The response object containing poll votes data
 * @throws {Error} - If there is an error while getting poll votes
 */
const getPollVotes = async (req, res) => {
  /*
    #swagger.requestBody = {
      required: true,
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              messageId: {
                type: 'string',
                description: 'The ID of the poll message',
              }
            }
          },
          examples: {
            default: { value: { messageId: 'false_123456789@c.us_ABC123' } }
          }
        }
      }
    }
  */
  /*
    #swagger.responses[200] = {
      description: 'Poll votes retrieved successfully',
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: true,
              },
              votes: {
                type: 'array',
                description: 'Array of poll votes',
              }
            }
          }
        }
      }
    }
  */

  try {
    const client = sessions.get(req.params.sessionId)
    const { messageId } = req.body

    if (!messageId) {
      return sendErrorResponse(res, 400, 'Message ID is required')
    }

    // Get the message by ID
    const message = await client.getMessageById(messageId)
    
    if (!message) {
      return sendErrorResponse(res, 404, 'Message not found')
    }

    // Check if message is a poll
    if (message.type !== 'poll_creation') {
      return sendErrorResponse(res, 400, 'Message is not a poll')
    }

    // Get poll votes
    const pollVotes = await message.getPollVotes()
    
    // Format the response
    const formattedVotes = []
    
    for (const [optionName, votes] of pollVotes) {
      const voteData = {
        option: optionName,
        votes: []
      }
      
      for (const vote of votes) {
        voteData.votes.push({
          contactId: vote.voter,
          selectedOptions: vote.selectedOptions,
          timestamp: vote.timestamp
        })
      }
      
      formattedVotes.push(voteData)
    }

    res.json({
      success: true,
      message: 'Poll votes retrieved successfully',
      poll: {
        messageId: message.id._serialized,
        pollName: message.pollName,
        options: message.pollOptions,
        allowMultipleAnswers: message.allowMultipleAnswers,
        votes: formattedVotes,
        totalVotes: formattedVotes.reduce((total, option) => total + option.votes.length, 0)
      }
    })
  } catch (error) {
    console.error('getPollVotes ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Get all polls from a specific chat
 *
 * @async
 * @function getChatPolls
 * @param {Object} req - The request object containing the request parameters
 * @param {string} req.params.sessionId - The id of the WhatsApp session to be used
 * @param {Object} req.body - The request body containing the chatId
 * @param {string} req.body.chatId - The ID of the chat to search for polls
 * @param {Object} res - The response object
 * @returns {Object} - The response object containing polls data
 * @throws {Error} - If there is an error while getting polls
 */
const getChatPolls = async (req, res) => {
  /*
    #swagger.requestBody = {
      required: true,
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              chatId: {
                type: 'string',
                description: 'The Chat id to search for polls',
              },
              limit: {
                type: 'number',
                description: 'Number of messages to search (default: 50)',
              }
            }
          },
          examples: {
            default: { value: { chatId: '123456789@c.us', limit: 50 } }
          }
        }
      }
    }
  */

  try {
    const client = sessions.get(req.params.sessionId)
    const { chatId, limit = 50 } = req.body

    if (!chatId) {
      return sendErrorResponse(res, 400, 'Chat ID is required')
    }

    // Get the chat
    const chat = await client.getChatById(chatId)
    
    if (!chat) {
      return sendErrorResponse(res, 404, 'Chat not found')
    }

    // Fetch messages and filter polls
    const messages = await chat.fetchMessages({ limit })
    const polls = messages.filter(message => message.type === 'poll_creation')
    
    const pollData = []
    
    for (const poll of polls) {
      try {
        // Buscar a mensagem completa pelo ID para garantir que getPollVotes está disponível
        const fullPollMessage = await client.getMessageById(poll.id._serialized)
        
        if (!fullPollMessage || typeof fullPollMessage.getPollVotes !== 'function') {
          console.warn(`Poll ${poll.id._serialized} does not have getPollVotes method`)
          
          // Retornar poll sem votos se o método não estiver disponível
          pollData.push({
            messageId: poll.id._serialized,
            pollName: poll.pollName || poll.body,
            options: poll.pollOptions || [],
            allowMultipleAnswers: poll.allowMultipleAnswers || false,
            timestamp: poll.timestamp,
            author: poll.author,
            votes: [],
            totalVotes: 0,
            error: 'Unable to retrieve votes for this poll'
          })
          continue
        }
        
        const pollVotes = await fullPollMessage.getPollVotes()
        const formattedVotes = []
        
        for (const [optionName, votes] of pollVotes) {
          formattedVotes.push({
            option: optionName,
            count: votes.length,
            voters: votes.map(vote => ({
              contactId: vote.voter,
              timestamp: vote.timestamp
            }))
          })
        }
        
        pollData.push({
          messageId: fullPollMessage.id._serialized,
          pollName: fullPollMessage.pollName || fullPollMessage.body,
          options: fullPollMessage.pollOptions || [],
          allowMultipleAnswers: fullPollMessage.allowMultipleAnswers || false,
          timestamp: fullPollMessage.timestamp,
          author: fullPollMessage.author,
          votes: formattedVotes,
          totalVotes: formattedVotes.reduce((total, option) => total + option.count, 0)
        })
      } catch (error) {
        console.error(`Error processing poll ${poll.id._serialized}:`, error.message)
        
        // Incluir poll com erro para que o usuário saiba que existe
        pollData.push({
          messageId: poll.id._serialized,
          pollName: poll.pollName || poll.body,
          options: poll.pollOptions || [],
          allowMultipleAnswers: poll.allowMultipleAnswers || false,
          timestamp: poll.timestamp,
          author: poll.author,
          votes: [],
          totalVotes: 0,
          error: error.message
        })
      }
    }

    res.json({
      success: true,
      message: 'Chat polls retrieved successfully',
      chatId,
      polls: pollData,
      totalPolls: pollData.length
    })
  } catch (error) {
    console.error('getChatPolls ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Create a poll in a chat (using sendMessage endpoint)
 * Note: This function is a helper, actual poll creation should use /client/sendMessage with contentType: "Poll"
 * 
 * Example usage:
 * POST /client/sendMessage/{sessionId}
 * {
 *   "chatId": "555197756708@c.us",
 *   "contentType": "Poll",
 *   "content": {
 *     "pollName": "Cats or Dogs?",
 *     "pollOptions": ["Cats", "Dogs"],
 *     "options": {
 *       "allowMultipleAnswers": true
 *     }
 *   }
 * }
 */
const createPollInfo = async (req, res) => {
  res.json({
    success: true,
    message: 'To create a poll, use the /client/sendMessage/{sessionId} endpoint',
    example: {
      endpoint: '/client/sendMessage/{sessionId}',
      method: 'POST',
      body: {
        chatId: '555197756708@c.us',
        contentType: 'Poll',
        content: {
          pollName: 'Cats or Dogs?',
          pollOptions: ['Cats', 'Dogs'],
          options: {
            allowMultipleAnswers: true
          }
        }
      }
    },
    note: 'Use contentType: "Poll" with the sendMessage endpoint to create polls'
  })
}

/**
 * Get poll votes by contact phone number
 *
 * @async
 * @function getPollVotesByContact
 * @param {Object} req - The request object containing the request parameters
 * @param {string} req.params.sessionId - The id of the WhatsApp session to be used
 * @param {Object} req.body - The request body containing search criteria
 * @param {string} req.body.phoneNumber - The phone number to search votes for
 * @param {string} req.body.chatId - Optional: Chat ID to limit search
 * @param {number} req.body.limit - Optional: Number of messages to search (default: 100)
 * @param {Object} res - The response object
 * @returns {Object} - The response object containing poll votes data for the contact
 * @throws {Error} - If there is an error while getting poll votes
 */
const getPollVotesByContact = async (req, res) => {
  /*
    #swagger.requestBody = {
      required: true,
      '@content': {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              phoneNumber: {
                type: 'string',
                description: 'The phone number to search votes for',
              },
              chatId: {
                type: 'string',
                description: 'Optional: Chat ID to limit search',
              },
              limit: {
                type: 'number',
                description: 'Number of messages to search (default: 100)',
              }
            }
          },
          examples: {
            default: { 
              value: { 
                phoneNumber: '555199999999',
                chatId: '555199999999@c.us',
                limit: 100
              } 
            }
          }
        }
      }
    }
  */

  try {
    const client = sessions.get(req.params.sessionId)
    const { phoneNumber, chatId, limit = 100 } = req.body

    if (!phoneNumber) {
      return sendErrorResponse(res, 400, 'Phone number is required')
    }

    // Format phone number
    const formattedNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`
    
    let chatsToSearch = []
    
    if (chatId) {
      // Search in specific chat
      const chat = await client.getChatById(chatId)
      if (chat) {
        chatsToSearch.push(chat)
      }
    } else {
      // Search in all chats
      const allChats = await client.getChats()
      chatsToSearch = allChats
    }

    const contactVotes = []
    
    for (const chat of chatsToSearch) {
      try {
        // Fetch messages and filter polls
        const messages = await chat.fetchMessages({ limit })
        const polls = messages.filter(message => message.type === 'poll_creation')
        
        for (const poll of polls) {
          try {
            // Buscar a mensagem completa pelo ID para garantir que getPollVotes está disponível
            const fullPollMessage = await client.getMessageById(poll.id._serialized)
            
            if (!fullPollMessage || typeof fullPollMessage.getPollVotes !== 'function') {
              console.warn(`Poll ${poll.id._serialized} does not have getPollVotes method`)
              continue
            }
            
            const pollVotes = await fullPollMessage.getPollVotes()
            
            // Check if the contact voted in this poll
            for (const [optionName, votes] of pollVotes) {
              const contactVote = votes.find(vote => vote.voter === formattedNumber)
              
              if (contactVote) {
                contactVotes.push({
                  chatId: chat.id._serialized,
                  chatName: chat.name || 'Private Chat',
                  messageId: poll.id._serialized,
                  pollName: poll.pollName,
                  selectedOption: optionName,
                  timestamp: contactVote.timestamp,
                  pollTimestamp: poll.timestamp,
                  allPollOptions: poll.pollOptions
                })
              }
            }
          } catch (error) {
            console.error('Error processing poll votes:', error)
          }
        }
      } catch (error) {
        console.error('Error fetching messages from chat:', error)
      }
    }

    // Sort by timestamp (newest first)
    contactVotes.sort((a, b) => b.timestamp - a.timestamp)

    res.json({
      success: true,
      message: 'Contact poll votes retrieved successfully',
      contact: formattedNumber,
      votes: contactVotes,
      totalVotes: contactVotes.length,
      searchedChats: chatsToSearch.length
    })
  } catch (error) {
    console.error('getPollVotesByContact ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  getPollVotes,
  getChatPolls,
  createPollInfo,
  getPollVotesByContact
}