# 🐳 Configuração Docker para Render - Guia Completo

## 📋 Checklist de Configuração

### ✅ Informações Básicas:
- **Name**: `whatsapp-backend-1`
- **Source Code**: `AdemirRed/whatsapp-backend`
- **Branch**: `main`
- **Language**: `Docker`
- **Region**: `Oregon (US West)`

### ✅ Configurações Docker:
```
Root Directory: . (ou deixe vazio)
Dockerfile Path: ./Dockerfile.simple
Docker Build Context Directory: . (ou deixe vazio)
Docker Command: (deixe vazio)
Pre-Deploy Command: (deixe vazio)
Health Check Path: /ping
```

### ✅ Environment Variables (copie e cole uma por vez):
```
NODE_ENV=production
PORT=3000
API_KEY=154466
SESSION_ID=154466
BASE_WEBHOOK_URL=https://whatsapp-backend-1-0eqq.onrender.com/localCallbackExample
ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=1000
MAX_ATTACHMENT_SIZE=10000000
SET_MESSAGES_AS_SEEN=TRUE
DISABLED_CALLBACKS=message_ack|message_reaction
WEB_VERSION=2.2328.5
WEB_VERSION_CACHE_TYPE=none
RECOVER_SESSIONS=TRUE
SESSIONS_PATH=/app/sessions
ENABLE_SWAGGER_ENDPOINT=TRUE
```

### ✅ Persistent Disk (MUITO IMPORTANTE!):
```
Click "Add disk" em Advanced:
Name: sessions-data
Mount Path: /app/sessions  
Size: 1 GB
```

### ✅ Auto-Deploy:
```
On Commit: Yes (recomendado)
```

## 🚀 Após Criar o Serviço:

### 1. Aguardar Build Completo
- O primeiro build pode demorar 5-10 minutos
- Monitore os logs em tempo real

### 2. Verificar se Funcionou:
```bash
# Health Check
https://whatsapp-backend-1-0eqq.onrender.com/ping

# Swagger Documentation  
https://whatsapp-backend-1-0eqq.onrender.com/api-docs/

# Iniciar sessão (via POST)
https://whatsapp-backend-1-0eqq.onrender.com/session/start/test123
```

## ⚠️ Problemas Comuns e Soluções:

### 1. **Build Failed - Error 1**
- Verifique se `Dockerfile.simple` existe no repositório
- Confirme que todas as alterações foram commitadas

### 2. **502 Bad Gateway**
- Verifique se PORT=3000 está nas variáveis de ambiente
- Confirme Health Check Path: `/ping`

### 3. **Puppeteer não funciona**  
- O `Dockerfile.simple` já resolve isso com Chromium
- Verifique logs por erros de permissão

### 4. **Sessões não persistem**
- ESSENCIAL: Configure o Persistent Disk
- Verifique se SESSIONS_PATH=/app/sessions

## 🔍 Como Monitorar:

### Logs em Tempo Real:
1. Vá para o dashboard do seu serviço
2. Clique em "Logs"  
3. Procure por:
   ```
   ✅ Diretório de sessões configurado
   🚀 Server running on port 3000
   📊 Health check available at: /ping
   ```

### Verificar se está funcionando:
```bash
# Teste básico
curl https://whatsapp-backend-1-0eqq.onrender.com/ping

# Deve retornar:
{"success": true, "message": "pong"}
```

## 💡 Dicas Importantes:

### 1. **Plano Recomendado:**
- **Starter ($7/mês)** - Evita hibernação
- **Free** - Hiberna após 15 min (não recomendado para WhatsApp)

### 2. **Primeiro Deploy:**
- Pode demorar até 10 minutos
- Seja paciente com o build do Docker

### 3. **Variáveis de Ambiente:**
- Adicione uma por uma no painel
- Não use aspas nos valores
- Verifique se não há espaços extras

### 4. **Health Check:**
- Essencial para o Render saber se está funcionando
- `/ping` deve retornar status 200

## 🎯 URLs Finais (após deploy):
- **API**: https://whatsapp-backend-1-0eqq.onrender.com
- **Health**: https://whatsapp-backend-1-0eqq.onrender.com/ping
- **Docs**: https://whatsapp-backend-1-0eqq.onrender.com/api-docs/
- **Webhook**: https://whatsapp-backend-1-0eqq.onrender.com/localCallbackExample

## 🔄 Se ainda não funcionar:

### Plano B - Node.js (sem Docker):
1. Mude Language para "Node"
2. Build Command: `npm install`  
3. Start Command: `node server.js`
4. Mantenha as mesmas variáveis de ambiente
