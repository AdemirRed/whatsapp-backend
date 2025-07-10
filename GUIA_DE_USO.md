# Guia de Uso - Exemplos Práticos

Este documento contém exemplos práticos de como usar o WhatsApp Backend API.

## Configuração Inicial

### 1. Arquivo .env
```bash
# Servidor
PORT=3000
API_KEY=minha_chave_secreta_123

# WhatsApp
BASE_WEBHOOK_URL=http://localhost:3000/localCallbackExample
ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE
MAX_ATTACHMENT_SIZE=10000000
SET_MESSAGES_AS_SEEN=TRUE

# Sessões
SESSIONS_PATH=./sessions
RECOVER_SESSIONS=TRUE

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Swagger
ENABLE_SWAGGER_ENDPOINT=TRUE
```

### 2. Iniciar o Servidor
```bash
npm install
npm start
# Servidor rodando em http://localhost:3000
```

## Exemplos de Uso da API

### 1. Criar e Autenticar Sessão

#### Iniciar Nova Sessão
```bash
curl -X GET "http://localhost:3000/session/start/minha_sessao" \
  -H "x-api-key: minha_chave_secreta_123"
```

#### Obter QR Code para Escaneamento
```bash
# QR Code como texto
curl -X GET "http://localhost:3000/session/qr/minha_sessao" \
  -H "x-api-key: minha_chave_secreta_123"

# QR Code como imagem PNG
curl -X GET "http://localhost:3000/session/qr/minha_sessao/image" \
  -H "x-api-key: minha_chave_secreta_123" \
  --output qrcode.png
```

#### Verificar Status da Sessão
```bash
curl -X GET "http://localhost:3000/session/status/minha_sessao" \
  -H "x-api-key: minha_chave_secreta_123"
```

### 2. Envio de Mensagens

#### Mensagem de Texto Simples
```bash
curl -X POST "http://localhost:3000/client/sendMessage/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "chatId": "5511999999999@c.us",
    "message": "Olá! Esta é uma mensagem de teste."
  }'
```

#### Mensagem com Mídia (Imagem)
```bash
curl -X POST "http://localhost:3000/client/sendMessage/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "chatId": "5511999999999@c.us",
    "message": {
      "media": "https://example.com/imagem.jpg",
      "caption": "Legenda da imagem"
    }
  }'
```

#### Mensagem para Grupo
```bash
curl -X POST "http://localhost:3000/client/sendMessage/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "chatId": "123456789-987654321@g.us",
    "message": "Mensagem para o grupo!"
  }'
```

### 3. Gerenciamento de Contatos

#### Listar Todos os Contatos
```bash
curl -X GET "http://localhost:3000/client/getContacts/minha_sessao" \
  -H "x-api-key: minha_chave_secreta_123"
```

#### Obter Informações de um Contato
```bash
curl -X POST "http://localhost:3000/client/getContactById/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "contactId": "5511999999999@c.us"
  }'
```

#### Verificar se Número está no WhatsApp
```bash
curl -X POST "http://localhost:3000/client/isRegisteredUser/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "contactId": "5511999999999@c.us"
  }'
```

### 4. Gerenciamento de Grupos

#### Criar Novo Grupo
```bash
curl -X POST "http://localhost:3000/client/createGroup/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "name": "Meu Grupo de Teste",
    "participants": [
      "5511999999999@c.us",
      "5511888888888@c.us"
    ]
  }'
```

#### Adicionar Participante ao Grupo
```bash
curl -X POST "http://localhost:3000/groupChat/addParticipants/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "chatId": "123456789-987654321@g.us",
    "participants": ["5511777777777@c.us"]
  }'
```

#### Obter Link de Convite do Grupo
```bash
curl -X POST "http://localhost:3000/groupChat/getInviteCode/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "chatId": "123456789-987654321@g.us"
  }'
```

### 5. Operações com Mensagens

#### Reagir a uma Mensagem
```bash
curl -X POST "http://localhost:3000/message/react/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "messageId": "true_5511999999999@c.us_ABC123DEF456",
    "reaction": "👍"
  }'
```

#### Encaminhar Mensagem
```bash
curl -X POST "http://localhost:3000/message/forward/minha_sessao" \
  -H "Content-Type: application/json" \
  -H "x-api-key: minha_chave_secreta_123" \
  -d '{
    "messageId": "true_5511999999999@c.us_ABC123DEF456",
    "chatId": "5511888888888@c.us"
  }'
```

## Exemplos de Integração

### 1. Node.js com Axios

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'minha_chave_secreta_123';
const SESSION_ID = 'minha_sessao';

// Configuração padrão do Axios
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Iniciar sessão
async function startSession() {
  try {
    const response = await api.get(`/session/start/${SESSION_ID}`);
    console.log('Sessão iniciada:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error.response.data);
  }
}

// Enviar mensagem
async function sendMessage(chatId, message) {
  try {
    const response = await api.post(`/client/sendMessage/${SESSION_ID}`, {
      chatId,
      message
    });
    console.log('Mensagem enviada:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response.data);
  }
}

// Exemplo de uso
async function main() {
  await startSession();
  
  // Aguardar QR code ser escaneado...
  setTimeout(async () => {
    await sendMessage('5511999999999@c.us', 'Olá do Node.js!');
  }, 30000); // 30 segundos para escanear QR
}

main();
```

### 2. Python com Requests

```python
import requests
import time

API_BASE = 'http://localhost:3000'
API_KEY = 'minha_chave_secreta_123'
SESSION_ID = 'minha_sessao'

headers = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
}

# Iniciar sessão
def start_session():
    response = requests.get(f'{API_BASE}/session/start/{SESSION_ID}', headers=headers)
    if response.status_code == 200:
        print('Sessão iniciada:', response.json())
        return True
    else:
        print('Erro ao iniciar sessão:', response.json())
        return False

# Obter QR Code
def get_qr_code():
    response = requests.get(f'{API_BASE}/session/qr/{SESSION_ID}', headers=headers)
    if response.status_code == 200:
        qr_data = response.json()
        print('QR Code:', qr_data['qr'])
        return qr_data['qr']
    else:
        print('Erro ao obter QR:', response.json())
        return None

# Enviar mensagem
def send_message(chat_id, message):
    data = {
        'chatId': chat_id,
        'message': message
    }
    response = requests.post(f'{API_BASE}/client/sendMessage/{SESSION_ID}', 
                           headers=headers, json=data)
    if response.status_code == 200:
        print('Mensagem enviada:', response.json())
        return True
    else:
        print('Erro ao enviar mensagem:', response.json())
        return False

# Exemplo de uso
if __name__ == '__main__':
    if start_session():
        qr = get_qr_code()
        if qr:
            print('Escaneie o QR Code e aguarde...')
            time.sleep(30)  # Aguardar 30 segundos
            send_message('5511999999999@c.us', 'Olá do Python!')
```

### 3. Webhook Handler (Express.js)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Endpoint para receber webhooks
app.post('/webhook', (req, res) => {
  const { sessionId, event, data } = req.body;
  
  console.log(`Webhook recebido para sessão ${sessionId}:`);
  console.log(`Evento: ${event}`);
  console.log('Dados:', data);
  
  switch (event) {
    case 'qr':
      console.log('QR Code gerado:', data.qr);
      // Salvar QR code ou enviá-lo para o frontend
      break;
      
    case 'authenticated':
      console.log('Sessão autenticada com sucesso!');
      break;
      
    case 'ready':
      console.log('Cliente pronto para uso!');
      break;
      
    case 'message':
      console.log('Nova mensagem recebida:', data.message);
      // Processar mensagem recebida
      handleIncomingMessage(sessionId, data.message);
      break;
      
    case 'message_ack':
      console.log('Confirmação de mensagem:', data.ack);
      break;
      
    default:
      console.log('Evento desconhecido:', event);
  }
  
  res.status(200).send('OK');
});

function handleIncomingMessage(sessionId, message) {
  // Exemplo: responder automaticamente
  if (message.body === 'oi') {
    sendAutoReply(sessionId, message.from, 'Olá! Como posso ajudar?');
  }
}

async function sendAutoReply(sessionId, chatId, replyMessage) {
  // Implementar envio de resposta automática
  console.log(`Enviando resposta automática para ${chatId}: ${replyMessage}`);
}

app.listen(3001, () => {
  console.log('Webhook handler rodando na porta 3001');
});
```

## Resolução de Problemas Comuns

### 1. Sessão não conecta
```bash
# Verificar status
curl -X GET "http://localhost:3000/session/status/minha_sessao" \
  -H "x-api-key: minha_chave_secreta_123"

# Se necessário, reiniciar sessão
curl -X GET "http://localhost:3000/session/terminate/minha_sessao" \
  -H "x-api-key: minha_chave_secreta_123"

curl -X GET "http://localhost:3000/session/start/minha_sessao" \
  -H "x-api-key: minha_chave_secreta_123"
```

### 2. Limpar sessões inativas
```bash
curl -X GET "http://localhost:3000/session/terminateInactive" \
  -H "x-api-key: minha_chave_secreta_123"
```

### 3. Health Check
```bash
curl -X GET "http://localhost:3000/ping"
```

## Monitoramento e Logs

### Logs importantes para acompanhar:
- Inicialização de sessões
- Eventos de autenticação
- Envio e recebimento de mensagens
- Erros de conexão
- Webhooks enviados

### Exemplo de estrutura de log:
```
[2024-01-15 10:30:15] INFO: Session minha_sessao started
[2024-01-15 10:30:20] INFO: QR code generated for session minha_sessao
[2024-01-15 10:30:45] INFO: Session minha_sessao authenticated
[2024-01-15 10:30:46] INFO: Session minha_sessao ready
[2024-01-15 10:31:00] INFO: Message sent from minha_sessao to 5511999999999@c.us
[2024-01-15 10:31:05] INFO: Webhook sent: message_ack for session minha_sessao
```

---

*Este guia fornece exemplos práticos para começar a usar o WhatsApp Backend API. Para documentação técnica completa, consulte [COMO_FUNCIONA.md](./COMO_FUNCIONA.md) e [ARCHITECTURE.md](./ARCHITECTURE.md).*