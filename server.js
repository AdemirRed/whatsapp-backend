const app = require('./src/app')
const { baseWebhookURL, enableSwaggerEndpoint, globalApiKey } = require('./src/config')
require('dotenv').config()

// Start the server
const port = process.env.PORT || 3000

// Check if BASE_WEBHOOK_URL environment variable is available
if (!baseWebhookURL) {
  console.error('BASE_WEBHOOK_URL environment variable is not available. Exiting...')
  process.exit(1) // Terminate the application with an error code
}

app.listen(port, () => {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 WhatsApp Web API - Server iniciado com sucesso!')
  console.log('='.repeat(60))
  console.log(`📍 Porta: ${port}`)
  console.log(`🌐 URL Base: http://localhost:${port}`)
  console.log(`🔗 Webhook URL: ${baseWebhookURL}`)
  console.log(`🔑 API Key configurada: ${globalApiKey ? '✓ Sim' : '✗ Não'}`)
  
  if (enableSwaggerEndpoint) {
    console.log(`📚 Documentação Swagger: http://localhost:${port}/api-docs`)
  }
  
  console.log('\n📋 Endpoints principais:')
  console.log(`   - Listar sessões: GET http://localhost:${port}/session/list`)
  console.log(`   - Iniciar sessão: GET http://localhost:${port}/session/start/:sessionId`)
  console.log(`   - Status sessão: GET http://localhost:${port}/session/status/:sessionId`)
  console.log(`   - QR Code: GET http://localhost:${port}/session/qr/:sessionId`)
  console.log(`   - Enviar mensagem: POST http://localhost:${port}/client/sendMessage/:sessionId`)
  
  console.log('\n💡 Dica: Use x-api-key: ' + (globalApiKey || 'sua-chave') + ' no header das requisições')
  console.log('='.repeat(60) + '\n')
})
