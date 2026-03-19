const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { sessions } = require('../sessions')
const { sendErrorResponse } = require('../utils')

// Diretório de dados do canal editorial
const DATA_DIR = path.join(process.cwd(), 'data', 'channel-editorial')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const POSTS_FILE = path.join(DATA_DIR, 'posts.json')

// Garante que os arquivos de dados existam
const initDataFiles = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
      channel_id: '',
      sessionId: '',
      posts_per_day: 3,
      send_hours: [8, 12, 18],
      llm_api_url: process.env.LLM_API_URL || '',
      llm_api_key: process.env.LLM_API_KEY || '',
      llm_model: process.env.LLM_MODEL || 'gpt-4o-mini',
      llm_system_prompt: 'Você é um assistente editorial. Gere conteúdo relevante e engajador.',
      llm_user_prompt_template: 'Gere um post editorial sobre {{postType}}.'
    }, null, 2))
  }
  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify([], null, 2))
  }
}

// Lê o arquivo de configuração
const readConfig = () => {
  initDataFiles()
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
}

// Lê todos os posts
const readPosts = () => {
  initDataFiles()
  return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'))
}

// Salva posts no arquivo
const savePosts = (posts) => {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2))
}

// Gera um ID único para posts
const generateId = () => `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// Chama a API LLM para gerar conteúdo
const callLLM = (config, postType = '') => {
  return new Promise((resolve, reject) => {
    const apiUrl = config.llm_api_url
    if (!apiUrl) return reject(new Error('llm_api_url não configurado'))
    if (!config.llm_api_key) return reject(new Error('llm_api_key não configurado'))

    const userPrompt = config.llm_user_prompt_template.replace('{{postType}}', postType || 'geral')

    const payload = JSON.stringify({
      model: config.llm_model,
      messages: [
        { role: 'system', content: config.llm_system_prompt },
        { role: 'user', content: userPrompt }
      ]
    })

    let parsedUrl
    try {
      parsedUrl = new URL(apiUrl)
    } catch {
      return reject(new Error('llm_api_url inválida'))
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + (parsedUrl.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.llm_api_key}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }

    const lib = parsedUrl.protocol === 'https:' ? https : http
    const req = lib.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) return reject(new Error(json.error.message || 'Erro da API LLM'))
          const content = json.choices?.[0]?.message?.content
          if (!content) return reject(new Error('Resposta inesperada da API LLM'))
          resolve(content.trim())
        } catch {
          reject(new Error('Falha ao parsear resposta da LLM'))
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(30000, () => {
      req.destroy(new Error('Timeout na chamada à LLM'))
    })
    req.write(payload)
    req.end()
  })
}

// Envia mensagem para o canal WhatsApp usando a sessão configurada
const sendToChannel = async (config, content) => {
  if (!config.sessionId) throw new Error('sessionId não configurado')
  if (!config.channel_id) throw new Error('channel_id não configurado')

  const client = sessions.get(config.sessionId)
  if (!client) throw new Error(`Sessão "${config.sessionId}" não encontrada ou não está ativa`)

  // sendSeen:false evita erro em canais (newsletters não suportam marcação de lido)
  await client.sendMessage(config.channel_id, content, { sendSeen: false, linkPreview: false })
}

// ============================
// GET /channel-editorial/config
// ============================
const getConfig = async (req, res) => {
  // #swagger.tags = ['Channel Editorial']
  // #swagger.summary = 'Retorna configurações do canal editorial'
  // #swagger.description = 'Retorna todas as configurações do canal (channel_id, posts_per_day, send_hours, etc.)'
  try {
    const config = readConfig()
    // Não expõe a chave da LLM
    const safeConfig = { ...config, llm_api_key: config.llm_api_key ? '***' : '' }
    res.json({ success: true, config: safeConfig })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// ============================
// PUT /channel-editorial/config
// ============================
const updateConfig = async (req, res) => {
  // #swagger.tags = ['Channel Editorial']
  // #swagger.summary = 'Atualiza configurações do canal editorial'
  // #swagger.description = 'Atualiza as configurações do canal em lote.'
  /* #swagger.requestBody = {
    required: true,
    content: {
      "application/json": {
        schema: { "$ref": "#/definitions/ChannelEditorialConfigBody" }
      }
    }
  } */
  try {
    const current = readConfig()
    const allowed = [
      'channel_id', 'sessionId', 'posts_per_day', 'send_hours',
      'llm_api_url', 'llm_api_key', 'llm_model',
      'llm_system_prompt', 'llm_user_prompt_template'
    ]
    const updates = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    const updated = { ...current, ...updates }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2))
    res.json({ success: true, message: 'Configurações atualizadas com sucesso' })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// ============================
// GET /channel-editorial/posts
// ============================
const listPosts = async (req, res) => {
  // #swagger.tags = ['Channel Editorial']
  // #swagger.summary = 'Lista histórico de posts do canal editorial'
  // #swagger.description = 'Lista posts com paginação. Query params: page, limit, status, postType, fromDate, toDate'
  try {
    let posts = readPosts()
    const { page = 1, limit = 20, status, postType, fromDate, toDate } = req.query

    if (status) posts = posts.filter(p => p.status === status)
    if (postType) posts = posts.filter(p => p.postType === postType)
    if (fromDate) posts = posts.filter(p => new Date(p.createdAt) >= new Date(fromDate))
    if (toDate) posts = posts.filter(p => new Date(p.createdAt) <= new Date(toDate))

    // Ordena do mais recente para o mais antigo
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const total = posts.length
    const paginated = posts.slice((pageNum - 1) * limitNum, pageNum * limitNum)

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      posts: paginated
    })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// ================================
// GET /channel-editorial/posts/:id
// ================================
const getPostById = async (req, res) => {
  // #swagger.tags = ['Channel Editorial']
  // #swagger.summary = 'Busca um post específico por ID'
  try {
    const posts = readPosts()
    const post = posts.find(p => p.id === req.params.id)
    if (!post) return sendErrorResponse(res, 404, 'Post não encontrado')
    res.json({ success: true, post })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =================================
// POST /channel-editorial/preview
// =================================
const previewPost = async (req, res) => {
  // #swagger.tags = ['Channel Editorial']
  // #swagger.summary = 'Gera prévia do conteúdo via LLM sem publicar'
  // #swagger.description = 'Gera conteúdo usando a LLM configurada e retorna a prévia sem publicar no canal.'
  /* #swagger.requestBody = {
    content: {
      "application/json": {
        schema: { "$ref": "#/definitions/ChannelEditorialPostTypeBody" }
      }
    }
  } */
  try {
    const config = readConfig()
    const { postType = '' } = req.body
    const content = await callLLM(config, postType)

    // Salva como rascunho
    const posts = readPosts()
    const post = {
      id: generateId(),
      content,
      postType: postType || 'geral',
      status: 'draft',
      createdAt: new Date().toISOString(),
      sentAt: null
    }
    posts.push(post)
    savePosts(posts)

    res.json({ success: true, post })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =================================
// POST /channel-editorial/send-now
// =================================
const sendNow = async (req, res) => {
  // #swagger.tags = ['Channel Editorial']
  // #swagger.summary = 'Gera via LLM e publica imediatamente no canal do WhatsApp'
  /* #swagger.requestBody = {
    content: {
      "application/json": {
        schema: { "$ref": "#/definitions/ChannelEditorialPostTypeBody" }
      }
    }
  } */
  try {
    const config = readConfig()
    const { postType = '' } = req.body

    const content = await callLLM(config, postType)

    const posts = readPosts()
    const post = {
      id: generateId(),
      content,
      postType: postType || 'geral',
      status: 'failed',
      createdAt: new Date().toISOString(),
      sentAt: null
    }

    try {
      await sendToChannel(config, content)
      post.status = 'sent'
      post.sentAt = new Date().toISOString()
    } catch (sendErr) {
      post.errorMessage = sendErr.message
      posts.push(post)
      savePosts(posts)
      return sendErrorResponse(res, 500, `Conteúdo gerado mas erro ao enviar: ${sendErr.message}`)
    }

    posts.push(post)
    savePosts(posts)
    res.json({ success: true, post })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================================
// POST /channel-editorial/send-post/:id
// =====================================
const sendPostById = async (req, res) => {
  // #swagger.tags = ['Channel Editorial']
  // #swagger.summary = 'Reenvia um post existente (draft/falho) pelo ID'
  try {
    const config = readConfig()
    const posts = readPosts()
    const idx = posts.findIndex(p => p.id === req.params.id)
    if (idx === -1) return sendErrorResponse(res, 404, 'Post não encontrado')

    const post = posts[idx]
    if (post.status === 'sent') {
      return sendErrorResponse(res, 422, 'Post já foi enviado com sucesso')
    }

    await sendToChannel(config, post.content)
    posts[idx].status = 'sent'
    posts[idx].sentAt = new Date().toISOString()
    delete posts[idx].errorMessage
    savePosts(posts)

    res.json({ success: true, post: posts[idx] })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

// =====================================
// DELETE /channel-editorial/posts/:id
// =====================================
const deletePost = async (req, res) => {
  // #swagger.tags = ['Channel Editorial']
  // #swagger.summary = 'Deleta um post pelo ID'
  try {
    const posts = readPosts()
    const idx = posts.findIndex(p => p.id === req.params.id)
    if (idx === -1) return sendErrorResponse(res, 404, 'Post não encontrado')
    posts.splice(idx, 1)
    savePosts(posts)
    res.json({ success: true, message: 'Post deletado com sucesso' })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  getConfig,
  updateConfig,
  listPosts,
  getPostById,
  previewPost,
  sendNow,
  sendPostById,
  deletePost
}
