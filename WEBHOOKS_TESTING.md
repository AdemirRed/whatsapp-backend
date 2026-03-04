# 🧪 Teste do Sistema de Múltiplos Webhooks

## Configuração para Testes

### 1. Configure o .env

```env
# Webhook principal
BASE_WEBHOOK_URL=http://localhost:3000/api/webhook

# Webhooks adicionais (exemplo com 2 IPs diferentes)
ADDITIONAL_WEBHOOKS=http://192.168.1.100:3000/webhook,http://192.168.1.101:3000/webhook

# Webhook local para debug
LOCAL_WEBHOOK_ENABLED=TRUE
LOCAL_WEBHOOK_URL=http://localhost:3000/api/webhook/local

# Habilitar logs detalhados
VERBOSE_LOGS=true

# Habilitar callback local
ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE
```

### 2. Inicie o servidor

```powershell
node server.js
```

### 3. Inicie uma sessão

```powershell
$headers = @{
    "x-api-key" = "redblack"
}

Invoke-WebRequest -Uri "whatsapp-backend-production-9cdd.up.railway.app/session/start/teste" -Headers $headers
```

## 📊 Verificando os Webhooks

### Logs no Console

Com `VERBOSE_LOGS=true`, você verá:

```
📤 [Webhook] qr → 3 destino(s)
✅ [Webhook] qr → webhook/local
❌ [Webhook Error] webhook → connect ECONNREFUSED 192.168.1.100:3000
❌ [Webhook Error] webhook → connect ECONNREFUSED 192.168.1.101:3000
```

> **Nota**: É normal ver erros de conexão se os IPs adicionais não estiverem disponíveis.

### Webhook Local de Debug

O webhook local (`/api/webhook/local`) mostra informações detalhadas:

```
============================================================
🔔 [WEBHOOK LOCAL] 2026-01-14T12:30:45.123Z
📱 Sessão: teste
📋 Tipo: qr
============================================================

📱 QR Code para conexão:

█▀▀▀▀▀█ ▀▄█▀█ █▀▀▀▀▀█
█ ███ █ ██ ▄▀ █ ███ █
█ ▀▀▀ █ █▀  █ █ ▀▀▀ █
...
```

### Arquivo de Log

Verifique o arquivo `sessions/webhook_local_log.txt`:

```json
{
  "timestamp": "2026-01-14T12:30:45.123Z",
  "sessionId": "teste",
  "dataType": "qr",
  "data": {
    "qr": "2@..."
  }
}
================================================================================
```

## 🎯 Testando Eventos Específicos

### Evento de Mensagem

Quando uma mensagem chegar, você verá:

```
============================================================
🔔 [WEBHOOK LOCAL] 2026-01-14T12:35:10.456Z
📱 Sessão: teste
📋 Tipo: message
============================================================
💬 Mensagem de: 555197756708@c.us
📝 Conteúdo: Olá, teste!
```

### Evento Ready

Quando a sessão conectar:

```
============================================================
🔔 [WEBHOOK LOCAL] 2026-01-14T12:31:00.789Z
📱 Sessão: teste
📋 Tipo: ready
============================================================
✅ Cliente conectado e pronto!
```

## 🔧 Criando Seu Próprio Webhook de Teste

### Servidor Express Simples

Crie um arquivo `webhook-test-server.js`:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const { dataType, data, sessionId } = req.body;
  
  console.log(`[${new Date().toISOString()}] Webhook recebido:`);
  console.log(`  Sessão: ${sessionId}`);
  console.log(`  Tipo: ${dataType}`);
  console.log(`  Dados:`, JSON.stringify(data, null, 2));
  
  res.json({ success: true });
});

app.listen(3001, () => {
  console.log('Servidor de webhook teste rodando na porta 3001');
});
```

Execute:

```powershell
node webhook-test-server.js
```

Adicione no `.env`:

```env
ADDITIONAL_WEBHOOKS=http://localhost:3001/webhook
```

## 📝 Webhooks Específicos por Sessão

### Exemplo: Diferentes webhooks para diferentes sessões

`.env`:

```env
BASE_WEBHOOK_URL=http://localhost:3000/api/webhook

# Webhook específico para sessão "pedro"
PEDRO_WEBHOOK_URL=http://192.168.1.200:3000/webhook/pedro

# Webhook específico para sessão "vanessa"
VANESSA_WEBHOOK_URL=http://192.168.1.201:3000/webhook/vanessa

# Webhook local (recebe de todas as sessões)
LOCAL_WEBHOOK_ENABLED=TRUE
LOCAL_WEBHOOK_URL=http://localhost:3000/api/webhook/local
```

Quando a sessão "pedro" enviar eventos:
- ✅ `http://192.168.1.200:3000/webhook/pedro` (específico)
- ✅ `http://localhost:3000/api/webhook/local` (local)

Quando a sessão "vanessa" enviar eventos:
- ✅ `http://192.168.1.201:3000/webhook/vanessa` (específico)
- ✅ `http://localhost:3000/api/webhook/local` (local)

## ⚠️ Solução de Problemas

### Webhook não está recebendo eventos

1. Verifique se o servidor está rodando
2. Verifique se a URL está correta no `.env`
3. Ative `VERBOSE_LOGS=true` para ver tentativas
4. Verifique o arquivo `sessions/webhook_local_log.txt`

### Erro "ECONNREFUSED"

- O servidor do webhook não está rodando ou não está acessível
- Verifique firewall e portas
- Para teste local, use `localhost` ao invés de `127.0.0.1`

### Webhook duplicado

- O sistema remove automaticamente URLs duplicadas
- Se ainda ver duplicatas, verifique o `.env` para URLs repetidas

## 🚀 Produção

Para produção, desabilite o webhook local:

```env
LOCAL_WEBHOOK_ENABLED=FALSE
VERBOSE_LOGS=false
ENABLE_LOCAL_CALLBACK_EXAMPLE=FALSE
```

E configure apenas os webhooks necessários:

```env
BASE_WEBHOOK_URL=https://seu-servidor.com/webhook
ADDITIONAL_WEBHOOKS=https://backup-servidor.com/webhook
```
