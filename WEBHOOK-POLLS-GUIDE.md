# 📊 Sistema de Captura de Votos de Enquetes via Webhook

A biblioteca **whatsapp-web.js** já possui suporte nativo para capturar votos de enquetes através do evento `vote_update`. Este guia mostra como configurar e usar esse recurso.

## 🎯 Como Funciona

1. **Evento Nativo**: A biblioteca monitora automaticamente votos em enquetes
2. **Webhook Automático**: Quando alguém vota, o evento `vote_update` é disparado
3. **Notificação Instantânea**: Sua aplicação recebe os dados do voto via webhook
4. **Processamento Personalizado**: Você processa os votos como desejar

## 🔧 Configuração

### 1. Configurar Webhook na API WhatsApp

No arquivo `.env` da API:

```bash
# URL onde você quer receber os webhooks de votos
BASE_WEBHOOK_URL=http://localhost:3001/webhook/vote

# Não desabilitar o evento vote_update
DISABLED_CALLBACKS=message_ack|message_reaction

# Outras configurações
API_KEY=redblack
PORT=200
```

### 2. Criar Servidor de Webhook

Use o arquivo `webhook-example.js` como base ou crie seu próprio servidor:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook/vote', (req, res) => {
    const { sessionId, event, payload } = req.body;
    
    if (event === 'vote_update') {
        const { vote } = payload;
        
        console.log('Novo voto recebido:');
        console.log('- Votante:', vote.voter);
        console.log('- Timestamp:', vote.interractedAtTs);
        console.log('- Enquete:', vote.parentMsgKey);
        
        // Processar o voto
        processVote(sessionId, vote);
    }
    
    res.status(200).json({ received: true });
});

app.listen(3001);
```

## 📊 Estrutura dos Dados Recebidos

Quando alguém vota em uma enquete, você recebe:

```json
{
  "sessionId": "redblack",
  "event": "vote_update",
  "payload": {
    "vote": {
      "voter": "5511999999999@c.us",
      "interractedAtTs": 1698765432,
      "parentMsgKey": {
        "id": "3EB0123456789ABCDEF",
        "fromMe": false,
        "_serialized": "false_5511999999999@c.us_3EB0123456789ABCDEF"
      },
      "parentMessage": {
        // Objeto completo da mensagem da enquete
        "id": "...",
        "body": "Qual sua cor favorita?",
        "type": "poll_creation",
        // ... outros dados
      }
    }
  }
}
```

## 🚀 Implementação Completa

### 1. Iniciar o Webhook Server

```bash
node webhook-example.js
```

### 2. Iniciar a API WhatsApp

```bash
npm start
```

### 3. Criar uma Enquete

```bash
curl -X POST http://localhost:200/client/sendMessage/redblack \
  -H "x-api-key: redblack" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "5511999999999@c.us",
    "contentType": "Poll",
    "content": {
      "pollName": "Qual sua cor favorita?",
      "pollOptions": ["Azul", "Verde", "Vermelho", "Amarelo"],
      "options": {
        "allowMultipleAnswers": false
      }
    }
  }'
```

### 4. Votar na Enquete

Quando alguém votar usando o WhatsApp, você receberá automaticamente o webhook!

## 💡 Casos de Uso

### 1. Sistema de Feedback em Tempo Real

```javascript
function processVote(sessionId, vote) {
    // Atualizar dashboard em tempo real
    updateDashboard(vote.parentMsgKey.id, vote.voter);
    
    // Notificar administradores
    notifyAdmins(`Novo voto recebido de ${vote.voter}`);
}
```

### 2. Análise de Sentimentos

```javascript
function processVote(sessionId, vote) {
    // Buscar qual opção foi escolhida
    const selectedOption = getSelectedOption(vote);
    
    // Analisar sentimento
    if (selectedOption === 'Satisfeito') {
        incrementPositiveFeedback();
    }
}
```

### 3. Sistema de Enquetes Corporativas

```javascript
function processVote(sessionId, vote) {
    // Salvar no banco de dados
    database.votes.insert({
        pollId: vote.parentMsgKey.id,
        voter: vote.voter,
        timestamp: vote.interractedAtTs,
        sessionId: sessionId
    });
    
    // Verificar se enquete foi finalizada
    checkPollCompletion(vote.parentMsgKey.id);
}
```

## 🛠️ Funcionalidades Avançadas

### 1. Filtrar por Sessão

```javascript
app.post('/webhook/vote', (req, res) => {
    const { sessionId } = req.body;
    
    // Processar apenas votações de sessões específicas
    if (sessionId === 'empresa-rh') {
        processHRVote(req.body);
    } else if (sessionId === 'suporte-cliente') {
        processSupportVote(req.body);
    }
});
```

### 2. Rastreamento de Múltiplos Votos

```javascript
const userVotes = new Map();

function processVote(sessionId, vote) {
    const userId = vote.voter;
    const pollId = vote.parentMsgKey.id;
    
    if (!userVotes.has(userId)) {
        userVotes.set(userId, new Set());
    }
    
    userVotes.get(userId).add(pollId);
    
    console.log(`Usuário ${userId} já votou em ${userVotes.get(userId).size} enquetes`);
}
```

## 🔍 Debug e Monitoramento

### 1. Log Completo dos Webhooks

```javascript
app.post('/webhook/vote', (req, res) => {
    // Log completo para debug
    console.log('=== WEBHOOK RECEBIDO ===');
    console.log(JSON.stringify(req.body, null, 2));
    
    // Salvar em arquivo de log
    fs.appendFileSync('votes.log', JSON.stringify(req.body) + '\n');
    
    res.status(200).json({ received: true });
});
```

### 2. Verificar Status do Webhook

```bash
# Testar se o webhook está funcionando
curl http://localhost:3001/webhook/test
```

## ✅ Vantagens do Sistema Nativo

1. **Automático**: Não precisa fazer polling ou verificações manuais
2. **Tempo Real**: Recebe notificações instantâneas quando alguém vota
3. **Completo**: Recebe todos os dados necessários sobre o voto
4. **Confiável**: Usa a infraestrutura nativa da biblioteca WhatsApp
5. **Escalável**: Funciona para múltiplas sessões simultaneamente

## 🎉 Pronto!

Agora você tem um sistema completo para capturar votos de enquetes do WhatsApp em tempo real via webhooks! 

**Não precisa modificar o HTML** - o sistema funciona através de webhooks automáticos que você pode processar em qualquer aplicação backend.