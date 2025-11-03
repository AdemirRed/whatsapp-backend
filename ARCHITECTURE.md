# WhatsApp Backend Architecture - How It Works

This document provides a comprehensive technical explanation of how the WhatsApp Backend system works, including its architecture, components, and operational flows.

## System Overview

The WhatsApp Backend is a REST API wrapper for the `whatsapp-web.js` library. It provides a scalable, secure interface for external applications to interact with WhatsApp Web programmatically.

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Backend API                     │
├─────────────────────────────────────────────────────────────┤
│  Express.js Server (server.js)                             │
│  ├── REST API Routes (routes.js)                           │
│  ├── Controllers (controllers/)                            │
│  ├── Middleware (middleware.js)                            │
│  └── Configuration (config.js)                             │
├─────────────────────────────────────────────────────────────┤
│  Session Management (sessions.js)                          │
│  ├── Active Sessions Map                                   │
│  ├── Local Authentication                                  │
│  └── Session Recovery                                      │
├─────────────────────────────────────────────────────────────┤
│  WhatsApp-Web.js (Core Library)                            │
│  ├── WhatsApp Client                                       │
│  ├── Puppeteer (Browser Control)                           │
│  └── LocalAuth (Local Storage)                             │
├─────────────────────────────────────────────────────────────┤
│  Automated Browser (Puppeteer + Chrome)                    │
│  └── WhatsApp Web Interface                                │
└─────────────────────────────────────────────────────────────┘
```

## Operational Flow

### 1. System Initialization

1. **Configuration Loading**: System loads environment variables from `.env` file
2. **Express Initialization**: Express server is configured with middleware (CORS, body-parser, rate limiting)
3. **Route Registration**: REST routes are registered and organized by functionality
4. **Session Restoration**: Existing sessions are automatically restored if `RECOVER_SESSIONS=TRUE`

### 2. Session Management

#### Creating a New Session

```javascript
// Example session creation
GET /session/start/MY_SESSION
```

**Internal Flow:**
1. System checks if session already exists
2. Creates new `LocalAuth` instance for storage
3. Configures Puppeteer options (automated browser)
4. Initializes WhatsApp client with `new Client(options)`
5. Registers events and callbacks
6. Starts authentication process

#### QR Code Authentication

1. **QR Generation**: WhatsApp Web generates a unique QR code
2. **Availability**: QR is made available via webhooks and REST endpoints
3. **Scanning**: User scans with WhatsApp mobile app
4. **Validation**: System receives confirmation and establishes connection
5. **Persistence**: Authentication data is saved locally

### 3. API Endpoint Structure

#### Session Endpoints (`/session`)
- `GET /session/start/:sessionId` - Start new session
- `GET /session/status/:sessionId` - Check session status
- `GET /session/qr/:sessionId` - Get QR code as text
- `GET /session/qr/:sessionId/image` - Get QR code as PNG image
- `GET /session/terminate/:sessionId` - Terminate specific session
- `GET /session/terminateInactive` - Terminate inactive sessions
- `GET /session/terminateAll` - Terminate all sessions

#### Client Endpoints (`/client`)
- `GET /client/getContacts/:sessionId` - List contacts
- `GET /client/getChats/:sessionId` - List conversations
- `POST /client/sendMessage/:sessionId` - Send message
- `POST /client/createGroup/:sessionId` - Create group
- `POST /client/setStatus/:sessionId` - Set profile status

#### Message Endpoints (`/message`)
- `POST /message/forward/:sessionId` - Forward message
- `POST /message/delete/:sessionId` - Delete message
- `POST /message/react/:sessionId` - Add reaction
- `POST /message/downloadMedia/:sessionId` - Download media

### 4. Webhook System

The system implements a robust webhook callback system:

#### Supported Events
- `qr` - New QR code generated
- `authenticated` - Authentication successful
- `ready` - Client ready for use
- `message` - New message received
- `message_create` - Message created
- `message_ack` - Delivery confirmation
- `call` - Call received
- `group_join` - Group joined
- `group_leave` - Group left

#### Webhook Configuration
```bash
# Global webhook (all sessions)
BASE_WEBHOOK_URL=http://localhost:3000/callback

# Session-specific webhook
MY_SESSION_WEBHOOK_URL=http://localhost:3000/callback/specific
```

### 5. Storage and Persistence

#### Folder Structure
```
./sessions/
├── session-SESSION1/
│   ├── Default/
│   │   ├── Local Storage/
│   │   ├── Session Storage/
│   │   └── IndexedDB/
│   └── SingletonCookies
├── session-SESSION2/
└── ...
```

#### Stored Data
- **Authentication Tokens**: Encrypted WhatsApp credentials
- **Browser Settings**: Puppeteer preferences and state
- **Contact Cache**: Synchronized contact list
- **Message History**: Local cache of recent messages

### 6. Security and Authentication

#### API Authentication
```bash
# Global API key
API_KEY=your_secret_key_here

# Usage in headers
x-api-key: your_secret_key_here
```

#### Rate Limiting
```bash
RATE_LIMIT_MAX=1000        # Maximum requests
RATE_LIMIT_WINDOW_MS=1000  # Time window in ms
```

#### Session Validations
- Session existence verification
- Connection state validation
- Permission checks

### 7. Message Sending Process

#### Detailed Flow
1. **Request Reception**: API receives POST with message data
2. **Validation**: Verifies sessionId, authentication, and data format
3. **Recipient Identification**: Resolves WhatsApp number/contact
4. **Processing**: Formats message according to type (text, media, etc.)
5. **Sending**: Uses whatsapp-web.js to send via automated browser
6. **Confirmation**: Returns sending status and message ID
7. **Webhook**: Triggers configured callbacks (if enabled)

#### Supported Message Types
- **Simple Text**: Common text messages
- **Media**: Images, videos, audio, documents
- **Location**: Geographic coordinates
- **Contact**: Business card
- **Buttons**: Interactive messages with buttons
- **Lists**: Selection menus
- **Templates**: Formatted messages

### 8. Monitoring and Logging

#### System Logs
- **Initialization**: Startup and configuration records
- **Sessions**: Creation, destruction, and session errors
- **Messages**: Send and receive logs
- **Webhooks**: Callback records sent
- **Errors**: Stack traces and debugging

#### Health Check
```
GET /ping - Check if server is active
```

### 9. Scalability and Performance

#### Resource Management
- **Multiple Sessions**: Support for simultaneous sessions
- **Automatic Cleanup**: Removal of inactive sessions
- **Rate Limiting**: API load control
- **Memory Management**: Puppeteer resource cleanup

#### Optimizations
- **Contact Caching**: Avoids unnecessary requests
- **Connection Reuse**: Maintains active sessions
- **Lazy Loading**: On-demand loading
- **Connection Pooling**: Efficient resource management

### 10. Error Handling

#### Common Error Types
- **session_not_found**: Session doesn't exist
- **session_not_connected**: Session not authenticated
- **browser_tab_closed**: Browser tab was closed
- **rate_limit_exceeded**: Request limit exceeded
- **invalid_number**: Invalid WhatsApp number

#### Recovery and Failover
- **Auto-Restart**: Automatic restart of failed sessions
- **Session Recovery**: State recovery after crashes
- **Graceful Degradation**: Partial functionality during errors

## Advanced Configuration

### Main Environment Variables

```bash
# Server
PORT=3000
API_KEY=secret_key

# WhatsApp
BASE_WEBHOOK_URL=http://localhost:3000/callback
MAX_ATTACHMENT_SIZE=10000000
SET_MESSAGES_AS_SEEN=TRUE
WEB_VERSION='2.2328.5'

# Sessions
SESSIONS_PATH=./sessions
RECOVER_SESSIONS=TRUE

# Disabled Callbacks
DISABLED_CALLBACKS=message_ack|message_reaction
```

### Webhook Customization

You can customize webhooks per session and disable specific events for performance optimization.

## Common Use Cases

1. **Automated Chatbots**: AI system integration
2. **System Notifications**: Alert and update sending
3. **Customer Support**: Automated support systems
4. **Digital Marketing**: Campaigns and broadcasts
5. **ERP/CRM Integration**: Connect WhatsApp with business systems

## Limitations and Considerations

- **WhatsApp Policy**: Unofficial use may result in blocking
- **Rate Limits**: WhatsApp imposes message limits
- **Hardware Resources**: Each session consumes significant resources
- **Stability**: Dependent on WhatsApp Web stability
- **Updates**: WhatsApp changes can affect functionality

## Key Files and Components

### Core Files
- **server.js**: Application entry point
- **src/app.js**: Express application configuration
- **src/config.js**: Environment and configuration management
- **src/sessions.js**: Session management and WhatsApp client setup
- **src/routes.js**: API route definitions
- **src/middleware.js**: Authentication, validation, and rate limiting

### Controllers
- **sessionController.js**: Session lifecycle management
- **clientController.js**: WhatsApp client operations
- **messageController.js**: Message handling operations
- **groupChatController.js**: Group management
- **contactController.js**: Contact operations
- **healthController.js**: Health checks and monitoring

### Utilities
- **src/utils.js**: Helper functions and webhook triggers
- **swagger.json**: API documentation specification

---

*This document provides a complete technical overview of the WhatsApp Backend system. For basic installation and configuration information, refer to the main README.md.*