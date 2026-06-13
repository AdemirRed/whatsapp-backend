const axios = require('axios')
const { globalApiKey, disabledCallbacks, verboseLogs, additionalWebhooks, localWebhookEnabled, localWebhookURL } = require('./config')

// Trigger webhook endpoint com tratamento melhorado de erros e suporte a múltiplos destinos
const triggerWebhook = (webhookURL, sessionId, dataType, data) => {
  // Lista de todos os webhooks a serem chamados (apenas se não vazio)
  let webhooks = []
  if (webhookURL) {
    if (Array.isArray(webhookURL)) {
      webhooks = [...webhookURL]
    } else {
      webhooks = [webhookURL]
    }
  }
  
  // Adicionar webhooks adicionais
  if (additionalWebhooks && additionalWebhooks.length > 0) {
    webhooks.push(...additionalWebhooks)
  }
  
  // Adicionar webhook local se habilitado
  if (localWebhookEnabled && localWebhookURL && !webhooks.includes(localWebhookURL)) {
    webhooks.push(localWebhookURL)
  }
  
  // Remover duplicatas e valores vazios
  const uniqueWebhooks = [...new Set(webhooks)].filter(url => typeof url === 'string' && url.trim())
  
  // Se não houver webhooks configurados, apenas retornar
  if (uniqueWebhooks.length === 0) {
    if (verboseLogs) {
      console.log(`⚠️ [Webhook] Nenhum webhook configurado para ${dataType}`)
    }
    return Promise.resolve()
  }
  
  if (verboseLogs) {
    console.log(`📤 [Webhook] ${dataType} → ${uniqueWebhooks.length} destino(s)`)
  }
  
  // Enviar para todos os webhooks em paralelo
  const promises = uniqueWebhooks.map(url => {
    return axios.post(url, { dataType, data, sessionId }, { 
      headers: { 'x-api-key': globalApiKey },
      timeout: 5000 // Timeout de 5 segundos para evitar travamentos
    })
      .then(response => {
        if (verboseLogs) {
          console.log(`✅ [Webhook] ${dataType} → ${url.split('/').slice(-2).join('/')}`)
        }
      })
      .catch(error => {
        // Ignorar erros comuns de webhook para não poluir o log
        const ignorableErrors = [
          'ECONNREFUSED',     // Servidor webhook não está rodando
          'ECONNRESET',       // Conexão resetada pelo servidor
          'ETIMEDOUT',        // Timeout na conexão
          'timeout',          // Timeout do axios
          'socket hang up',   // Conexão encerrada
          'ERR_NETWORK'       // Erro genérico de rede
        ]
        
        const shouldIgnore = ignorableErrors.some(err => error.message.includes(err)) ||
                            error.response?.status === 404 ||
                            error.response?.status === 500 // Ignorar erro 500 do webhook externo
        
        if (!shouldIgnore) {
          console.error(`❌ [Webhook Error] ${url.split('/').slice(-2).join('/')} - ${dataType}:`, error.message)
        } else if (verboseLogs) {
          console.log(`⚠️ [Webhook] ${url.split('/').slice(-2).join('/')} - ${dataType}: ${error.message.substring(0, 50)}`)
        }
        // Não propagar o erro para não afetar o fluxo principal
      })
  })
  
  // Retornar Promise.all mas não propagar erros
  return Promise.allSettled(promises)
}

// Function to send a response with error status and message
const sendErrorResponse = (res, status, message) => {
  res.status(status).json({ success: false, error: message })
}

// Function to wait for a specific item not to be null
const waitForNestedObject = (rootObj, nestedPath, maxWaitTime = 60000, interval = 100) => {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const checkObject = () => {
      const nestedObj = nestedPath.split('.').reduce((obj, key) => obj ? obj[key] : undefined, rootObj)
      if (nestedObj) {
        // Nested object exists, resolve the promise
        resolve()
      } else if (Date.now() - start > maxWaitTime) {
        // Maximum wait time exceeded, reject the promise
        console.log('Timed out waiting for nested object')
        reject(new Error('Timeout waiting for nested object'))
      } else {
        // Nested object not yet created, continue waiting
        setTimeout(checkObject, interval)
      }
    }
    checkObject()
  })
}

const checkIfEventisEnabled = (event) => {
  return new Promise((resolve, reject) => { if (!disabledCallbacks.includes(event)) { resolve() } })
}

/**
 * Aplica patch para corrigir erro markedUnread no WhatsApp Web
 * @param {Object} client - Cliente do whatsapp-web.js
 * @param {string} sessionId - ID da sessão (para logs)
 * @returns {Promise<boolean>} - true se patch aplicado com sucesso
 */
const applyMarkedUnreadPatch = async (client, sessionId = 'unknown') => {
  try {
    if (!client.pupPage || client.pupPage.isClosed()) {
      console.log(`⚠️ Página não disponível para aplicar patch em ${sessionId}`)
      return false
    }
    
    await client.pupPage.evaluate(() => {
      // Override da função sendSeen para evitar erro de markedUnread
      if (window.WWebJS && window.WWebJS.sendSeen) {
        const originalSendSeen = window.WWebJS.sendSeen
        window.WWebJS.sendSeen = async function(chatId) {
          try {
            return await originalSendSeen.call(this, chatId)
          } catch (error) {
            // Silenciar erros de markedUnread
            if (error.message && error.message.includes('markedUnread')) {
              console.log('⚠️ Erro markedUnread suprimido no sendSeen')
              return true
            }
            throw error
          }
        }
      }
      
      // Patch adicional para Store.sendSeen se existir
      if (window.Store && window.Store.sendSeen) {
        const originalStoreSendSeen = window.Store.sendSeen
        window.Store.sendSeen = async function(chat, checkUnread) {
          try {
            return await originalStoreSendSeen.call(this, chat, checkUnread)
          } catch (error) {
            if (error.message && error.message.includes('markedUnread')) {
              console.log('⚠️ Erro markedUnread suprimido no Store.sendSeen')
              return true
            }
            throw error
          }
        }
      }
    })
    
    if (verboseLogs) {
      console.log(`🔧 Patch markedUnread aplicado com sucesso em ${sessionId}`)
    }
    return true
  } catch (error) {
    console.log(`⚠️ Não foi possível aplicar patch markedUnread em ${sessionId}:`, error.message)
    return false
  }
}

module.exports = {
  triggerWebhook,
  sendErrorResponse,
  waitForNestedObject,
  checkIfEventisEnabled,
  applyMarkedUnreadPatch
}
