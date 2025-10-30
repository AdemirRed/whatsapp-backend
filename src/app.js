require('./routes')
const { restoreSessions } = require('./sessions')
const { routes } = require('./routes')
const express = require('express') // Adicionado para lidar com CORS
const cors = require('cors') // Adicionado para lidar com CORS
const path = require('path') // Para lidar com caminhos de arquivos
const app = express()
const bodyParser = require('body-parser')
const { maxAttachmentSize } = require('./config')

// Initialize Express app
app.disable('x-powered-by')
app.use(cors()) // Adicionado para lidar com CORS
app.use(bodyParser.json({ limit: maxAttachmentSize + 1000000 }))
app.use(bodyParser.urlencoded({ limit: maxAttachmentSize + 1000000, extended: true }))

// Servir arquivos estáticos (CSS, JS, imagens)
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')))

// Rota para servir o index.html na raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'))
})

// API routes
app.use('/', routes)

restoreSessions()

module.exports = app
