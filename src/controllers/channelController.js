const { sessions } = require('../sessions')
const { sendErrorResponse } = require('../utils')

/**
 * Retorna todos os canais (newsletters) do WhatsApp que o cliente segue ou administra.
 */
const getChannels = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Lista todos os canais do WhatsApp'
  // #swagger.description = 'Retorna todos os canais (newsletters) do WhatsApp que o cliente segue ou administra.'
  /* #swagger.requestBody = {} */
  try {
    const { sessionId } = req.params
    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channels = await client.getChannels()
    res.json({ success: true, channels })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Busca um canal pelo código de convite (ex: do link https://whatsapp.com/channel/<code>).
 */
const getChannelByInviteCode = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Busca canal pelo código de convite'
  // #swagger.description = 'Retorna as informações do canal a partir do código de convite (parte do link https://whatsapp.com/channel/<inviteCode>).'
  /* #swagger.requestBody = {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: 'object',
          properties: {
            inviteCode: { type: 'string', description: 'Código de convite do canal', example: 'AbCdEfGhIj1234567890' }
          },
          required: ['inviteCode']
        }
      }
    }
  } */
  try {
    const { sessionId } = req.params
    const { inviteCode } = req.body

    if (!inviteCode) return sendErrorResponse(res, 400, 'inviteCode é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channel = await client.getChannelByInviteCode(inviteCode)
    res.json({ success: true, channel })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Pesquisa canais por termo de busca.
 */
const searchChannels = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Pesquisa canais do WhatsApp'
  // #swagger.description = 'Pesquisa canais públicos do WhatsApp por termo de busca.'
  /* #swagger.requestBody = {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Termo de busca', example: 'notícias' }
          },
          required: ['query']
        }
      }
    }
  } */
  try {
    const { sessionId } = req.params
    const { query } = req.body

    if (!query) return sendErrorResponse(res, 400, 'query é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const results = await client.searchChannels({ query })
    res.json({ success: true, results })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = { getChannels, getChannelByInviteCode, searchChannels }
