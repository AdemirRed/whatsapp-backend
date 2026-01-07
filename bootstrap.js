const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('================================')
console.log('   WhatsApp Web API - Setup')
console.log('================================')
console.log()

// Verificar se node_modules existe
if (!fs.existsSync('./node_modules')) {
  console.log('📦 Instalando dependências pela primeira vez...')
  console.log('⏳ Isso pode demorar alguns minutos...')
  try {
    execSync('npm install --production', { stdio: 'inherit' })
    console.log('✅ Dependências instaladas com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao instalar dependências:', error.message)
    process.exit(1)
  }
}

console.log('🚀 Iniciando servidor...')
console.log()

// Iniciar servidor principal
require('./server.js')