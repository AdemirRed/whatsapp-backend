const fs = require('fs')
const qrcode = require('qrcode-terminal')
const { sessionFolderPath } = require('../config')
const { sendErrorResponse } = require('../utils')

/**
 * Responds to ping request with 'pong'
 *
 * @function ping
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - Promise that resolves once response is sent
 * @throws {Object} - Throws error if response fails
 */
const ping = async (req, res) => {
  /*
    #swagger.tags = ['Various']
  */
  try {
    res.json({ success: true, message: 'pong' })
  } catch (error) {
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Example local callback function that generates a QR code and writes a log file
 *
 * @function localCallbackExample
 * @async
 * @param {Object} req - Express request object containing a body object with dataType and data
 * @param {string} req.body.dataType - Type of data (in this case, 'qr')
 * @param {Object} req.body.data - Data to generate a QR code from
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - Promise that resolves once response is sent
 * @throws {Object} - Throws error if response fails
 */
const localCallbackExample = async (req, res) => {
  /*
    #swagger.tags = ['Various']
  */
  try {
    const { dataType, data } = req.body
    if (dataType === 'qr') { qrcode.generate(data.qr, { small: true }) }
    fs.writeFile(`${sessionFolderPath}/message_log.txt`, `${JSON.stringify(req.body)}\r\n`, { flag: 'a+' }, _ => _)
    res.json({ success: true })
  } catch (error) {
    console.log(error)
    fs.writeFile(`${sessionFolderPath}/message_log.txt`, `(ERROR) ${JSON.stringify(error)}\r\n`, { flag: 'a+' }, _ => _)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Handler local para webhooks de debug
 * Registra todos os eventos recebidos em um arquivo de log
 *
 * @function localWebhookHandler
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const localWebhookHandler = async (req, res) => {
  /*
    #swagger.tags = ['Various']
    #swagger.summary = 'Local webhook handler for debugging'
    #swagger.description = 'Endpoint que recebe e registra todos os eventos de webhook para debug local'
  */
  try {
    const { dataType, data, sessionId } = req.body
    const timestamp = new Date().toISOString()
    
    // Log formatado no console
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🔔 [WEBHOOK LOCAL] ${timestamp}`)
    console.log(`📱 Sessão: ${sessionId}`)
    console.log(`📋 Tipo: ${dataType}`)
    console.log(`${'='.repeat(60)}`)
    
    // Log detalhado em arquivo
    const logEntry = {
      timestamp,
      sessionId,
      dataType,
      data
    }
    
    const logFile = `${sessionFolderPath}/webhook_local_log.txt`
    const logLine = `${JSON.stringify(logEntry, null, 2)}\n${'='.repeat(80)}\n`
    
    fs.writeFile(logFile, logLine, { flag: 'a+' }, (err) => {
      if (err) console.error('Erro ao escrever log:', err)
    })
    
    // QR code no terminal para facilitar
    if (dataType === 'qr' && data?.qr) {
      console.log('\n📱 QR Code para conexão:\n')
      qrcode.generate(data.qr, { small: true })
    }
    
    // Logs específicos por tipo de evento
    if (dataType === 'message' && data?.message) {
      const msg = data.message
      console.log(`💬 Mensagem de: ${msg.from}`)
      console.log(`📝 Conteúdo: ${msg.body}`)
    }
    
    if (dataType === 'ready') {
      console.log('✅ Cliente conectado e pronto!')
    }
    
    res.json({ 
      success: true, 
      received: true,
      timestamp,
      message: 'Webhook recebido e registrado'
    })
  } catch (error) {
    console.error('❌ Erro no webhook local:', error.message)
    fs.writeFile(
      `${sessionFolderPath}/webhook_local_log.txt`, 
      `(ERROR) ${new Date().toISOString()} - ${JSON.stringify(error)}\r\n`, 
      { flag: 'a+' }, 
      _ => _
    )
    res.status(200).json({ success: false, error: error.message })
  }
}

module.exports = { ping, localCallbackExample, localWebhookHandler }
