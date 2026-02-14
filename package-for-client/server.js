const app = require('./src/app')
const { baseWebhookURL, enableSwaggerEndpoint, globalApiKey } = require('./src/config')
require('dotenv').config()

// Start the server
const port = process.env.PORT || 3000

// Validar API_KEY (OBRIGATÓRIA para segurança)
if (!globalApiKey || globalApiKey.trim() === '') {
  console.error('\n' + '='.repeat(60))
  console.error('❌ ERRO CRÍTICO: API_KEY não configurada!')
  console.error('='.repeat(60))
  console.error('⚠️  A API_KEY é OBRIGATÓRIA para proteger seus endpoints!')
  console.error('⚠️  Sem ela, qualquer pessoa pode acessar e controlar sua API.')
  console.error('\n📝 Configure no arquivo .env:')
  console.error('   API_KEY=sua-chave-secreta-aqui')
  console.error('\n🚫 Servidor NÃO SERÁ INICIADO sem API_KEY configurada.')
  console.error('='.repeat(60) + '\n')
  process.exit(1)
}

// Check if BASE_WEBHOOK_URL environment variable is available (OPCIONAL)
if (!baseWebhookURL) {
  console.warn('⚠️ BASE_WEBHOOK_URL não configurado')
  console.warn('ℹ️ O servidor funcionará normalmente, mas eventos não serão enviados para webhooks')
}

app.listen(port, () => {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 WhatsApp Web API - Server iniciado com sucesso!')
  console.log('='.repeat(60))
  console.log(`📍 Porta: ${port}`)
  console.log(`🌐 URL Base: http://localhost:${port}`)
  console.log(`🔗 Webhook URL: ${baseWebhookURL || '(não configurado)'}`)
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
