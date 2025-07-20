# Troubleshooting Erro 502 no Render

## Diagnóstico do Problema

O erro 502 "Bad Gateway" indica que o Render não consegue se comunicar com sua aplicação. Possíveis causas:

### 1. **Porta Incorreta**
- ✅ **Corrigido**: Server.js agora usa `0.0.0.0` e porta do Render
- ✅ **Corrigido**: render.yaml configurado com PORT=3000

### 2. **Aplicação não está iniciando**
- Verifique os logs no painel do Render
- Procure por erros de dependências ou configuração

### 3. **Health Check falhando**
- URL: `https://whatsapp-backend-ytrb.onrender.com/ping`
- Deve retornar: `{"success": true, "message": "pong"}`

## Como Verificar e Corrigir:

### Passo 1: Verificar Logs no Render
1. Acesse https://dashboard.render.com
2. Entre no seu serviço `whatsapp-backend`
3. Clique em "Logs" 
4. Procure por erros como:
   ```
   Error: Cannot find module 'express'
   EADDRINUSE: address already in use
   BASE_WEBHOOK_URL environment variable is not available
   ```

### Passo 2: Redeploy com Configurações Corretas
```bash
git add .
git commit -m "Fix 502 error - update port and server configuration"  
git push origin main
```

### Passo 3: Verificar Variáveis de Ambiente
No painel do Render, confirme se estão configuradas:
```
NODE_ENV=production
PORT=3000  (importante!)
API_KEY=154466
BASE_WEBHOOK_URL=https://whatsapp-backend-ytrb.onrender.com/localCallbackExample
ENABLE_SWAGGER_ENDPOINT=TRUE
```

### Passo 4: Testar Endpoints
Após deploy bem-sucedido:

1. **Health Check**: 
   ```
   https://whatsapp-backend-ytrb.onrender.com/ping
   ```
   Resposta esperada: `{"success": true, "message": "pong"}`

2. **Swagger Docs**:
   ```
   https://whatsapp-backend-ytrb.onrender.com/api-docs/
   ```

### Passo 5: Se ainda não funcionar

#### Opção A: Deploy sem Docker
1. No Render, mude para:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

#### Opção B: Verificar Dockerfile
- Use `Dockerfile.simple` (já configurado no render.yaml)
- Verifique se não há conflitos de porta

## Comandos de Debug

### Localmente:
```bash
# Testar se a aplicação inicia
npm install
npm start

# Verificar se swagger.json existe
ls -la swagger.json

# Testar endpoint
curl http://localhost:3000/ping
```

### No Render (via logs):
- Procure por `Server running on port`
- Verifique se não há erros de módulos não encontrados

## URLs Finais (após correção):
- **API**: https://whatsapp-backend-ytrb.onrender.com
- **Ping**: https://whatsapp-backend-ytrb.onrender.com/ping  
- **Swagger**: https://whatsapp-backend-ytrb.onrender.com/api-docs/
- **Callback**: https://whatsapp-backend-ytrb.onrender.com/localCallbackExample

## Se o Swagger ainda apresentar problemas:

### Gerar novo swagger.json:
```bash
npm run swagger
```

### Verificar se swagger-ui-express está instalado:
```bash
npm list swagger-ui-express
```

## Solução Rápida (se tudo mais falhar):
1. Delete o serviço atual no Render
2. Crie um novo Web Service  
3. Use as configurações do arquivo `RENDER_MANUAL_CONFIG.md`
4. Configure Runtime como "Node" em vez de "Docker"
