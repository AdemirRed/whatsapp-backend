const axios = require('axios')
const { globalApiKey, disabledCallbacks, verboseLogs } = require('./config')

// Trigger webhook endpoint com tratamento melhorado de erros
const triggerWebhook = (webhookURL, sessionId, dataType, data) => {
  // Se não houver webhook configurado, apenas retornar
  if (!webhookURL || !webhookURL.trim()) {
    if (verboseLogs) {
      console.log(`⚠️ [Webhook] Nenhum webhook configurado para ${dataType}`)
    }
    return Promise.resolve()
  }
  
  if (verboseLogs) {
    console.log(`📤 [Webhook] ${dataType} → ${webhookURL.split('/').pop()}`)
  }
  
  return axios.post(webhookURL, { dataType, data, sessionId }, { 
    headers: { 'x-api-key': globalApiKey },
    timeout: 5000 // Timeout de 5 segundos para evitar travamentos
  })
    .then(response => {
      if (verboseLogs) {
        console.log(`✅ [Webhook] ${dataType} enviado`)
      }
    })
    .catch(error => {
      // Apenas logar erros relevantes (não 404 ou timeouts menores)
      if (error.response?.status !== 404 && !error.message.includes('timeout')) {
        console.error(`❌ [Webhook Error] ${sessionId} - ${dataType}:`, error.message)
      }
      // Não propagar o erro para não afetar o fluxo principal
    })
}

// Function to send a response with error status and message
const sendErrorResponse = (res, status, message) => {
  res.status(status).json({ success: false, error: message })
}

// Function to wait for a specific item not to be null
const waitForNestedObject = (rootObj, nestedPath, maxWaitTime = 10000, interval = 100) => {
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

module.exports = {
  triggerWebhook,
  sendErrorResponse,
  waitForNestedObject,
  checkIfEventisEnabled
}
