const express = require('express')
const router = express.Router()
const { createMediaMessage } = require('../utils/fileHandler')

// Rota para enviar uma mensagem com arquivo
router.post('/send-file', async (req, res) => {
  try {
    const { number, caption, filePath } = req.body

    if (!number || !filePath) {
      return res.status(400).json({ status: 'error', message: 'Número de telefone e caminho do arquivo são obrigatórios' })
    }

    // Formata o número
    const formattedNumber = `${number}@c.us`

    // Cria o objeto de mídia usando nosso utilitário
    const media = createMediaMessage(filePath)

    // Envia a mensagem com a mídia
    const result = await client.sendMessage(formattedNumber, media, { caption })

    return res.status(200).json({
      status: 'success',
      message: 'Arquivo enviado com sucesso',
      data: result
    })
  } catch (error) {
    console.error('Erro ao enviar arquivo:', error)
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao enviar arquivo',
      error: error.toString()
    })
  }
})

module.exports = router
