# Configuração Manual no Render

## Método 1: Usando o Painel Web (Recomendado para resolver o erro atual)

### Passo a Passo:

1. **Acesse https://render.com e faça login**

2. **Crie um novo Web Service:**
   - Clique em "New +" → "Web Service"
   - Conecte ao GitHub se ainda não conectou
   - Selecione o repositório `AdemirRed/whatsapp-backend`

3. **Configurações Básicas:**
   ```
   Name: whatsapp-backend
   Region: Oregon (US West) ou a mais próxima
   Branch: main
   Runtime: Docker
   ```

4. **Configurações do Docker:**
   ```
   Dockerfile Path: ./Dockerfile.simple
   Docker Build Context Directory: ./
   ```

5. **Plano:**
   ```
   Instance Type: Starter ($7/mês) - Recomendado para WhatsApp
   ```

6. **Variáveis de Ambiente:**
   ```
   NODE_ENV=production
   API_KEY=redblack
   BASE_WEBHOOK_URL=https://whatsapp-backend-gk8p.onrender.com/localCallbackExample
   ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE
   MAX_ATTACHMENT_SIZE=5000000
   SET_MESSAGES_AS_SEEN=TRUE
   DISABLED_CALLBACKS=message_ack
   ENABLE_SWAGGER_ENDPOINT=TRUE
   PORT=3000
   ```

7. **Configurações Avançadas:**
   ```
   Auto-Deploy: Yes
   Health Check Path: /ping
   ```

8. **Persistent Disk (Opcional):**
   ```
   Name: whatsapp-sessions
   Mount Path: /app/sessions
   Size: 1 GB
   ```

## Método 2: Se o Docker continuar falhando - Deploy direto Node.js

### Configurações:
```
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### Variáveis de Ambiente (as mesmas de cima)

### Adicionar no package.json (se necessário):
```json
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

## Solucionando Problemas Comuns:

### 1. Erro de Build Status 1:
- Use `Dockerfile.simple` em vez de `Dockerfile.render`
- Verifique se todos os arquivos foram commitados
- Tente o deploy direto Node.js

### 2. Erro de Módulos:
- Certifique-se que `package.json` e `package-lock.json` existem
- Use `npm ci` em vez de `npm install`

### 3. Timeout no Health Check:
- Aumente o tempo no Health Check Path
- Verifique se `/ping` está respondendo

### 4. Problemas de Puppeteer:
- Use Alpine Linux (Dockerfile.simple)
- Configure corretamente as variáveis do Chrome

## URLs após Deploy:
- **API Principal**: https://whatsapp-backend-gk8p.onrender.com
- **Health Check**: https://whatsapp-backend-gk8p.onrender.com/ping  
- **Swagger Docs**: https://whatsapp-backend-gk8p.onrender.com/api-docs
- **Webhook Local**: https://whatsapp-backend-gk8p.onrender.com/localCallbackExample

## Comandos Git para Atualizar:
```bash
git add .
git commit -m "Update Render configuration - fix build issues"
git push origin main
```

## Verificação de Status:
1. Aguarde o deploy completar (pode levar 5-10 minutos)
2. Teste o endpoint: https://whatsapp-backend-gk8p.onrender.com/ping
3. Se funcionar, teste o Swagger: https://whatsapp-backend-gk8p.onrender.com/api-docs
