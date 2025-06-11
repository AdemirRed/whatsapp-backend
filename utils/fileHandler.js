const fs = require('fs')
const mime = require('mime-types')
const path = require('path')

/**
 * Função para codificar um arquivo corretamente em base64
 * @param {string} filePath - Caminho do arquivo a ser codificado
 * @returns {Object} Objeto contendo dados do arquivo codificado
 */
function encodeFileToBase64 (filePath) {
  try {
    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`)
    }

    // Lê o arquivo como buffer
    const fileBuffer = fs.readFileSync(filePath)

    // Codifica o buffer para base64
    const fileBase64 = fileBuffer.toString('base64')

    // Obtém o tipo MIME baseado na extensão do arquivo
    const mimeType = mime.lookup(filePath) || 'application/octet-stream'

    // Obtém o nome do arquivo
    const fileName = path.basename(filePath)

    return {
      fileName,
      mimeType,
      data: fileBase64
    }
  } catch (error) {
    console.error('Erro ao codificar o arquivo:', error)
    throw error
  }
}

/**
 * Função para criar um objeto de mensagem de mídia compatível com whatsapp-web.js
 * @param {string} filePath - Caminho do arquivo a ser enviado
 * @returns {Object} Objeto formatado para envio via whatsapp-web.js
 */
function createMediaMessage (filePath) {
  const fileData = encodeFileToBase64(filePath)

  return {
    mimetype: fileData.mimeType,
    filename: fileData.fileName,
    data: fileData.data
  }
}

module.exports = {
  encodeFileToBase64,
  createMediaMessage
}
