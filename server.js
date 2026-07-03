const app = require('./src/app')
const { baseWebhookURL, enableSwaggerEndpoint, globalApiKey, localWebhookEnabled, localWebhookURL } = require('./src/config')
require('dotenv').config()

// Handlers globais de erros não capturados para evitar crashes
process.on('unhandledRejection', (reason, promise) => {
  const reasonMessage = reason && reason.message ? reason.message : String(reason)

  if (reasonMessage.includes('Execution context was destroyed')) {
    console.warn('⚠️ Unhandled Rejection suprimido: contexto do Puppeteer foi destruído durante navegação/reload da sessão.')
    return
  }

  console.error('❌ Erro não tratado (Unhandled Rejection):', reason)
  console.error('Promise:', promise)
  // Não encerrar o processo, apenas logar o erro
})

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada (Uncaught Exception):', error)
  // Se for erro de execução de contexto, não crashar o servidor
  if (error.message && error.message.includes('Execution context was destroyed')) {
    console.log('⚠️ Erro de contexto de execução detectado, mas servidor continua rodando...')
    return
  }
  // Para outros erros críticos, pode ser necessário reiniciar
  console.error('⚠️ Erro crítico detectado. Servidor continua rodando, mas recomenda-se verificar os logs.')
})

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

// Validar webhook (OPCIONAL): avisar se não houver webhook configurado
if (!baseWebhookURL && !(localWebhookEnabled && localWebhookURL)) {
  console.warn('⚠️ Nenhum webhook configurado!')
  console.warn('ℹ️ O servidor funcionará normalmente, mas eventos não serão enviados para webhooks')
  console.warn('ℹ️ Para habilitar webhooks, configure BASE_WEBHOOK_URL ou ative LOCAL_WEBHOOK_ENABLED com LOCAL_WEBHOOK_URL')
}

// Avisar se estiver usando apenas webhook local
if (!baseWebhookURL && localWebhookEnabled) {
  console.log('⚠️ Rodando apenas com webhook local (modo debug)')
}

app.listen(port, () => {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 WhatsApp Web API - Server iniciado com sucesso!')
  console.log('='.repeat(60))
  console.log(`📍 Porta: ${port}`)
  console.log(`🌐 URL Base: http://localhost:${port}`)
  console.log(`🔗 Webhook URL: ${baseWebhookURL || '(desabilitado)'}`)
  if (localWebhookEnabled && localWebhookURL) {
    console.log(`🔗 Webhook Local: ${localWebhookURL} ✓`)
  }
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
