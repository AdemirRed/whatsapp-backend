const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0', autoBody: false })

const outputFile = './swagger.json'
const endpointsFiles = ['./src/routes.js']

const doc = {
  info: {
    title: 'WhatsApp API',
    description: 'API Wrapper for WhatsAppWebJS'
  },
  servers: [
    {
      url: '',
      description: ''
    },
    {
      url: 'http://localhost:3000',
      description: 'localhost'
    }
  ],
  securityDefinitions: {
    apiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'x-api-key'
    }
  },
  produces: ['application/json'],
  tags: [
    {
      name: 'Session',
      description: 'Handling multiple sessions logic, creation and deletion'
    },
    {
      name: 'Client',
      description: 'All functions related to the client'
    },
    {
      name: 'Message',
      description: 'May fail if the message is too old (Only from the last 100 Messages of the given chat)'
    },
    {
      name: 'Audio',
      description: 'Audio transcription and file conversion utilities'
    },
    {
      name: 'Sticker',
      description: 'Create and convert stickers for WhatsApp'
    },
    {
      name: 'File',
      description: 'File conversion and utilities'
    }
  ],
  definitions: {
    StartSessionResponse: {
      success: true,
      message: 'Session initiated successfully'
    },
    StatusSessionResponse: {
      success: true,
      state: 'CONNECTED',
      message: 'session_connected'
    },
    RestartSessionResponse: {
      success: true,
      message: 'Restarted successfully'
    },
    TerminateSessionResponse: {
      success: true,
      message: 'Logged out successfully'
    },
    TerminateSessionsResponse: {
      success: true,
      message: 'Flush completed successfully'
    },
    RequestPairingCodeBody: {
      $phoneNumber: '555197756708',
      showNotification: true
    },
    RequestPairingCodeResponse: {
      success: true,
      pairingCode: 'ABCD1234',
      phoneNumber: '555197756708',
      message: 'Pairing code generated. Enter this code on your phone.'
    },
    ListSessionsResponse: {
      success: true,
      sessions: [
        {
          sessionId: 'session1',
          status: 'CONNECTED',
          success: true,
          message: 'session_connected'
        }
      ]
    },
    TranscribeAudioBody: {
      audioBase64: 'data:audio/ogg;base64,T2dnUwACAAAAAAAAAADdN...',
      filename: 'audio.ogg'
    },
    TranscribeAudioResponse: {
      success: true,
      transcription: 'This is the transcribed text from the audio.',
      message: 'Audio transcribed successfully'
    },
    ConvertToStickerBody: {
      $base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      size: 512
    },
    ConvertToStickerResponse: {
      success: true,
      sticker: 'data:image/webp;base64,UklGRiQAAABXRUJQ...',
      mimetype: 'image/webp',
      size: 12345,
      message: 'Sticker converted successfully'
    },
    ErrorResponse: {
      success: false,
      error: 'Some server error'
    },
    NotFoundResponse: {
      success: false,
      error: 'Some server error'
    },
    ForbiddenResponse: {
      success: false,
      error: 'Invalid API key'
    }
  }
}

swaggerAutogen(outputFile, endpointsFiles, doc)
