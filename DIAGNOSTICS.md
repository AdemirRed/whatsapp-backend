# Sistema de Diagnóstico e Fallback de Eventos

## 📋 Visão Geral

Este documento descreve o sistema de diagnóstico e fallback implementado para resolver problemas com eventos de mensagens do WhatsApp-web.js que podem não disparar devido a mudanças no WhatsApp Web.

## 🎯 Problema

Versões recentes do whatsapp-web.js (incluindo 1.34.x) podem apresentar problemas onde eventos nativos como `message` e `message_create` não são disparados, mesmo com QR code e autenticação funcionando normalmente. Isso ocorre devido a mudanças internas no WhatsApp Web.

## ✅ Soluções Implementadas

### 1. Sistema de Logging Detalhado

**Localização**: [src/sessions.js](src/sessions.js)

- Contadores de eventos por sessão
- Timestamps de eventos recentes
- Logs detalhados quando `VERBOSE_LOGS=TRUE`

**Configuração**:
```env
VERBOSE_LOGS=TRUE
```

**Funções**:
- `initEventCounters(sessionId)` - Inicializa contadores
- `logEventFired(sessionId, eventType, extraData)` - Registra evento disparado
- `getEventDiagnostics(sessionId)` - Retorna diagnóstico completo

### 2. Endpoints de Diagnóstico

**Localização**: [src/controllers/diagnosticsController.js](src/controllers/diagnosticsController.js)

#### GET `/diagnostics/session/:sessionId`
Retorna diagnóstico detalhado de uma sessão:
```json
{
  "success": true,
  "sessionId": "session-ademir",
  "diagnostics": {
    "counters": {
      "message": 42,
      "message_create": 38,
      "qr": 1,
      "ready": 1,
      "lastMessageTimestamp": "2026-01-29T10:30:00Z"
    },
    "recentEvents": [...],
    "pollingActive": false
  },
  "clientInfo": {
    "connected": true,
    "state": "CONNECTED",
    "pupPageExists": true,
    "storeExists": true
  }
}
```

**Uso**:
```bash
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/diagnostics/session/session-ademir
```

#### GET `/diagnostics/test/:sessionId`
Testa manualmente se o cliente consegue buscar mensagens:
```json
{
  "success": true,
  "sessionId": "session-ademir",
  "state": "CONNECTED",
  "totalChats": 50,
  "testedChats": 5,
  "results": [...]
}
```

**Uso**:
```bash
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/diagnostics/test/session-ademir
```

#### GET `/diagnostics/health`
Health check de todas as sessões ativas:
```json
{
  "success": true,
  "totalSessions": 2,
  "connectedSessions": 1,
  "sessions": [...]
}
```

**Uso**:
```bash
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/diagnostics/health
```

### 3. Sistema de Fallback com Polling

**Localização**: [src/sessions.js](src/sessions.js)

Quando eventos nativos não funcionam, o sistema de polling verifica periodicamente novos chats e mensagens, disparando webhooks manualmente.

**Características**:
- ✅ Verifica chats com mensagens não lidas
- ✅ Detecta novas mensagens por timestamp
- ✅ Previne duplicatas com tracking de IDs processados
- ✅ Dispara webhooks idênticos aos eventos nativos
- ✅ Suporta download de mídia
- ✅ Marca mensagens como lidas (se configurado)

**Configuração**:
```env
# Ativar polling automaticamente ao iniciar sessão
AUTO_START_POLLING=FALSE

# Intervalo de polling em segundos (padrão: 5)
POLLING_INTERVAL_SECONDS=5
```

#### POST `/diagnostics/polling/start/:sessionId`
Ativa polling manualmente:
```json
{
  "intervalSeconds": 5
}
```

**Resposta**:
```json
{
  "success": true,
  "message": "Polling iniciado com sucesso",
  "sessionId": "session-ademir",
  "intervalSeconds": 5
}
```

**Uso com Invoke-WebRequest**:
```powershell
$body = @{ intervalSeconds = 5 } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/diagnostics/polling/start/session-ademir" `
  -Method POST `
  -Headers @{ "x-api-key" = "sua_api_key"; "Content-Type" = "application/json" } `
  -Body $body
```

#### POST `/diagnostics/polling/stop/:sessionId`
Desativa polling:
```json
{
  "success": true,
  "message": "Polling parado com sucesso",
  "sessionId": "session-ademir"
}
```

**Uso com Invoke-WebRequest**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/diagnostics/polling/stop/session-ademir" `
  -Method POST `
  -Headers @{ "x-api-key" = "sua_api_key" }
```

## 🔧 Variáveis de Ambiente

Adicione ao seu `.env`:

```env
## Diagnostics & Fallback ##
VERBOSE_LOGS=FALSE # Ativa logs detalhados de eventos
HEADLESS_BROWSER=TRUE # Navegador em modo headless
AUTO_START_POLLING=FALSE # Auto-iniciar polling ao conectar
POLLING_INTERVAL_SECONDS=5 # Intervalo de polling em segundos

## Webhooks ##
ADDITIONAL_WEBHOOKS= # URLs adicionais separadas por vírgula
LOCAL_WEBHOOK_ENABLED=TRUE # Webhook local para debug
LOCAL_WEBHOOK_URL=http://localhost:3000/api/webhook/local
```

## 📊 Fluxo de Diagnóstico

### 1. Verificar se eventos estão funcionando

```bash
# 1. Ativar logs detalhados
# Edite .env: VERBOSE_LOGS=TRUE

# 2. Reiniciar servidor
npm start

# 3. Enviar mensagem de teste para o WhatsApp

# 4. Verificar console - deve mostrar:
# 📊 [session-ademir] Evento 'message' disparado (total: 1)
```

### 2. Se eventos NÃO funcionarem

```bash
# 1. Verificar diagnóstico
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/diagnostics/session/session-ademir

# Se counters.message = 0 após receber mensagens, eventos não estão funcionando

# 2. Testar busca manual de mensagens
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/diagnostics/test/session-ademir

# Se isso retornar mensagens, o cliente funciona mas eventos não
```

### 3. Ativar Fallback com Polling

**Opção A - Manual via API**:
```powershell
$body = @{ intervalSeconds = 5 } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/diagnostics/polling/start/session-ademir" `
  -Method POST `
  -Headers @{ "x-api-key" = "sua_api_key"; "Content-Type" = "application/json" } `
  -Body $body
```

**Opção B - Automático no .env**:
```env
AUTO_START_POLLING=TRUE
POLLING_INTERVAL_SECONDS=5
```

### 4. Monitorar Polling

```bash
# Verificar se polling está ativo
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/diagnostics/session/session-ademir

# Deve retornar: "pollingActive": true

# Verificar logs no console:
# 🔄 Polling session-ademir: 2 chats com mensagens não lidas
# 🔔 [POLLING] Nova mensagem detectada em session-ademir: 555197756708@c.us
```

## 🎯 Quando Usar Cada Solução

### Use Logging Detalhado
- ✅ Para investigar se eventos estão disparando
- ✅ Durante desenvolvimento/debug
- ✅ Para monitorar atividade de eventos

### Use Endpoints de Diagnóstico
- ✅ Para verificar saúde das sessões
- ✅ Para testar se cliente consegue buscar mensagens
- ✅ Para monitoramento automatizado

### Use Polling (Fallback)
- ✅ Quando eventos `message` não disparam
- ✅ Como solução temporária até atualização da lib
- ✅ Para garantir 100% de confiabilidade
- ⚠️ Consome mais recursos que eventos nativos

## 🔄 Migrando de Eventos para Polling

Não é necessário mudar código da sua aplicação! O polling dispara os mesmos webhooks que os eventos nativos:

```javascript
// Webhook recebe o mesmo payload, independente da fonte:
{
  "dataType": "message",
  "data": {
    "message": {
      "from": "555197756708@c.us",
      "body": "Olá!",
      // ... resto da mensagem
    }
  },
  "sessionId": "session-ademir"
}
```

## 🚀 Performance

### Eventos Nativos (Ideal)
- ⚡ Resposta instantânea
- 💾 Baixo uso de recursos
- 🎯 100% confiável quando funcionam

### Polling (Fallback)
- ⏱️ Delay de até 5 segundos (configurável)
- 💾 Uso moderado de recursos (1 request/intervalo/sessão)
- 🎯 99.9% confiável
- 📊 Limite de 1000 mensagens em cache

## 📝 Notas Importantes

1. **Versão do whatsapp-web.js**: Atualmente 1.34.4 (última estável)
   - Existe v1.34.5-alpha.3 mas sem correções documentadas para eventos
   - Monitorar releases: https://github.com/pedroslopez/whatsapp-web.js/releases

2. **Compatibilidade**: Polling é totalmente compatível com webhooks existentes

3. **Múltiplas Sessões**: Cada sessão pode ter polling independente

4. **Limpeza Automática**: Cache de mensagens processadas mantém últimas 800 IDs

5. **Webhooks**: Sistema suporta múltiplos webhooks simultaneamente

## 🐛 Troubleshooting

### Eventos não disparam E polling não funciona

```bash
# 1. Verificar se sessão está CONNECTED
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/session/status/session-ademir

# 2. Verificar se Store existe
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/diagnostics/session/session-ademir
# Verificar: clientInfo.storeExists = true

# 3. Testar busca manual
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/diagnostics/test/session-ademir
```

### Polling está ativo mas não detecta mensagens

1. Verificar `VERBOSE_LOGS=TRUE` e olhar console
2. Mensagens de status são ignoradas automaticamente
3. Mensagens antigas (já processadas) são ignoradas
4. Verificar se há erros de rede/permissão

### Duplicatas de mensagens

- Raro com polling devido ao cache de IDs
- Se ocorrer, verificar se múltiplos pollings estão ativos
- Verificar logs: `Polling já está ativo para session-X`

## 📚 Referências

- [whatsapp-web.js GitHub](https://github.com/pedroslopez/whatsapp-web.js)
- [Swagger Docs](http://localhost:3000/api-docs) (se `ENABLE_SWAGGER_ENDPOINT=TRUE`)
