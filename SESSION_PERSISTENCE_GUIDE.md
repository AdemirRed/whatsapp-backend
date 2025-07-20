# Guia para Resolver Problemas de Persistência de Sessões no Render

## 🔍 Problema Identificado
O WhatsApp não está salvando a conexão no Render, exigindo scan do QR code a cada reinicialização.

## ✅ Soluções Implementadas

### 1. **Persistent Disk Configurado**
```yaml
# render.yaml
disk:
  name: sessions-data
  mountPath: /app/sessions
  sizeGB: 1
```

### 2. **Caminho de Sessões Corrigido**
```env
SESSIONS_PATH=/app/sessions  # Caminho absoluto no container
```

### 3. **Dockerfile Otimizado**
- Script de inicialização personalizado
- Permissões corretas para o diretório
- Verificações de saúde das sessões

### 4. **Script de Verificação**
- `check-sessions.js` para debug
- Logs detalhados na inicialização

## 🚀 Como Aplicar as Correções

### Passo 1: Commit das Alterações
```bash
git add .
git commit -m "Fix session persistence on Render - add persistent disk support"
git push origin main
```

### Passo 2: Configurar Persistent Disk no Render

#### Opção A: Via render.yaml (Automático)
✅ Já está configurado no arquivo `render.yaml`

#### Opção B: Via Dashboard (Manual)
1. Acesse seu serviço no dashboard do Render
2. Vá para "Settings" → "Disks"
3. Clique em "Add Disk":
   ```
   Name: sessions-data
   Mount Path: /app/sessions
   Size: 1 GB
   ```
4. Salve e redeploy

### Passo 3: Verificar Variáveis de Ambiente
No dashboard do Render, confirme:
```
NODE_ENV=production
SESSIONS_PATH=/app/sessions
RECOVER_SESSIONS=TRUE
```

### Passo 4: Redeploy e Teste
1. Aguarde o deploy completar
2. Acesse: https://whatsapp-backend-ytrb.onrender.com/ping
3. Verifique os logs para confirmar criação do diretório

## 🔧 Como Testar se Funciona

### 1. Primeira Conexão
```bash
# Criar uma sessão
POST https://whatsapp-backend-ytrb.onrender.com/session/start/test123
```

### 2. Verificar QR Code
```bash
# Obter QR Code
GET https://whatsapp-backend-ytrb.onrender.com/session/qr/test123
```

### 3. Escanear e Conectar
- Use o WhatsApp para escanear o QR
- Aguarde conexão ser estabelecida

### 4. Verificar Persistência
```bash
# Verificar status
GET https://whatsapp-backend-ytrb.onrender.com/session/status/test123

# Deve retornar: {"success": true, "state": "CONNECTED"}
```

### 5. Teste de Reinicialização
1. Force um redeploy no Render (ou aguarde hibernação/despertar)
2. Verifique se a sessão ainda está conectada sem precisar escanear novamente

## 📊 Monitoramento de Sessões

### Verificar via Logs
Procure por essas mensagens nos logs do Render:
```
✅ Diretório de sessões configurado
📂 Sessão encontrada: session-test123
✅ Sessão parece válida
🔄 Produção detectada - sessões serão persistidas
```

### Verificar via API
```bash
# Health check com informações de sessão
GET https://whatsapp-backend-ytrb.onrender.com/ping
```

## ⚠️ Problemas Comuns e Soluções

### 1. **Persistent Disk não foi criado**
**Sintoma**: Logs mostram "Diretório não existe"
**Solução**: 
- Vá no dashboard → Settings → Disks
- Adicione manualmente o disk conforme instruções acima

### 2. **Permissões negadas**
**Sintoma**: Erro de escrita no diretório `/app/sessions`
**Solução**: 
- O Dockerfile já corrige isso
- Se persistir, use runtime "Node" em vez de "Docker"

### 3. **Sessão não persiste após hibernação**
**Sintoma**: Plano gratuito hiberna e perde sessão
**Solução**: 
- Upgrade para plano Starter ($7/mês)
- Ou use um serviço de "ping" para manter ativo

### 4. **Arquivos de sessão corrompidos**
**Sintoma**: Sessão existe mas não conecta
**Solução**: 
```bash
# Deletar sessão corrompida
DELETE https://whatsapp-backend-ytrb.onrender.com/session/terminate/test123

# Criar nova sessão
POST https://whatsapp-backend-ytrb.onrender.com/session/start/test123
```

## 🎯 Configuração Recomendada Final

### render.yaml:
```yaml
services:
  - type: web
    name: whatsapp-api
    plan: starter  # IMPORTANTE: não usar free para WhatsApp
    disk:
      name: sessions-data
      mountPath: /app/sessions
      sizeGB: 1
    envVars:
      - key: SESSIONS_PATH
        value: "/app/sessions"
      - key: RECOVER_SESSIONS  
        value: "TRUE"
```

### Variáveis Críticas:
```env
NODE_ENV=production
SESSIONS_PATH=/app/sessions
RECOVER_SESSIONS=TRUE
```

## 📞 URLs para Testar Após Deploy:
- **Health**: https://whatsapp-backend-ytrb.onrender.com/ping
- **Swagger**: https://whatsapp-backend-ytrb.onrender.com/api-docs/
- **Iniciar Sessão**: POST `/session/start/{sessionId}`
- **Status**: GET `/session/status/{sessionId}`
- **QR Code**: GET `/session/qr/{sessionId}`

Com essas configurações, suas sessões do WhatsApp devem persistir entre reinicializações no Render! 🎉
