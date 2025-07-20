const app = require('./src/app')
const { baseWebhookURL } = require('./src/config')
const { checkSessions } = require('./check-sessions')
require('dotenv').config()

// Start the server
// No Render, a porta é sempre definida pela variável PORT
const port = process.env.PORT || 3000

console.log(`Starting server on port: ${port}`)
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`Base Webhook URL: ${baseWebhookURL}`)
console.log(`Sessions Path: ${process.env.SESSIONS_PATH || './sessions'}`)
console.log(`Recover Sessions: ${process.env.RECOVER_SESSIONS || 'FALSE'}`)

// Verificar sessões existentes
try {
  console.log('\n📋 Verificando sessões existentes...')
  checkSessions()
} catch (error) {
  console.log('⚠️ Erro na verificação de sessões:', error.message)
}

// Check if BASE_WEBHOOK_URL environment variable is available
if (!baseWebhookURL) {
  console.error('BASE_WEBHOOK_URL environment variable is not available. Exiting...')
  process.exit(1) // Terminate the application with an error code
}

app.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port ${port}`)
  console.log(`📊 Health check available at: http://localhost:${port}/ping`)
  console.log(`📖 Swagger docs available at: http://localhost:${port}/api-docs`)
  console.log(`🔗 Webhook callback: http://localhost:${port}/localCallbackExample`)
  
  if (process.env.NODE_ENV === 'production') {
    console.log('\n🔄 Produção detectada - sessões serão persistidas')
    console.log('💾 Para verificar sessões, acesse: /ping')
  }
})
