const app = require('./src/app')
const { baseWebhookURL } = require('./src/config')
const { sessionManager } = require('./src/sessionManager')
require('dotenv').config()

// Start the server
// No Render, a porta é sempre definida pela variável PORT
const port = process.env.PORT || 3000

console.log(`Starting server on port: ${port}`)
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`Base Webhook URL: ${baseWebhookURL}`)
console.log(`Sessions Path: ${process.env.SESSIONS_PATH || './sessions'}`)
console.log(`Recover Sessions: ${process.env.RECOVER_SESSIONS || 'FALSE'}`)

// Inicializar SessionManager
console.log('\n🔧 Inicializando SessionManager...')
try {
  const status = sessionManager.getStatus()
  console.log('📊 Status das sessões:')
  console.log(`   - Caminho: ${status.sessionsPath}`)
  console.log(`   - Produção: ${status.isProduction}`)
  console.log(`   - Diretório existe: ${status.directoryExists}`)
  console.log(`   - Pode escrever: ${status.canWrite}`)
  console.log(`   - Sessões encontradas: ${status.sessionCount}`)

  // Limpar sessões antigas (opcional)
  if (process.env.CLEANUP_OLD_SESSIONS === 'TRUE') {
    sessionManager.cleanupOldSessions(7)
  }

} catch (error) {
  console.log('⚠️ Erro na inicialização do SessionManager:', error.message)
}

// Check if BASE_WEBHOOK_URL environment variable is available
if (!baseWebhookURL) {
  console.error('BASE_WEBHOOK_URL environment variable is not available. Exiting...')
  process.exit(1) // Terminate the application with an error code
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port ${port}`)
  console.log(`📊 Health check available at: http://localhost:${port}/ping`)
  console.log(`📖 Swagger docs available at: http://localhost:${port}/api-docs`)
  console.log(`🔗 Webhook callback: http://localhost:${port}/localCallbackExample`)
  
  if (process.env.NODE_ENV === 'production') {
    console.log('\n🔄 Produção detectada - sessões serão persistidas')
    console.log('💾 Persistent Disk deve estar montado em /app/sessions')
    
    // Verificar periodicamente se as sessões estão sendo salvas
    setInterval(() => {
      const status = sessionManager.getStatus()
      if (status.sessionCount > 0) {
        console.log(`💾 Sessões ativas: ${status.sessionCount}`)
        sessionManager.syncSessions() // Forçar sync periodicamente
      }
    }, 30000) // A cada 30 segundos
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Recebido SIGTERM, fechando servidor graciosamente...')
  
  try {
    sessionManager.syncSessions()
    console.log('💾 Sessões sincronizadas antes do shutdown')
  } catch (error) {
    console.error('❌ Erro ao sincronizar sessões:', error.message)
  }
  
  server.close(() => {
    console.log('✅ Servidor fechado')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('\n🛑 Recebido SIGINT, fechando servidor...')
  
  try {
    sessionManager.syncSessions()
    console.log('💾 Sessões sincronizadas antes do shutdown')
  } catch (error) {
    console.error('❌ Erro ao sincronizar sessões:', error.message)
  }
  
  server.close(() => {
    console.log('✅ Servidor fechado')
    process.exit(0)
  })
})
