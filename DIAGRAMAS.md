# WhatsApp Backend - Diagramas e Fluxos

## Arquitetura Geral do Sistema

```mermaid
graph TB
    subgraph "Cliente Externo"
        APP[Aplicação/Frontend]
        WEBHOOK[Webhook Endpoint]
    end
    
    subgraph "WhatsApp Backend API"
        EXPRESS[Express.js Server]
        ROUTES[Routes/Controllers]
        MIDDLEWARE[Middleware]
        SESSION_MGR[Session Manager]
        UTILS[Utilities]
    end
    
    subgraph "WhatsApp Web.js"
        CLIENT[WhatsApp Client]
        AUTH[LocalAuth]
        EVENTS[Event Handlers]
    end
    
    subgraph "Browser Layer"
        PUPPETEER[Puppeteer]
        CHROME[Chrome Browser]
        WHATSAPP_WEB[WhatsApp Web]
    end
    
    subgraph "Armazenamento"
        LOCAL_STORAGE[Local Storage]
        SESSION_FILES[Session Files]
        MEDIA_CACHE[Media Cache]
    end
    
    subgraph "WhatsApp Servers"
        WA_SERVERS[WhatsApp Infrastructure]
    end
    
    APP -->|HTTP Requests| EXPRESS
    EXPRESS --> ROUTES
    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> SESSION_MGR
    SESSION_MGR --> CLIENT
    CLIENT --> AUTH
    AUTH --> LOCAL_STORAGE
    CLIENT --> PUPPETEER
    PUPPETEER --> CHROME
    CHROME --> WHATSAPP_WEB
    WHATSAPP_WEB --> WA_SERVERS
    
    CLIENT --> EVENTS
    EVENTS --> UTILS
    UTILS -->|Webhooks| WEBHOOK
    
    SESSION_MGR --> SESSION_FILES
    CLIENT --> MEDIA_CACHE
```

## Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant App as Aplicação
    participant API as WhatsApp API
    participant SM as Session Manager
    participant WC as WhatsApp Client
    participant Browser as Browser/WhatsApp Web
    participant Mobile as WhatsApp Mobile
    
    App->>+API: POST /session/start/SESSAO1
    API->>+SM: setupSession(SESSAO1)
    SM->>+WC: new Client(options)
    WC->>+Browser: initialize()
    Browser->>Browser: Carrega WhatsApp Web
    Browser-->>WC: QR Code gerado
    WC-->>SM: QR Code disponível
    SM-->>API: Sessão iniciada
    API-->>App: 200 OK
    
    App->>+API: GET /session/qr/SESSAO1
    API->>SM: getQRCode(SESSAO1)
    SM-->>API: QR Code
    API-->>App: QR Code (texto/imagem)
    
    Mobile->>Browser: Escaneia QR Code
    Browser->>WC: Autenticação bem-sucedida
    WC->>SM: authenticated event
    SM->>API: Webhook callback
    API->>App: Webhook: authenticated
    
    Note over WC,Browser: Sessão autenticada e pronta
```

## Fluxo de Envio de Mensagem

```mermaid
sequenceDiagram
    participant App as Aplicação
    participant API as WhatsApp API
    participant Controller as Message Controller
    participant WC as WhatsApp Client
    participant Browser as Browser
    participant WA as WhatsApp Servers
    
    App->>+API: POST /client/sendMessage/SESSAO1
    Note over App,API: { "chatId": "5511999999999@c.us", "message": "Olá!" }
    
    API->>+Controller: sendMessage()
    Controller->>Controller: Validar sessão
    Controller->>Controller: Validar dados
    Controller->>+WC: sendMessage(chatId, message)
    WC->>+Browser: Enviar via WhatsApp Web
    Browser->>+WA: Enviar mensagem
    WA-->>Browser: Confirmação de envio
    Browser-->>WC: Message ID
    WC-->>Controller: Resultado
    Controller-->>API: Response com Message ID
    API-->>App: 200 OK + Message ID
    
    WA->>Browser: Message ACK
    Browser->>WC: message_ack event
    WC->>API: Webhook callback
    API->>App: Webhook: message_ack
```

## Estrutura de Componentes

```mermaid
graph LR
    subgraph "src/"
        APP_JS[app.js<br/>Express App]
        CONFIG[config.js<br/>Configurações]
        ROUTES[routes.js<br/>Definição de Rotas]
        SESSIONS[sessions.js<br/>Gerenciamento de Sessões]
        MIDDLEWARE[middleware.js<br/>Autenticação & Validação]
        UTILS[utils.js<br/>Funções Utilitárias]
    end
    
    subgraph "controllers/"
        SESSION_CTRL[sessionController.js]
        CLIENT_CTRL[clientController.js]
        MESSAGE_CTRL[messageController.js]
        GROUP_CTRL[groupChatController.js]
        CONTACT_CTRL[contactController.js]
        HEALTH_CTRL[healthController.js]
    end
    
    APP_JS --> ROUTES
    ROUTES --> MIDDLEWARE
    ROUTES --> SESSION_CTRL
    ROUTES --> CLIENT_CTRL
    ROUTES --> MESSAGE_CTRL
    ROUTES --> GROUP_CTRL
    ROUTES --> CONTACT_CTRL
    ROUTES --> HEALTH_CTRL
    
    SESSION_CTRL --> SESSIONS
    CLIENT_CTRL --> SESSIONS
    MESSAGE_CTRL --> SESSIONS
    GROUP_CTRL --> SESSIONS
    CONTACT_CTRL --> SESSIONS
    
    SESSIONS --> CONFIG
    MIDDLEWARE --> CONFIG
    UTILS --> CONFIG
    
    SESSIONS --> UTILS
    SESSION_CTRL --> UTILS
    CLIENT_CTRL --> UTILS
```

## Estados da Sessão

```mermaid
stateDiagram-v2
    [*] --> STARTING: /session/start
    STARTING --> LOADING: Cliente inicializando
    LOADING --> QR_READY: QR Code gerado
    QR_READY --> AUTHENTICATING: QR escaneado
    AUTHENTICATING --> CONNECTED: Autenticado
    CONNECTED --> READY: Cliente pronto
    
    READY --> CONNECTED: Operação normal
    CONNECTED --> DISCONNECTED: Falha de conexão
    DISCONNECTED --> CONNECTING: Tentativa de reconexão
    CONNECTING --> CONNECTED: Reconectado
    CONNECTING --> TERMINATED: Falha definitiva
    
    QR_READY --> TERMINATED: Timeout QR
    AUTHENTICATING --> TERMINATED: Falha de autenticação
    READY --> TERMINATED: /session/terminate
    TERMINATED --> [*]
    
    note right of QR_READY
        QR Code disponível via:
        - /session/qr/:sessionId
        - /session/qr/:sessionId/image
        - Webhook callback
    end note
    
    note right of READY
        Sessão pronta para:
        - Enviar mensagens
        - Receber callbacks
        - Operações da API
    end note
```

## Fluxo de Webhooks

```mermaid
graph TD
    subgraph "WhatsApp Client Events"
        QR[qr]
        AUTH[authenticated]
        READY[ready]
        MESSAGE[message]
        MSG_ACK[message_ack]
        CALL[call]
        GROUP[group_join/leave]
    end
    
    subgraph "Event Processing"
        CHECK[checkIfEventEnabled]
        TRIGGER[triggerWebhook]
        HTTP[HTTP POST]
    end
    
    subgraph "Webhook Destinations"
        GLOBAL[BASE_WEBHOOK_URL]
        SESSION[SESSION_WEBHOOK_URL]
        APP[Aplicação Cliente]
    end
    
    QR --> CHECK
    AUTH --> CHECK
    READY --> CHECK
    MESSAGE --> CHECK
    MSG_ACK --> CHECK
    CALL --> CHECK
    GROUP --> CHECK
    
    CHECK --> TRIGGER
    TRIGGER --> HTTP
    
    HTTP --> GLOBAL
    HTTP --> SESSION
    GLOBAL --> APP
    SESSION --> APP
    
    note1[Configuração por variáveis de ambiente:<br/>BASE_WEBHOOK_URL (global)<br/>SESSIONID_WEBHOOK_URL (específica)]
    note2[Callbacks podem ser desabilitados:<br/>DISABLED_CALLBACKS=message_ack|call]
```

---

*Estes diagramas ilustram o funcionamento interno do WhatsApp Backend, mostrando a interação entre componentes e fluxos de dados.*