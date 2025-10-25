const qr = require('qr-image')
const fs = require('fs')
const path = require('path')
const { 
  setupSession, 
  deleteSession, 
  validateSession, 
  flushSessions, 
  sessions, 
  hibernateSession,
  reactivateSession,
  hibernateAllSessions,
  reactivateAllSessions,
  listHibernatedSessions,
  getCompleteSessionStatus
} = require('../sessions')
const { sendErrorResponse, waitForNestedObject } = require('../utils')
const { sessionFolderPath } = require('../config')

/**
 * Starts a session for the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error starting the session.
 */
const startSession = async (req, res) => {
  // #swagger.summary = 'Start new session'
  // #swagger.description = 'Starts a session for the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const setupSessionReturn = setupSession(sessionId)
    if (!setupSessionReturn.success) {
      /* #swagger.responses[422] = {
        description: "Unprocessable Entity.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 422, setupSessionReturn.message)
      return // Interrompe o fluxo para evitar múltiplas respostas
    }
    /* #swagger.responses[200] = {
      description: "Status of the initiated session.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/StartSessionResponse" }
        }
      }
    }
    */
    // wait until the client is created
    waitForNestedObject(setupSessionReturn.client, 'pupPage')
      .then(() => {
        res.json({ success: true, message: setupSessionReturn.message })
      })
      .catch((err) => {
        sendErrorResponse(res, 500, err.message)
        // Interrompe o fluxo para evitar múltiplas respostas
      })
  } catch (error) {
  /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('startSession ERROR', error)
    sendErrorResponse(res, 500, error.message)
    // Interrompe o fluxo para evitar múltiplas respostas
  }
}

/**
 * Status of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
const statusSession = async (req, res) => {
  // #swagger.summary = 'Get session status'
  // #swagger.description = 'Status of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const sessionData = await validateSession(sessionId)
    /* #swagger.responses[200] = {
      description: "Status of the session.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/StatusSessionResponse" }
        }
      }
    }
    */
    res.json(sessionData)
  } catch (error) {
    console.log('statusSession ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
    // Interrompe o fluxo para evitar múltiplas respostas
  }
}

/**
 * QR code of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
const sessionQrCode = async (req, res) => {
  // #swagger.summary = 'Get session QR code'
  // #swagger.description = 'QR code of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const session = sessions.get(sessionId)
    if (!session) {
      res.json({ success: false, message: 'session_not_found' })
      return // Interrompe o fluxo para evitar múltiplas respostas
    }
    if (session.qr) {
      res.json({ success: true, qr: session.qr })
      return // Interrompe o fluxo para evitar múltiplas respostas
    }
    res.json({ success: false, message: 'qr code not ready or already scanned' })
  } catch (error) {
    console.log('sessionQrCode ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
    // Interrompe o fluxo para evitar múltiplas respostas
  }
}

/**
 * QR code as image of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
const sessionQrCodeImage = async (req, res) => {
  // #swagger.summary = 'Get session QR code as image'
  // #swagger.description = 'QR code as image of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const session = sessions.get(sessionId)
    if (!session) {
      res.json({ success: false, message: 'session_not_found' })
      return // Interrompe o fluxo para evitar múltiplas respostas
    }
    if (session.qr) {
      const qrImage = qr.image(session.qr)
      /* #swagger.responses[200] = {
          description: "QR image.",
          content: {
            "image/png": {}
          }
        }
      */
      res.writeHead(200, {
        'Content-Type': 'image/png'
      })
      qrImage.pipe(res)
      return // Interrompe o fluxo para evitar múltiplas respostas
    }
    res.json({ success: false, message: 'qr code not ready or already scanned' })
  } catch (error) {
    console.log('sessionQrCodeImage ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
    // Interrompe o fluxo para evitar múltiplas respostas
  }
}

/**
 * Terminates the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to terminate.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the session.
 */
const terminateSession = async (req, res) => {
  // #swagger.summary = 'Terminate session'
  // #swagger.description = 'Terminates the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const validation = await validateSession(sessionId)
    if (validation.message === 'session_not_found') {
      res.json(validation)
      return // Interrompe o fluxo para evitar múltiplas respostas
    }
    await deleteSession(sessionId, validation)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateSession ERROR', error)
    sendErrorResponse(res, 500, error.message)
    // Interrompe o fluxo para evitar múltiplas respostas
  }
}

/**
 * Terminates all inactive sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the sessions.
 */
const terminateInactiveSessions = async (req, res) => {
  // #swagger.summary = 'Terminate inactive sessions'
  // #swagger.description = 'Terminates all inactive sessions.'
  try {
    await flushSessions(true)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionsResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Flush completed successfully' })
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateInactiveSessions ERROR', error)
    sendErrorResponse(res, 500, error.message)
    // Interrompe o fluxo para evitar múltiplas respostas
  }
}

/**
 * Terminates all sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the sessions.
 */
const terminateAllSessions = async (req, res) => {
  // #swagger.summary = 'Terminate all sessions'
  // #swagger.description = 'Terminates all sessions.'
  try {
    await flushSessions(false)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionsResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Flush completed successfully' })
  } catch (error) {
  /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateAllSessions ERROR', error)
    sendErrorResponse(res, 500, error.message)
    // Interrompe o fluxo para evitar múltiplas respostas
  }
}

/**
 * Lists all available sessions including hibernated ones.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error listing the sessions.
 */
const listSessions = async (req, res) => {
  // #swagger.summary = 'List all sessions'
  // #swagger.description = 'Lists all available sessions with their status including hibernated sessions.'
  try {
    const result = await getCompleteSessionStatus()
    
    /* #swagger.responses[200] = {
      description: "List of sessions including hibernated ones.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ListSessionsResponse" }
        }
      }
    }
    */
    res.json(result)
  } catch (error) {
    console.log('listSessions ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Hibernates a specific session without disconnecting from WhatsApp.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to hibernate.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error hibernating the session.
 */
const hibernateSessionController = async (req, res) => {
  // #swagger.summary = 'Hibernate session'
  // #swagger.description = 'Hibernates a session without disconnecting from WhatsApp.'
  try {
    const sessionId = req.params.sessionId
    const result = await hibernateSession(sessionId)
    
    /* #swagger.responses[200] = {
      description: "Session hibernated successfully.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/HibernateSessionResponse" }
        }
      }
    }
    */
    res.json(result)
  } catch (error) {
    console.log('hibernateSession ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Reactivates a hibernated session.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to reactivate.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error reactivating the session.
 */
const reactivateSessionController = async (req, res) => {
  // #swagger.summary = 'Reactivate hibernated session'
  // #swagger.description = 'Reactivates a hibernated session.'
  try {
    const sessionId = req.params.sessionId
    const result = await reactivateSession(sessionId)
    
    /* #swagger.responses[200] = {
      description: "Session reactivated successfully.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ReactivateSessionResponse" }
        }
      }
    }
    */
    res.json(result)
  } catch (error) {
    console.log('reactivateSession ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Hibernates all active sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error hibernating sessions.
 */
const hibernateAllSessionsController = async (req, res) => {
  // #swagger.summary = 'Hibernate all sessions'
  // #swagger.description = 'Hibernates all active sessions for maintenance.'
  try {
    const result = await hibernateAllSessions()
    
    /* #swagger.responses[200] = {
      description: "All sessions hibernated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/HibernateAllSessionsResponse" }
        }
      }
    }
    */
    res.json(result)
  } catch (error) {
    console.log('hibernateAllSessions ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Reactivates all hibernated sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error reactivating sessions.
 */
const reactivateAllSessionsController = async (req, res) => {
  // #swagger.summary = 'Reactivate all hibernated sessions'
  // #swagger.description = 'Reactivates all hibernated sessions after maintenance.'
  try {
    const result = await reactivateAllSessions()
    
    /* #swagger.responses[200] = {
      description: "All hibernated sessions reactivated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ReactivateAllSessionsResponse" }
        }
      }
    }
    */
    res.json(result)
  } catch (error) {
    console.log('reactivateAllSessions ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  startSession,
  statusSession,
  sessionQrCode,
  sessionQrCodeImage,
  terminateSession,
  terminateInactiveSessions,
  terminateAllSessions,
  listSessions,
  hibernateSession: hibernateSessionController,
  reactivateSession: reactivateSessionController,
  hibernateAllSessions: hibernateAllSessionsController,
  reactivateAllSessions: reactivateAllSessionsController
}
