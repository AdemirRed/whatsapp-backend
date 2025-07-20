const fs = require('fs')
const qrcode = require('qrcode-terminal')
const { exec } = require('child_process')
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
 * Health check endpoint with system information
 *
 * @function health
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - Promise that resolves once response is sent
 */
const health = async (req, res) => {
  /*
    #swagger.tags = ['Various']
  */
  try {
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sessionsPath: sessionFolderPath,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    }

    // Verificar informações do diretório de sessões
    try {
      const sessionsStats = fs.statSync(sessionFolderPath)
      const sessionFiles = fs.readdirSync(sessionFolderPath)
      
      healthInfo.sessionDirectory = {
        exists: true,
        isDirectory: sessionsStats.isDirectory(),
        filesCount: sessionFiles.length,
        files: sessionFiles.slice(0, 10), // Primeiros 10 arquivos
        created: sessionsStats.birthtime,
        modified: sessionsStats.mtime
      }
    } catch (error) {
      healthInfo.sessionDirectory = {
        exists: false,
        error: error.message
      }
    }

    // Verificar informações do disco (Linux)
    if (process.platform === 'linux') {
      exec('df -h /app/sessions 2>/dev/null', (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.trim().split('\n')
          if (lines.length > 1) {
            const diskInfo = lines[1].split(/\s+/)
            healthInfo.diskInfo = {
              filesystem: diskInfo[0],
              size: diskInfo[1],
              used: diskInfo[2],
              available: diskInfo[3],
              usePercent: diskInfo[4],
              mountPoint: diskInfo[5]
            }
          }
        }
      })
    }

    res.json(healthInfo)
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

module.exports = { ping, health, localCallbackExample }
