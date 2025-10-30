# 📚 API Reference - Enhanced Features

## 🔥 Novos Recursos Implementados

Esta documentação cobre as **funcionalidades avançadas** adicionadas ao WhatsApp Backend API, incluindo:

1. **View Once Media Management** - Detecção e download de fotos/vídeos de visualização única
2. **Enhanced Message Fetching** - Busca de mensagens com reações, menções, respostas e mídia
3. **Advanced Webhooks** - Notificações automáticas para eventos View Once

---

## 📍 BASE URL

```
http://localhost:200
```

## 🔑 Autenticação

Todas as requisições requerem o header:
```
x-api-key: redblack
```

---

## 1️⃣ VIEW ONCE ENDPOINTS

### 📥 Get View Once Media

Busca mensagens com mídia de visualização única em um chat.

**Endpoint:** `POST /viewonce/getMedia/:sessionId`

**Request Body:**
```json
{
  "chatId": "555197756708@c.us",
  "limit": 50,
  "includeExpired": false
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "chatId": "555197756708@c.us",
    "totalFound": 5,
    "returned": 5,
    "includeExpired": false,
    "messages": [
      {
        "id": "true_555197756708@c.us_3EB0XXXXX",
        "from": "555197756708@c.us",
        "timestamp": 1698765432,
        "type": "image",
        "hasMedia": true,
        "isViewOnce": true,
        "viewed": false,
        "canDownload": true,
        "mimetype": "image/jpeg",
        "caption": "Check this out!",
        "ephemeral": true
      }
    ]
  }
}
```

**Exemplos:**

```bash
# PowerShell
$headers = @{
    "Content-Type"="application/json"
    "x-api-key"="redblack"
}
$body = @{
    chatId = "555197756708@c.us"
    limit = 50
    includeExpired = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:200/viewonce/getMedia/redblack" `
    -Method Post -Headers $headers -Body $body
```

```javascript
// JavaScript/Node.js
const response = await fetch('http://localhost:200/viewonce/getMedia/redblack', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'redblack'
  },
  body: JSON.stringify({
    chatId: '555197756708@c.us',
    limit: 50,
    includeExpired: false
  })
});

const data = await response.json();
console.log(data);
```

```python
# Python
import requests

response = requests.post(
    'http://localhost:200/viewonce/getMedia/redblack',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'redblack'
    },
    json={
        'chatId': '555197756708@c.us',
        'limit': 50,
        'includeExpired': False
    }
)

print(response.json())
```

---

### 💾 Download View Once Media

Baixa a mídia de uma mensagem view once específica.

**Endpoint:** `POST /viewonce/download/:sessionId`

**Request Body:**
```json
{
  "messageId": "3EB0XXXXXXXXXXXXX",
  "chatId": "555197756708@c.us",
  "force": false
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "media": {
      "mimetype": "image/jpeg",
      "data": "base64encodeddata...",
      "filename": "viewonce_1698765432.jpg"
    },
    "metadata": {
      "messageId": "true_555197756708@c.us_3EB0XXXXX",
      "from": "555197756708@c.us",
      "timestamp": 1698765432,
      "type": "image",
      "isViewOnce": true,
      "downloadedAt": 1698765500,
      "warning": "This is view once media that was meant to be seen only once. Handle responsibly."
    }
  }
}
```

**⚠️ Importante:**
- Por padrão, não faz download de mídia já visualizada (use `force: true` para forçar)
- Mídia pode expirar e não estar mais disponível para download
- Use com responsabilidade e respeite a privacidade

**Exemplos:**

```bash
# PowerShell
$body = @{
    messageId = "3EB0XXXXXXXXXXXXX"
    chatId = "555197756708@c.us"
    force = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:200/viewonce/download/redblack" `
    -Method Post -Headers $headers -Body $body
```

---

### 📊 Get View Once Statistics

Obtém estatísticas de mensagens view once em um chat.

**Endpoint:** `POST /viewonce/getStats/:sessionId`

**Request Body:**
```json
{
  "chatId": "555197756708@c.us",
  "days": 30
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "chatId": "555197756708@c.us",
    "periodDays": 30,
    "cutoffDate": "2025-10-01T00:00:00.000Z",
    "stats": {
      "totalMessages": 150,
      "viewOnceMessages": 12,
      "images": 8,
      "videos": 4,
      "viewed": 7,
      "unviewed": 5,
      "fromMe": 3,
      "fromOthers": 9,
      "byDate": {
        "2025-10-30": 2,
        "2025-10-29": 3,
        "2025-10-28": 1
      },
      "bySender": {
        "me": 3,
        "555197756708@c.us": 9
      }
    }
  }
}
```

---

### 💬 Get Chats with View Once

Lista todos os chats que contêm mensagens view once.

**Endpoint:** `POST /viewonce/getChats/:sessionId`

**Request Body:**
```json
{
  "limit": 50
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalChatsChecked": 50,
    "chatsWithViewOnce": 5,
    "chats": [
      {
        "chatId": "555197756708@c.us",
        "name": "João Silva",
        "isGroup": false,
        "viewOnceCount": 12,
        "lastActivity": 1698765432
      },
      {
        "chatId": "555199999999@c.us",
        "name": "Maria Santos",
        "isGroup": false,
        "viewOnceCount": 8,
        "lastActivity": 1698765000
      }
    ]
  }
}
```

---

## 2️⃣ ENHANCED MESSAGE FETCHING

### 🔥 Fetch Messages (Enhanced)

Busca mensagens com informações avançadas incluindo reações, menções, respostas e mídia.

**Endpoint:** `POST /chat/fetchMessages/:sessionId`

**Request Body (Básico):**
```json
{
  "chatId": "555197756708@c.us",
  "searchOptions": {
    "limit": 50
  }
}
```

**Request Body (Com Melhorias):**
```json
{
  "chatId": "555197756708@c.us",
  "searchOptions": {
    "limit": 20
  },
  "includeReactions": true,
  "includeMentions": true,
  "includeQuoted": true,
  "includeMedia": true,
  "includeContacts": true
}
```

**Response 200 (Sem Melhorias):**
```json
{
  "success": true,
  "messages": [
    {
      "id": {
        "_serialized": "true_555197756708@c.us_3EB0XXXXX"
      },
      "body": "Hello!",
      "type": "chat",
      "timestamp": 1698765432,
      "from": "555197756708@c.us",
      "fromMe": false,
      "hasMedia": false
    }
  ]
}
```

**Response 200 (Com Melhorias):**
```json
{
  "success": true,
  "messages": [
    {
      "id": {
        "_serialized": "true_555197756708@c.us_3EB0XXXXX"
      },
      "body": "Hello @Maria, check this out!",
      "type": "chat",
      "timestamp": 1698765432,
      "from": "555197756708@c.us",
      "fromMe": false,
      "hasMedia": true,
      "hasQuotedMsg": true,
      "hasReaction": true,
      "_enhanced": {
        "reactions": [
          {
            "id": "555199999999@c.us",
            "reaction": "👍",
            "timestamp": 1698765500
          }
        ],
        "mentions": [
          {
            "id": "555188888888@c.us",
            "name": "Maria",
            "pushname": "Maria Silva",
            "number": "5551888888888",
            "isMe": false
          }
        ],
        "quotedMessage": {
          "id": "true_555197756708@c.us_3EB0YYYYY",
          "body": "Original message",
          "type": "chat",
          "timestamp": 1698765400,
          "from": "555197756708@c.us",
          "fromMe": true
        },
        "mediaInfo": {
          "mimetype": "image/jpeg",
          "filename": "photo.jpg",
          "filesize": 245678,
          "caption": "Check this out!",
          "downloadable": true
        },
        "contacts": []
      }
    }
  ],
  "enhanced": {
    "includeReactions": true,
    "includeMentions": true,
    "includeQuoted": true,
    "includeMedia": true,
    "includeContacts": true,
    "totalMessages": 20,
    "processedAt": "2025-10-30T15:30:00.000Z"
  }
}
```

**📋 Parâmetros de Melhoria:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `includeReactions` | boolean | Inclui reações (emojis) nas mensagens |
| `includeMentions` | boolean | Inclui lista de contatos mencionados (@) |
| `includeQuoted` | boolean | Inclui a mensagem citada/respondida |
| `includeMedia` | boolean | Inclui metadados de mídia (sem download) |
| `includeContacts` | boolean | Inclui cartões de contato compartilhados |

**Exemplos de Uso:**

```javascript
// Buscar mensagens com reações apenas
const withReactions = await fetch('http://localhost:200/chat/fetchMessages/redblack', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'redblack'
  },
  body: JSON.stringify({
    chatId: '555197756708@c.us',
    searchOptions: { limit: 20 },
    includeReactions: true
  })
});

// Buscar mensagens de grupo com menções e respostas
const groupMessages = await fetch('http://localhost:200/chat/fetchMessages/redblack', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'redblack'
  },
  body: JSON.stringify({
    chatId: '555197756708-1234567890@g.us',
    searchOptions: { limit: 30 },
    includeMentions: true,
    includeQuoted: true
  })
});

// Buscar com TODAS as melhorias
const fullEnhanced = await fetch('http://localhost:200/chat/fetchMessages/redblack', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'redblack'
  },
  body: JSON.stringify({
    chatId: '555197756708@c.us',
    searchOptions: { limit: 10 },
    includeReactions: true,
    includeMentions: true,
    includeQuoted: true,
    includeMedia: true,
    includeContacts: true
  })
});
```

---

## 3️⃣ WEBHOOKS

### 🔔 View Once Detected

Webhook enviado quando uma mensagem view once é detectada.

**Webhook Payload:**
```json
{
  "sessionId": "redblack",
  "dataType": "view_once_detected",
  "data": {
    "message": { /* Message object */ },
    "metadata": {
      "from": "555197756708@c.us",
      "type": "image",
      "hasMedia": true,
      "timestamp": 1698765432,
      "viewed": false,
      "isViewOnce": true
    }
  }
}
```

### 💾 View Once Media Downloaded

Webhook enviado quando mídia view once é baixada automaticamente.

**Webhook Payload:**
```json
{
  "sessionId": "redblack",
  "dataType": "view_once_media",
  "data": {
    "message": { /* Message object */ },
    "messageMedia": {
      "mimetype": "image/jpeg",
      "data": "base64...",
      "filename": "viewonce_1698765432.jpg"
    }
  }
}
```

---

## 🎯 CASOS DE USO

### Caso 1: Monitorar View Once em Tempo Real

```javascript
// Configure webhook na sua aplicação Boot
app.post('/webhook', (req, res) => {
  const { sessionId, dataType, data } = req.body;
  
  if (dataType === 'view_once_detected') {
    console.log('Nova mídia View Once detectada!');
    console.log(`De: ${data.metadata.from}`);
    console.log(`Tipo: ${data.metadata.type}`);
    
    // Salvar no banco de dados
    saveViewOnceDetection(data);
    
    // Notificar administradores
    notifyAdmins(data);
  }
  
  if (dataType === 'view_once_media') {
    console.log('Mídia View Once baixada!');
    
    // Salvar arquivo
    saveMediaFile(data.messageMedia);
  }
  
  res.json({ success: true });
});
```

### Caso 2: Análise de Conversa Completa

```javascript
// Buscar mensagens com todas as informações
const messages = await fetchEnhancedMessages('555197756708@c.us', {
  limit: 100,
  includeReactions: true,
  includeMentions: true,
  includeQuoted: true
});

// Analisar engajamento
const engagement = {
  totalReactions: 0,
  mostReactedEmoji: {},
  mentionedUsers: new Set(),
  repliedMessages: 0
};

messages.forEach(msg => {
  if (msg._enhanced?.reactions) {
    engagement.totalReactions += msg._enhanced.reactions.length;
    msg._enhanced.reactions.forEach(r => {
      engagement.mostReactedEmoji[r.reaction] = 
        (engagement.mostReactedEmoji[r.reaction] || 0) + 1;
    });
  }
  
  if (msg._enhanced?.mentions) {
    msg._enhanced.mentions.forEach(m => 
      engagement.mentionedUsers.add(m.id)
    );
  }
  
  if (msg._enhanced?.quotedMessage) {
    engagement.repliedMessages++;
  }
});

console.log('Análise de Engajamento:', engagement);
```

### Caso 3: Backup Automático de View Once

```javascript
// Verificar chats com View Once
const chatsWithViewOnce = await getChatsWithViewOnce(50);

for (const chat of chatsWithViewOnce.chats) {
  // Buscar mídias View Once
  const viewOnceMedia = await getViewOnceMedia(chat.chatId, 100, true);
  
  for (const media of viewOnceMedia.messages) {
    if (!media.viewed && media.canDownload) {
      // Baixar antes que expire
      const downloaded = await downloadViewOnceMedia(
        media.id,
        chat.chatId,
        false
      );
      
      if (downloaded.success) {
        console.log(`✅ Backup salvo: ${downloaded.data.metadata.filename}`);
      }
    }
  }
}
```

---

## ⚠️ AVISOS IMPORTANTES

### View Once Media

1. **Privacidade**: Mídia View Once foi enviada com intenção de ser vista uma vez. Use com responsabilidade.
2. **Expiração**: Mídia pode expirar rapidamente após visualização.
3. **Legal**: Certifique-se de ter permissão para armazenar este conteúdo.

### Enhanced Fetching

1. **Performance**: Buscar com todas as melhorias pode ser mais lento.
2. **Limites**: Recomendado usar `limit` menor quando usar muitas melhorias.
3. **Erros**: Se um enhancement falhar, a mensagem ainda é retornada sem aquele campo específico.

---

## 🔧 TROUBLESHOOTING

### View Once não detectado

```javascript
// Verificar se detecção está ativa em sessions.js
// Webhook deve estar configurado corretamente
```

### Mensagens sem enhancements

```javascript
// Verificar se os parâmetros estão corretos
{
  includeReactions: true, // ✅ Correto
  includeReaction: true   // ❌ Errado (singular)
}
```

### Erro 404 em View Once

```javascript
// Sessão não encontrada - verificar se está ativa
const sessions = await fetch('http://localhost:200/session/status/redblack');
console.log(sessions);
```

---

## 📞 SUPORTE

Para dúvidas ou problemas:

1. Verificar logs do servidor
2. Testar endpoints com Swagger UI: `http://localhost:200/api-docs`
3. Ver página de teste: `http://localhost:200/test-enhanced-messages.html`

---

**Versão:** 2.0.0  
**Atualizado:** 30/10/2025  
**Autor:** AdemirRed