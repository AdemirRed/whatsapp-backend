const { validateSession, sessions } = require('../sessions')
const { sendErrorResponse } = require('../utils')
const fs = require('fs').promises
const path = require('path')

const BIPTEXT_NUMBER = '553172280540@c.us'
const TRANSCRIPTION_HEADER = 'Transcrição ✏️'

// Store para controlar o estado das conversas com BipText
const conversationState = new Map()

// Store para rastrear usuários que já passaram pelo fluxo inicial
const userHistory = new Map()

// Helpers de detecção de padrões do BipText (evitar falsos positivos)
const isTranscribingIndicator = (text) => {
  const t = (text || '').toLowerCase()
  return (
    t.includes('já estou transcrevendo') ||
    t.includes('um momento, já estou transcrevendo') ||
    t.includes('transcrevendo') ||
    t.includes('já estou ouvindo') ||
    t.includes('ouvindo')
  )
}

const shouldReplyConcordo = (text) => {
  const t = (text || '').toLowerCase()
  // Nunca responder concordo se já estiver transcrevendo/ouvindo
  if (isTranscribingIndicator(t)) return false
  if (t.includes('transcrição')) return false
  
  // Padrões específicos para a mensagem de termo de uso
  const hasTermoDeUso = (
    t.includes('termo de uso') ||
    t.includes('aceite nosso termo') ||
    t.includes('você concorda com nosso termo') ||
    t.includes('concorda com nosso termo de uso')
  )
  
  // Outros padrões típicos de consentimento inicial
  const hasConsentHints = (
    t.includes('termos') ||
    t.includes('condições') ||
    t.includes('política') ||
    t.includes('lgpd') ||
    t.includes('aceita') ||
    t.includes('aceitar') ||
    t.includes('transformar áudios') ||
    t.includes('responda com') ||
    t.includes('clique em') ||
    t.includes('digite "concordo"') ||
    t.includes('digite concordo')
  )
  
  return hasTermoDeUso || hasConsentHints
}

const shouldReplyPermito = (text) => {
  const t = (text || '').toLowerCase()
  // Nunca responder permito se já estiver transcrevendo/ouvindo ou se já veio transcrição
  if (isTranscribingIndicator(t)) return false
  if (t.includes('transcrição')) return false
  
  // Padrões específicos para a pergunta sobre uso de dados
  const hasUseOfData = (
    t.includes('você permite o uso dos dados') ||
    t.includes('permite o uso dos dados') ||
    t.includes('uso dos dados para melhorar') ||
    t.includes('melhorar a eficiência') ||
    t.includes('blip viratexto') ||
    t.includes('produtos oferecidos pela blip') ||
    t.includes('última pergunta')
  )
  
  // Outros padrões típicos de permissão
  const hasPermitHints = (
    t.includes('autoriza') ||
    t.includes('permite') ||
    t.includes('acesso') ||
    t.includes('permito?') ||
    t.includes('pode prosseguir') ||
    t.includes('responda com') ||
    t.includes('digite "permito"') ||
    t.includes('digite permito')
  )
  
  return hasUseOfData || hasPermitHints
}

/**
 * Verifica se é a primeira vez que o usuário usa a transcrição
 */
const isFirstTimeUser = (sessionId) => {
  return !userHistory.has(sessionId)
}

/**
 * Marca usuário como já tendo passado pelo fluxo inicial
 */
const markUserAsExperienced = (sessionId) => {
  userHistory.set(sessionId, {
    firstUsed: Date.now(),
    lastUsed: Date.now()
  })
}

/**
 * Atualiza último uso do usuário
 */
const updateUserLastUsed = (sessionId) => {
  if (userHistory.has(sessionId)) {
    const userData = userHistory.get(sessionId)
    userData.lastUsed = Date.now()
    userHistory.set(sessionId, userData)
  }
}

/**
 * Limpa o histórico de um usuário para forçar fluxo inicial
 */
const resetUserHistory = (sessionId) => {
  if (userHistory.has(sessionId)) {
    userHistory.delete(sessionId)
    console.log(`🔄 Histórico do usuário ${sessionId} foi resetado`)
    return true
  }
  return false
}

/**
 * Clean transcription text by removing unwanted characters and signatures
 * @param {string} text - Raw transcription text
 * @returns {string} - Cleaned transcription text
 */
const cleanTranscriptionText = (text) => {
  if (!text) return ''
  
  return text
    // Remove asteriscos no início e fim
    .replace(/^\*+|\*+$/g, '')
    // Remove múltiplas quebras de linha
    .replace(/\n{2,}/g, '\n')
    // Remove assinatura do BipText
    .replace(/--\s*Transcrito por.*$/i, '')
    // Remove texto entre parênteses no final (ex: "-- Transcrito por Blip ViraTexto")
    .replace(/\(\s*--.*\)$/i, '')
    // Remove espaços extras no início e fim
    .trim()
    // Remove quebras de linha no início e fim
    .replace(/^\n+|\n+$/g, '')
}

/**
 * Transcribe audio using BipText service.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.audioBase64 - Base64 encoded audio file (optional if messageId provided).
 * @param {string} req.body.messageId - Message ID of audio to transcribe (optional if audioBase64 provided).
 * @param {string} req.body.filename - Filename with extension (e.g., 'audio.ogg', 'audio.mp3').
 * @returns {Promise<void>}
 * @throws {Error} If there was an error transcribing audio.
 */
const transcribeAudio = async (req, res) => {
  // #swagger.summary = 'Transcribe audio using BipText'
  // #swagger.description = 'Send audio to BipText (553172280540@c.us) for transcription. Accepts base64 audio or messageId.'
  /* #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { 
            $ref: "#/definitions/TranscribeAudioBody" 
          },
          examples: {
            base64: {
              summary: "Transcribe using base64 audio",
              value: {
                audioBase64: "data:audio/ogg;base64,T2dnUwACAAAAAAAAAADdN...",
                filename: "audio.ogg"
              }
            },
            messageId: {
              summary: "Transcribe using message ID",
              value: {
                messageId: "true_5511999999999@c.us_3EB0C2F1234567890ABC"
              }
            }
          }
        }
      }
    }
  */
  try {
    const sessionId = req.params.sessionId
    const { audioBase64, messageId, filename = 'audio.ogg' } = req.body

    // Validar que pelo menos um método foi fornecido
    if (!audioBase64 && !messageId) {
      /* #swagger.responses[400] = {
        description: "Bad Request - Either audioBase64 or messageId is required.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 400, 'Either audioBase64 or messageId is required')
      return
    }

    // Validar sessão
    const sessionData = await validateSession(sessionId)
    if (!sessionData.success) {
      /* #swagger.responses[404] = {
        description: "Session not found.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 404, sessionData.message)
      return
    }

    const session = sessions.get(sessionId)
    
    // Preparar o áudio
    let audioMedia
    
    if (messageId) {
      // Buscar mensagem pelo ID
      const message = await session.getMessageById(messageId)
      if (!message) {
        sendErrorResponse(res, 404, 'Message not found')
        return
      }
      if (!message.hasMedia) {
        sendErrorResponse(res, 400, 'Message does not contain media')
        return
      }
      audioMedia = await message.downloadMedia()
    } else {
      // Usar base64 fornecido
      const MessageMedia = require('whatsapp-web.js').MessageMedia
      
      // Remover o prefixo data:audio/...;base64, se existir
      let base64Data = audioBase64
      if (audioBase64.includes(',')) {
        base64Data = audioBase64.split(',')[1]
      }
      
      // Determinar mimetype pelo filename
      const ext = path.extname(filename).toLowerCase()
      let mimetype = 'audio/ogg'
      if (ext === '.mp3') mimetype = 'audio/mpeg'
      else if (ext === '.wav') mimetype = 'audio/wav'
      else if (ext === '.m4a') mimetype = 'audio/mp4'
      else if (ext === '.aac') mimetype = 'audio/aac'
      
      audioMedia = new MessageMedia(mimetype, base64Data, filename)
    }

    // VERIFICAR HISTÓRICO DO CHAT PRIMEIRO
    console.log(`🔍 Verificando histórico do chat com BipText...`)
    
    // Criar ID único para esta transcrição específica
    const transcriptionId = `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      const chat = await session.getChatById(BIPTEXT_NUMBER)
      const messages = await chat.fetchMessages({ limit: 10 })
      const hasHistory = messages && messages.length > 0
      
      console.log(`📜 Chat history: ${hasHistory ? `${messages.length} mensagens encontradas` : 'Nenhuma mensagem anterior'}`)
      
      conversationState.set(transcriptionId, {
        step: 0,
        sessionId,
        startTime: Date.now(),
        audioMedia, // Armazenar o áudio para enviar depois
        audioSent: false,
        isFirstTime: !hasHistory,
        hasHistory: hasHistory
      })

      console.log(`🎙️ Iniciando transcrição [${transcriptionId}] - Primeira vez: ${!hasHistory}`)
    } catch (error) {
      console.log(`⚠️ Erro ao verificar histórico do chat, assumindo primeira vez:`, error.message)
      conversationState.set(transcriptionId, {
        step: 0,
        sessionId,
        startTime: Date.now(),
        audioMedia,
        audioSent: false,
        isFirstTime: true,
        hasHistory: false
      })
    }

    // Configurar listener para mensagens do BipText
  const messageHandler = async (message) => {
      try {
        // Verificar se a mensagem é do BipText
        if (message.from !== BIPTEXT_NUMBER) return
        
        // Buscar conversação ativa para esta sessão (mais recente)
        let activeConversation = null
        let newestTime = 0
        
        for (const [key, conv] of conversationState.entries()) {
          if (conv.sessionId === sessionId && 
              Date.now() - conv.startTime < 300000 && // 5 minutos timeout
              conv.startTime > newestTime) {
            activeConversation = { key, ...conv }
            newestTime = conv.startTime
          }
        }
        
        if (!activeConversation) return

  const messageText = message.body || ''
  const step = activeConversation.step
  const isFirstTime = activeConversation.isFirstTime

        console.log(`📨 BipText resposta [${activeConversation.key.split('_')[2]}] - Step ${step}: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`)

        // ⚠️ REGRA ESPECIAL: Se receber transcrição, parar fluxo imediatamente
        if (messageText.includes(TRANSCRIPTION_HEADER)) {
          console.log(`🛑 TRANSCRIÇÃO RECEBIDA - Parando fluxo de concordo/permito`)
          const rawTranscription = messageText.replace(TRANSCRIPTION_HEADER, '').trim()
          const cleanedTranscription = cleanTranscriptionText(rawTranscription)
          conversationState.set(activeConversation.key, {
            ...activeConversation,
            step: 4,
            transcription: cleanedTranscription,
            completed: true
          })
          
          if (isFirstTime) {
            markUserAsExperienced(sessionId)
          } else {
            updateUserLastUsed(sessionId)
          }
          
          console.log(`✨ Transcrição concluída: "${cleanedTranscription.substring(0, 100)}${cleanedTranscription.length > 100 ? '...' : ''}"`)
          // Remover listener imediatamente para evitar respostas tardias (como "Permito")
          session.removeListener('message', messageHandler)
          return
        }

        if (step === 0) {
          // Se o BipText indicar que já está transcrevendo/ouvindo, não enviar concordo/permito
          if (isTranscribingIndicator(messageText)) {
            console.log(`⏳ Indicador de transcrição/escuta detectado - aguardando resultado`)
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 3
            })
            return
          }
          
          // PRIMEIRA VERIFICAÇÃO: Se tem mensagem de "apenas ouvir áudios"
          if (messageText.includes('Ops! No momento consigo apenas ouvir seus áudios') ||
              messageText.includes('Por favor, me envie ou encaminhe seu áudio')) {
            console.log(`🔄 BipText pronto para receber áudio - Enviando diretamente`)
            await session.sendMessage(BIPTEXT_NUMBER, activeConversation.audioMedia)
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 3,
              audioSent: true
            })
            return
          }
          
          // IGNORAR: Mensagem de apresentação inicial
          if (messageText.includes('Olá! Sou o Contato Inteligente da Blip') ||
              messageText.includes('Conte comigo para transformar áudios em textos')) {
            console.log(`👋 Mensagem de apresentação - Aguardando próxima`)
            return
          }
          
          // SEGUNDA VERIFICAÇÃO: Se é primeira vez (sem histórico) e realmente pediu "Concordo"
          if (isFirstTime && shouldReplyConcordo(messageText)) {
            console.log(`✅ Primeira vez - BipText pedindo concordância (Termo de Uso)`)
            await message.reply('Concordo')
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 1
            })
          }
          // TERCEIRA VERIFICAÇÃO: Se não é primeira vez
          else if (!isFirstTime) {
            if (messageText.includes('Um momento, já estou transcrevendo') || 
                messageText.includes('transcrevendo')) {
              console.log(`⏳ Usuário com histórico - Áudio sendo transcrito`)
              conversationState.set(activeConversation.key, {
                ...activeConversation,
                step: 3
              })
            } else {
              console.log(`❓ Usuário com histórico - Aguardando transcrição ou próxima mensagem`)
            }
          } else {
            console.log(`❓ Mensagem não reconhecida - Aguardando próxima: "${messageText.substring(0, 50)}..."`)
          }
        } else if (step === 1 && isFirstTime) {
          // Segunda mensagem: Verificar se realmente está pedindo "Permito" (uso de dados)
          if (shouldReplyPermito(messageText)) {
            console.log(`✅ BipText pedindo permissão - Enviando "Permito" (Uso de dados)`)
            await message.reply('Permito')
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 2
            })
          } else {
            console.log(`❓ Step 1 - Mensagem não reconhecida como pedido de permissão: "${messageText.substring(0, 50)}..."`)
          }
        } else if (step === 2 && isFirstTime) {
          // Terceira mensagem: "Já estou ouvindo" ou "Ops! No momento..." - ÁUDIO JÁ FOI ENVIADO NO INÍCIO
          if (messageText.includes('Já estou ouvindo') || 
              messageText.includes('ouvindo') ||
              messageText.includes('Pode me enviar') ||
              messageText.includes('Ops! No momento consigo apenas ouvir seus áudios')) {
            console.log(`🎵 BipText pronto - Áudio já foi enviado no início, aguardando transcrição`)
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 3,
              audioSent: true
            })
            // Marcar usuário como experiente após primeiro uso
            markUserAsExperienced(sessionId)
          }
          // Aguardar status de transcrição
          else if (messageText.includes('Um momento, já estou transcrevendo') || 
                   messageText.includes('transcrevendo')) {
            console.log(`⏳ Áudio sendo transcrito`)
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 3
            })
            markUserAsExperienced(sessionId)
          }
        } else if (step === 3) {
          // Quarta mensagem: Transcrição com cabeçalho
          if (messageText.includes(TRANSCRIPTION_HEADER)) {
            // Extrair apenas o texto da transcrição (após o cabeçalho)
            const rawTranscription = messageText.replace(TRANSCRIPTION_HEADER, '').trim()
            const cleanedTranscription = cleanTranscriptionText(rawTranscription)
            
            // Armazenar resultado
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 4,
              transcription: cleanedTranscription,
              completed: true
            })
            
            if (isFirstTime) {
              markUserAsExperienced(sessionId)
            } else {
              updateUserLastUsed(sessionId)
            }
            
            console.log(`✨ Transcrição concluída: "${cleanedTranscription.substring(0, 100)}${cleanedTranscription.length > 100 ? '...' : ''}"`)
          }
        }
      } catch (error) {
        console.error('❌ Erro no handler de mensagem BipText:', error)
      }
    }

    // Registrar listener temporário
    session.on('message', messageHandler)

    // ENVIAR ÁUDIO INICIAL
    const conversationData = conversationState.get(transcriptionId)
    
    try {
      console.log(`🎵 Tentando enviar áudio para BipText...`)
      console.log(`📊 Dados do áudio: mimetype=${audioMedia.mimetype}, size=${audioMedia.data ? audioMedia.data.length : 'undefined'} bytes`)
      
      if (conversationData && !conversationData.hasHistory) {
        console.log(`🆕 Primeira vez (sem histórico) - Enviando áudio diretamente`)
      } else {
        console.log(`👤 Usuário com histórico - Enviando áudio diretamente`)
      }
      
      const sentMessage = await session.sendMessage(BIPTEXT_NUMBER, audioMedia)
      console.log(`✅ Áudio enviado com sucesso! Message ID: ${sentMessage.id._serialized}`)
      
      // Atualizar estado para indicar que áudio foi enviado
      conversationState.set(transcriptionId, {
        ...conversationData,
        audioSent: true,
        sentMessageId: sentMessage.id._serialized
      })
      
    } catch (error) {
      console.error(`❌ ERRO ao enviar áudio para BipText:`, error)
      console.error(`❌ Tipo de erro:`, error.constructor.name)
      console.error(`❌ Mensagem:`, error.message)
      
      if (error.message.includes('Rate limit')) {
        console.error(`❌ Rate limit detectado - tentando novamente em 5 segundos`)
        await new Promise(resolve => setTimeout(resolve, 5000))
        try {
          const retryMessage = await session.sendMessage(BIPTEXT_NUMBER, audioMedia)
          console.log(`✅ Áudio enviado na segunda tentativa! Message ID: ${retryMessage.id._serialized}`)
        } catch (retryError) {
          console.error(`❌ Falha na segunda tentativa:`, retryError.message)
          throw retryError
        }
      } else {
        console.error(`❌ Detalhes completos do erro:`, {
          message: error.message,
          stack: error.stack,
          audioMediaType: typeof audioMedia,
          audioMediaMimetype: audioMedia?.mimetype,
          audioMediaSize: audioMedia?.data?.length,
          bipTextNumber: BIPTEXT_NUMBER,
          sessionId: sessionId,
          sessionState: await session.getState().catch(() => 'unable_to_get_state')
        })
        throw error
      }
    }

    // Aguardar transcrição (timeout de 2 minutos)
    const maxWaitTime = 120000 // 2 minutos
    const checkInterval = 1000 // 1 segundo
    let elapsedTime = 0

    const transcription = await new Promise((resolve, reject) => {
      const intervalId = setInterval(() => {
        elapsedTime += checkInterval

        // Verificar se a transcrição foi completada
        for (const [key, conv] of conversationState.entries()) {
          if (conv.sessionId === sessionId && conv.completed && conv.transcription) {
            clearInterval(intervalId)
            session.removeListener('message', messageHandler)
            conversationState.delete(key)
            resolve(conv.transcription)
            return
          }
        }

        // Timeout
        if (elapsedTime >= maxWaitTime) {
          clearInterval(intervalId)
          session.removeListener('message', messageHandler)
          // Limpar conversações desta sessão
          for (const [key, conv] of conversationState.entries()) {
            if (conv.sessionId === sessionId) {
              conversationState.delete(key)
            }
          }
          reject(new Error('⏱️ Timeout na transcrição - BipText não respondeu a tempo (2 min)'))
        }
      }, checkInterval)
    })

    /* #swagger.responses[200] = {
      description: "Audio transcribed successfully.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TranscribeAudioResponse" }
        }
      }
    }
    */
    res.json({
      success: true,
      transcription,
      message: 'Audio transcribed successfully'
    })
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
    console.log('transcribeAudio ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Serve HTML page for file to base64 conversion.
 *
 * @function
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {void}
 */
const fileToBase64Page = (req, res) => {
  // #swagger.ignore = true
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conversor de Arquivo para Base64 - WhatsApp API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f8f9ff;
        }
        .upload-area:hover {
            border-color: #764ba2;
            background: #f0f2ff;
        }
        .upload-area.dragover {
            border-color: #764ba2;
            background: #e8ebff;
            transform: scale(1.02);
        }
        .upload-icon {
            font-size: 60px;
            margin-bottom: 15px;
        }
        .upload-text {
            color: #667eea;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .upload-hint {
            color: #999;
            font-size: 14px;
        }
        input[type="file"] {
            display: none;
        }
        .file-info {
            display: none;
            margin-top: 20px;
            padding: 20px;
            background: #f8f9ff;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .file-info.show {
            display: block;
        }
        .file-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
            word-break: break-all;
        }
        .file-details {
            color: #666;
            font-size: 14px;
        }
        .result-area {
            display: none;
            margin-top: 20px;
        }
        .result-area.show {
            display: block;
        }
        .result-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }
        .result-box {
            background: #f8f9ff;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 15px;
            max-height: 200px;
            overflow-y: auto;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #333;
        }
        .copy-btn {
            margin-top: 10px;
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            width: 100%;
        }
        .copy-btn:hover {
            background: #764ba2;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .copy-btn:active {
            transform: translateY(0);
        }
        .copy-btn.copied {
            background: #25D366;
        }
        .loading {
            display: none;
            text-align: center;
            margin-top: 20px;
        }
        .loading.show {
            display: block;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error {
            display: none;
            margin-top: 20px;
            padding: 15px;
            background: #fee;
            border-left: 4px solid #f44;
            border-radius: 8px;
            color: #c33;
        }
        .error.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📁 Conversor para Base64</h1>
        <p class="subtitle">Selecione qualquer arquivo para converter em formato Base64</p>
        
        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">📤</div>
            <div class="upload-text">Clique para selecionar ou arraste o arquivo aqui</div>
            <div class="upload-hint">Suporta: áudio, imagem, vídeo, documentos</div>
            <input type="file" id="fileInput" accept="*/*">
        </div>

        <div class="file-info" id="fileInfo">
            <div class="file-name" id="fileName"></div>
            <div class="file-details" id="fileDetails"></div>
        </div>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <div>Convertendo arquivo...</div>
        </div>

        <div class="error" id="error"></div>

        <div class="result-area" id="resultArea">
            <div class="result-label">🎯 Base64 (Data URI):</div>
            <div class="result-box" id="resultBox"></div>
            <button class="copy-btn" id="copyBtn">📋 Copiar Base64</button>
        </div>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileDetails = document.getElementById('fileDetails');
        const loading = document.getElementById('loading');
        const resultArea = document.getElementById('resultArea');
        const resultBox = document.getElementById('resultBox');
        const copyBtn = document.getElementById('copyBtn');
        const errorDiv = document.getElementById('error');

        // Click to select file
        uploadArea.addEventListener('click', () => fileInput.click());

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });

        // File selection
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // Handle file
        function handleFile(file) {
            // Reset
            errorDiv.classList.remove('show');
            resultArea.classList.remove('show');
            
            // Show file info
            fileName.textContent = file.name;
            fileDetails.textContent = \`Tipo: \${file.type || 'unknown'} | Tamanho: \${formatBytes(file.size)}\`;
            fileInfo.classList.add('show');

            // Show loading
            loading.classList.add('show');

            // Convert to base64
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result;
                
                // Hide loading
                loading.classList.remove('show');
                
                // Show result
                resultBox.textContent = base64;
                resultArea.classList.add('show');
            };
            reader.onerror = function() {
                loading.classList.remove('show');
                errorDiv.textContent = 'Erro ao ler o arquivo. Tente novamente.';
                errorDiv.classList.add('show');
            };
            reader.readAsDataURL(file);
        }

        // Copy to clipboard
        copyBtn.addEventListener('click', () => {
            const text = resultBox.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ Copiado!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        });

        // Format bytes
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
    </script>
</body>
</html>
  `;
  
  res.send(html);
}

module.exports = {
  transcribeAudio,
  fileToBase64Page,
  resetUserHistory
}
