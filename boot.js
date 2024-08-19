require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const { Client, LocalAuth } = require('whatsapp-web.js')
const { triggerWebhook } = require('./src/utils')
const { baseWebhookURL } = require('./src/config')

const app = express()
const PORT = process.env.PORT || 200

app.use(bodyParser.json())

// Inicializa o cliente WhatsApp com autenticação local (persistente)
const client = new Client({
  authStrategy: new LocalAuth()
})

// Confirma quando a sessão é autenticada
client.on('ready', () => {
  console.log('Cliente WhatsApp está pronto!')
})

// Captura falhas na autenticação
client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação', msg)
})

// Inicializa o cliente WhatsApp
client.initialize()

function sendMessage (to, body) {
  client.sendMessage(to, body)
    .then(response => {
      console.log('Mensagem enviada:', response)
    })
    .catch(error => {
      console.error('Erro ao enviar mensagem:', error)
    })
}

// Verifica se a variável de ambiente BASE_WEBHOOK_URL está disponível
if (!baseWebhookURL) {
  console.error('BASE_WEBHOOK_URL environment variable is not available. Exiting...')
  process.exit(1) // Terminate the application with an error code
}

app.post('/client/sendMessage', (req, res) => {
  const { to, body } = req.body

  // Envia a mensagem usando o cliente WhatsApp
  sendMessage(to, body)

  // Resposta de sucesso
  res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso' })
})

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`)
})

// Array com as variações de saudações
const saudacoes = ['oi', 'oii', 'oiii', 'eae', 'eai', 'olá', 'boa noite', 'bom dia', 'boa tarde', 'ola', 'oiie', 'ola!', 'ola!']

// Escuta mensagens recebidas e responde automaticamente
client.on('message', msg => {
  console.log('Mensagem recebida:', msg.body)

  const mensagemRecebida = msg.body.toLowerCase().trim()

  // Verifica se a mensagem recebida está incluída nas saudações
  if (saudacoes.includes(mensagemRecebida)) {
    sendMessage(msg.from, 'Olá! Como posso ajudar?')
  } else {
    sendMessage(msg.from, 'Desculpe, não entendi sua mensagem.')
  }
})
