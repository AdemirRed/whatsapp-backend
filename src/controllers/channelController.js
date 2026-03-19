'use strict'

const { sessions } = require('../sessions')
const { sendErrorResponse } = require('../utils')
const { MessageMedia, Poll } = require('whatsapp-web.js')

/**
 * Helper: busca um canal pelo ID entre os canais do cliente.
 */
const findChannel = async (client, channelId) => {
  const channels = await client.getChannels()
  return channels.find(c => c.id._serialized === channelId) || null
}

/**
 * Helper: converte string base64 "data:<mime>;base64,<data>" em MessageMedia.
 */
const base64ToMedia = (dataUrl, filename = null) => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('pictureBase64 inválido: use formato data:<mimetype>;base64,<dados>')
  return new MessageMedia(match[1], match[2], filename)
}

// =====================
// GET /channel/getChannels/:sessionId
// =====================
const getChannels = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Lista todos os canais do WhatsApp'
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

// =====================
// POST /channel/sendMessage/:sessionId
// =====================
const sendMessage = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Envia mensagem de texto, mídia ou enquete para o canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      content: { type: 'string', example: 'Texto da publicação' },
      mediaBase64: { type: 'string', description: 'Base64 da mídia (data:image/jpeg;base64,...)' },
      caption: { type: 'string' },
      filename: { type: 'string', example: 'imagem.jpg' },
      poll: { type: 'object', description: 'Enquete. Propriedades: pollName (string), pollOptions (array de strings), allowMultipleAnswers (bool)' }
    }, required: ['channelId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, content, mediaBase64, caption, filename, poll } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const msgOptions = { sendSeen: false, linkPreview: false }
    let msgContent

    if (poll) {
      // Enquete (Poll) — suportada em canais como tipo pollCreation
      if (!poll.pollName) return sendErrorResponse(res, 400, 'poll.pollName é obrigatório')
      if (!Array.isArray(poll.pollOptions) || poll.pollOptions.length < 2) {
        return sendErrorResponse(res, 400, 'poll.pollOptions deve ter pelo menos 2 opções')
      }
      msgContent = new Poll(poll.pollName, poll.pollOptions, {
        allowMultipleAnswers: poll.allowMultipleAnswers === true,
      })
    } else if (mediaBase64) {
      const media = base64ToMedia(mediaBase64, filename || null)
      msgOptions.media = media
      if (caption) msgOptions.caption = caption
      msgContent = caption || ''
    } else {
      if (!content) return sendErrorResponse(res, 400, 'content é obrigatório quando não há mídia ou poll')
      msgContent = content
    }

    const msg = await client.sendMessage(channelId, msgContent, msgOptions)
    res.json({ success: true, message: msg })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/fetchMessages/:sessionId
// =====================
const fetchMessages = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Busca histórico de publicações do canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      limit: { type: 'number', example: 20 },
      fromMe: { type: 'boolean' }
    }, required: ['channelId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, limit, fromMe } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channel = await findChannel(client, channelId)
    if (!channel) return sendErrorResponse(res, 404, 'Canal não encontrado')

    const searchOptions = {}
    if (limit !== undefined) searchOptions.limit = limit
    if (fromMe !== undefined) searchOptions.fromMe = fromMe

    const messages = await channel.fetchMessages(searchOptions)
    res.json({ success: true, messages })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/createChannel/:sessionId
// =====================
const createChannel = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Cria um novo canal do WhatsApp'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      title: { type: 'string', example: 'Meu Canal' },
      description: { type: 'string' },
      pictureBase64: { type: 'string', description: 'data:image/jpeg;base64,...' }
    }, required: ['title'] } } } } */
  try {
    const { sessionId } = req.params
    const { title, description, pictureBase64 } = req.body
    if (!title) return sendErrorResponse(res, 400, 'title é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const options = {}
    if (description) options.description = description
    if (pictureBase64) {
      const media = base64ToMedia(pictureBase64)
      options.picture = media.data
    }

    const result = await client.createChannel(title, options)
    if (typeof result === 'string' && result.startsWith('CreateChannelError')) {
      return sendErrorResponse(res, 400, result)
    }
    res.json({ success: true, channel: result })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/deleteChannel/:sessionId
// =====================
const deleteChannel = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Deleta o canal criado pelo usuário'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' }
    }, required: ['channelId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    // Usa pupPage diretamente para contornar bug da lib (this.client.pupPage em vez de this.pupPage)
    const success = await client.pupPage.evaluate(async (channelId) => {
      const channel = await window.WWebJS.getChat(channelId, { getAsModel: false })
      if (!channel) return false
      try {
        await window.Store.ChannelUtils.deleteNewsletterAction(channel)
        return true
      } catch (err) {
        if (err.name === 'ServerStatusCodeError') return false
        throw err
      }
    }, channelId)

    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/getChannelByInviteCode/:sessionId
// =====================
const getChannelByInviteCode = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Busca canal pelo código de convite'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      inviteCode: { type: 'string', example: 'AbCdEfGhIj1234567890' }
    }, required: ['inviteCode'] } } } } */
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

// =====================
// POST /channel/searchChannels/:sessionId
// =====================
const searchChannels = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Pesquisa canais públicos do WhatsApp'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      searchText: { type: 'string', example: 'notícias' },
      limit: { type: 'number', example: 10 },
      view: { type: 'number', description: '0=Recomendados, 1=Trending, 2=Populares, 3=Novos', example: 0 },
      countryCodes: { type: 'array', items: { type: 'string' }, example: ['BR'] },
      skipSubscribedNewsletters: { type: 'boolean' }
    } } } } } */
  try {
    const { sessionId } = req.params
    const { searchText = '', limit = 50, view = 0, countryCodes, skipSubscribedNewsletters = false } = req.body

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const searchOptions = { searchText, limit, view, skipSubscribedNewsletters }
    if (countryCodes) searchOptions.countryCodes = countryCodes

    const results = await client.searchChannels(searchOptions)
    res.json({ success: true, results })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/subscribeToChannel/:sessionId
// =====================
const subscribeToChannel = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Inscreve-se em um canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' }
    }, required: ['channelId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const success = await client.subscribeToChannel(channelId)
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/unsubscribeFromChannel/:sessionId
// =====================
const unsubscribeFromChannel = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Cancela inscrição em um canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      deleteLocalModels: { type: 'boolean', default: false }
    }, required: ['channelId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, deleteLocalModels = false } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const success = await client.unsubscribeFromChannel(channelId, { deleteLocalModels })
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/setSubject/:sessionId
// =====================
const setSubject = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Renomeia o canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      subject: { type: 'string', example: 'Novo nome do canal' }
    }, required: ['channelId', 'subject'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, subject } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')
    if (!subject) return sendErrorResponse(res, 400, 'subject é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channel = await findChannel(client, channelId)
    if (!channel) return sendErrorResponse(res, 404, 'Canal não encontrado')

    const success = await channel.setSubject(subject)
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/setDescription/:sessionId
// =====================
const setDescription = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Atualiza a descrição do canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      description: { type: 'string' }
    }, required: ['channelId', 'description'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, description } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')
    if (description === undefined) return sendErrorResponse(res, 400, 'description é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channel = await findChannel(client, channelId)
    if (!channel) return sendErrorResponse(res, 404, 'Canal não encontrado')

    const success = await channel.setDescription(description)
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/setProfilePicture/:sessionId
// =====================
const setProfilePicture = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Atualiza a foto de perfil do canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      pictureBase64: { type: 'string', description: 'data:image/jpeg;base64,...' }
    }, required: ['channelId', 'pictureBase64'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, pictureBase64 } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')
    if (!pictureBase64) return sendErrorResponse(res, 400, 'pictureBase64 é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channel = await findChannel(client, channelId)
    if (!channel) return sendErrorResponse(res, 404, 'Canal não encontrado')

    const media = base64ToMedia(pictureBase64)
    const success = await channel.setProfilePicture(media)
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/setReactionSetting/:sessionId
// =====================
const setReactionSetting = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Configura reações permitidas no canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      reactionCode: { type: 'number', description: '0=Nenhuma, 1=Básica, 2=Todas', example: 1 }
    }, required: ['channelId', 'reactionCode'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, reactionCode } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')
    if (reactionCode === undefined) return sendErrorResponse(res, 400, 'reactionCode é obrigatório (0, 1 ou 2)')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channel = await findChannel(client, channelId)
    if (!channel) return sendErrorResponse(res, 404, 'Canal não encontrado')

    const success = await channel.setReactionSetting(reactionCode)
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/mute/:sessionId
// =====================
const mute = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Silencia notificações do canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' }
    }, required: ['channelId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channel = await findChannel(client, channelId)
    if (!channel) return sendErrorResponse(res, 404, 'Canal não encontrado')

    const success = await channel.mute()
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/unmute/:sessionId
// =====================
const unmute = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Ativa notificações do canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' }
    }, required: ['channelId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channel = await findChannel(client, channelId)
    if (!channel) return sendErrorResponse(res, 404, 'Canal não encontrado')

    const success = await channel.unmute()
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/getSubscribers/:sessionId
// =====================
const getSubscribers = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Retorna assinantes do canal que estão na lista de contatos'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      limit: { type: 'number', example: 50 }
    }, required: ['channelId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, limit } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const channel = await findChannel(client, channelId)
    if (!channel) return sendErrorResponse(res, 404, 'Canal não encontrado')

    const subscribers = await channel.getSubscribers(limit)
    res.json({ success: true, subscribers })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/sendChannelAdminInvite/:sessionId
// =====================
const sendChannelAdminInvite = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Envia convite de administrador para um usuário'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      chatId: { type: 'string', example: '555197756708@c.us' },
      comment: { type: 'string' }
    }, required: ['channelId', 'chatId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, chatId, comment } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')
    if (!chatId) return sendErrorResponse(res, 400, 'chatId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const options = comment ? { comment } : {}
    const success = await client.sendChannelAdminInvite(chatId, channelId, options)
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/acceptChannelAdminInvite/:sessionId
// =====================
const acceptChannelAdminInvite = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Aceita convite de administrador de canal'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' }
    }, required: ['channelId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const success = await client.acceptChannelAdminInvite(channelId)
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/revokeChannelAdminInvite/:sessionId
// =====================
const revokeChannelAdminInvite = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Revoga convite de administrador enviado a um usuário'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      userId: { type: 'string', example: '555197756708@c.us' }
    }, required: ['channelId', 'userId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, userId } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')
    if (!userId) return sendErrorResponse(res, 400, 'userId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const success = await client.revokeChannelAdminInvite(channelId, userId)
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/demoteChannelAdmin/:sessionId
// =====================
const demoteChannelAdmin = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Rebaixa um administrador de canal para assinante'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      userId: { type: 'string', example: '555197756708@c.us' }
    }, required: ['channelId', 'userId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, userId } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')
    if (!userId) return sendErrorResponse(res, 400, 'userId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const success = await client.demoteChannelAdmin(channelId, userId)
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================
// POST /channel/transferChannelOwnership/:sessionId
// =====================
const transferChannelOwnership = async (req, res) => {
  // #swagger.tags = ['Channel']
  // #swagger.summary = 'Transfere propriedade do canal para outro usuário (deve ser admin)'
  /* #swagger.requestBody = {
    required: true,
    content: { "application/json": { schema: { type: 'object', properties: {
      channelId: { type: 'string', example: '123456789@newsletter' },
      newOwnerId: { type: 'string', example: '555197756708@c.us' },
      shouldDismissSelfAsAdmin: { type: 'boolean', default: false }
    }, required: ['channelId', 'newOwnerId'] } } } } */
  try {
    const { sessionId } = req.params
    const { channelId, newOwnerId, shouldDismissSelfAsAdmin = false } = req.body
    if (!channelId) return sendErrorResponse(res, 400, 'channelId é obrigatório')
    if (!newOwnerId) return sendErrorResponse(res, 400, 'newOwnerId é obrigatório')

    const client = sessions.get(sessionId)
    if (!client) return sendErrorResponse(res, 404, 'Sessão não encontrada')

    const success = await client.transferChannelOwnership(channelId, newOwnerId, { shouldDismissSelfAsAdmin })
    res.json({ success })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  getChannels,
  sendMessage,
  fetchMessages,
  createChannel,
  deleteChannel,
  getChannelByInviteCode,
  searchChannels,
  subscribeToChannel,
  unsubscribeFromChannel,
  setSubject,
  setDescription,
  setProfilePicture,
  setReactionSetting,
  mute,
  unmute,
  getSubscribers,
  sendChannelAdminInvite,
  acceptChannelAdminInvite,
  revokeChannelAdminInvite,
  demoteChannelAdmin,
  transferChannelOwnership,
}

