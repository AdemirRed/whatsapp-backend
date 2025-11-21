require('./routes')
const { restoreSessions } = require('./sessions')
const { routes } = require('./routes')
const app = require('express')()
const bodyParser = require('body-parser')
const { maxAttachmentSize } = require('./config')

// Initialize Express app
app.disable('x-powered-by')

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

restoreSessions()

module.exports = app
