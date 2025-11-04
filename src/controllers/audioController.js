const { validateSession, sessions } = require('../sessions')
const { sendErrorResponse } = require('../utils')
const fs = require('fs').promises
const path = require('path')

const BIPTEXT_NUMBER = '553172280540@c.us'
const TRANSCRIPTION_HEADER = 'Transcrição ✏️'

// Store para controlar o estado das conversas com BipText
const conversationState = new Map()

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

    // Enviar primeira mensagem para iniciar o fluxo e gerenciar conversação
    const conversationKey = `${sessionId}_${Date.now()}`
    conversationState.set(conversationKey, {
      step: 0,
      sessionId,
      startTime: Date.now(),
      audioMedia, // Armazenar o áudio para enviar depois
      audioSent: false
    })

    // Configurar listener para mensagens do BipText
    const messageHandler = async (message) => {
      try {
        // Verificar se a mensagem é do BipText
        if (message.from !== BIPTEXT_NUMBER) return
        
        // Buscar conversação ativa para esta sessão
        let activeConversation = null
        for (const [key, conv] of conversationState.entries()) {
          if (conv.sessionId === sessionId && Date.now() - conv.startTime < 300000) { // 5 minutos timeout
            activeConversation = { key, ...conv }
            break
          }
        }
        
        if (!activeConversation) return

        const messageText = message.body || ''
        const step = activeConversation.step

        console.log(`BipText response - Step ${step}: "${messageText}"`)

        if (step === 0) {
          // CENÁRIO 1: Primeira vez - Mensagem de boas-vindas
          if (messageText.includes('Olá') || 
              messageText.includes('Contato Inteligente') ||
              messageText.includes('transformar áudios') ||
              messageText.includes('Concordo')) {
            console.log('First time user - Sending "Concordo" response')
            await message.reply('Concordo')
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 1
            })
          }
          // CENÁRIO 2: Usuário com histórico - Direto para transcrição
          else if (messageText.includes('Um momento, já estou transcrevendo') || 
                   messageText.includes('transcrevendo')) {
            console.log('Existing user - Audio being transcribed, waiting...')
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 3
            })
          }
          // CENÁRIO 3: Receber transcrição diretamente (usuário com histórico)
          else if (messageText.includes(TRANSCRIPTION_HEADER)) {
            console.log('Existing user - Received transcription directly')
            const rawTranscription = messageText.replace(TRANSCRIPTION_HEADER, '').trim()
            const cleanedTranscription = cleanTranscriptionText(rawTranscription)
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 4,
              transcription: cleanedTranscription,
              completed: true
            })
            console.log('Transcription completed:', cleanedTranscription)
          }
        } else if (step === 1) {
          // Segunda mensagem: Confirmação - Responder "Permito"
          console.log('Sending "Permito" response')
          await message.reply('Permito')
          conversationState.set(activeConversation.key, {
            ...activeConversation,
            step: 2
          })
        } else if (step === 2) {
          // Terceira mensagem: "Já estou ouvindo" - ENVIAR ÁUDIO AGORA
          if (messageText.includes('Já estou ouvindo') || 
              messageText.includes('ouvindo') ||
              messageText.includes('Pode me enviar')) {
            console.log('BipText ready to receive audio, sending now...')
            try {
              await session.sendMessage(BIPTEXT_NUMBER, activeConversation.audioMedia)
              conversationState.set(activeConversation.key, {
                ...activeConversation,
                step: 3,
                audioSent: true
              })
            } catch (error) {
              console.error('Error sending audio:', error)
            }
          }
          // Aguardar status de transcrição
          else if (messageText.includes('Um momento, já estou transcrevendo') || 
                   messageText.includes('transcrevendo')) {
            console.log('Audio being transcribed, waiting...')
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 3
            })
          }
          // Receber transcrição diretamente
          else if (messageText.includes(TRANSCRIPTION_HEADER)) {
            const rawTranscription = messageText.replace(TRANSCRIPTION_HEADER, '').trim()
            const cleanedTranscription = cleanTranscriptionText(rawTranscription)
            conversationState.set(activeConversation.key, {
              ...activeConversation,
              step: 4,
              transcription: cleanedTranscription,
              completed: true
            })
            console.log('Transcription completed:', cleanedTranscription)
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
            
            console.log('Transcription completed:', cleanedTranscription)
          }
        }
      } catch (error) {
        console.error('Error in BipText message handler:', error)
      }
    }

    // Registrar listener temporário
    session.on('message', messageHandler)

    // ENVIAR MENSAGEM INICIAL para iniciar o fluxo
    // Se for primeira vez: vai receber boas-vindas
    // Se for usuário existente: vai direto para transcrição
    await session.sendMessage(BIPTEXT_NUMBER, audioMedia)

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
          // Limpar conversação
          for (const [key, conv] of conversationState.entries()) {
            if (conv.sessionId === sessionId) {
              conversationState.delete(key)
            }
          }
          reject(new Error('Transcription timeout - BipText did not respond in time'))
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
  fileToBase64Page
}
