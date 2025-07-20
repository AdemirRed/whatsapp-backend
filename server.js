const app = require('./src/app')
const { baseWebhookURL } = require('./src/config')
const fs = require('fs')
require('dotenv').config()

// Start the server
const port = process.env.PORT || 3000

console.log(`Starting server on port: ${port}`)
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`Base Webhook URL: ${baseWebhookURL}`)
console.log(`Sessions Path: ${process.env.SESSIONS_PATH || './sessions'}`)

// Verificar e criar diretório de sessões
const sessionsPath = process.env.SESSIONS_PATH || './sessions'
console.log(`\n🔍 Verificando diretório de sessões: ${sessionsPath}`)

try {
  if (!fs.existsSync(sessionsPath)) {
    console.log(`📁 Criando diretório: ${sessionsPath}`)
    fs.mkdirSync(sessionsPath, { recursive: true })
    console.log(`✅ Diretório criado com sucesso`)
  } else {
    console.log(`✅ Diretório já existe`)
  }
  
  // Verificar permissões
  const testFile = `${sessionsPath}/.test-write`
  fs.writeFileSync(testFile, 'test')
  fs.unlinkSync(testFile)
  console.log(`✅ Permissões de escrita: OK`)
  
  // Listar conteúdo
  const files = fs.readdirSync(sessionsPath)
  console.log(`📊 Arquivos no diretório: ${files.length}`)
  if (files.length > 0) {
    files.forEach(file => console.log(`   - ${file}`))
  }
  
} catch (error) {
  console.error(`❌ Erro com diretório de sessões: ${error.message}`)
}

// Check if BASE_WEBHOOK_URL environment variable is available
if (!baseWebhookURL) {
  console.error('BASE_WEBHOOK_URL environment variable is not available. Exiting...')
  process.exit(1) // Terminate the application with an error code
}

app.listen(port, () => {
  console.log(`\n🚀 Server running on port ${port}`)
  console.log(`📊 Health check: http://localhost:${port}/ping`)
  console.log(`📖 API docs: http://localhost:${port}/api-docs`)
})
