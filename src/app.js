require('./routes')
const { restoreSessions } = require('./sessions')
const { routes } = require('./routes')
const app = require('express')()
const bodyParser = require('body-parser')
const { maxAttachmentSize } = require('./config')

// Initialize Express app
app.disable('x-powered-by')

// CORS: necessário para acessar a API via navegador quando o front estiver em outra origem
// (ex: acessando a UI por IP na rede, ou em outra porta). Libera também o preflight (OPTIONS).
app.use((req, res, next) => {
  const origin = req.headers.origin

  // Se vier de um navegador, refletimos a origem (mais compatível do que '*')
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, x-api-key')

  // Responder preflight rapidamente
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  next()
})

// Configurar timeout para requisições longas (3 minutos para transcrições)
app.use((req, res, next) => {
  if (req.path.includes('/transcribe')) {
    req.setTimeout(180000) // 3 minutos para transcrições
    res.setTimeout(180000)
  }
  next()
})

app.use(bodyParser.json({ limit: maxAttachmentSize + 1000000 }))
app.use(bodyParser.urlencoded({ limit: maxAttachmentSize + 1000000, extended: true }))
app.use('/', routes)

// Em testes (Jest), não restaurar sessões automaticamente.
// Motivo: abre Chromium/WhatsApp e pode manter arquivos bloqueados no Windows,
// quebrando o cleanup do diretório de sessões no afterAll.
if (process.env.NODE_ENV !== 'test') {
  restoreSessions()
}

module.exports = app
