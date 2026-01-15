# Sistema de Múltiplos Webhooks

## 📋 Visão Geral

A API agora suporta o envio de eventos para múltiplos webhooks simultaneamente, permitindo que você:

- Configure um webhook principal
- Adicione webhooks adicionais para diferentes IPs/servidores
- Mantenha um webhook local para desenvolvimento/debug
- Sobrescreva webhooks por sessão específica

## ⚙️ Configuração

### 1. Webhook Principal (Obrigatório)

No arquivo `.env`:

```env
BASE_WEBHOOK_URL=http://192.168.1.100:3000/api/webhook
```

Este é o webhook principal que sempre receberá os eventos.

### 2. Webhooks Adicionais (Opcional)

Para adicionar múltiplos webhooks, separe-os por vírgula:

```env
ADDITIONAL_WEBHOOKS=http://192.168.1.101:3000/webhook,http://192.168.1.102:3000/webhook
```

### 3. Webhook Local (Opcional)

Para desenvolvimento e debug, você pode manter um webhook local:

```env
LOCAL_WEBHOOK_ENABLED=TRUE
LOCAL_WEBHOOK_URL=http://localhost:3000/api/webhook/local
```

### 4. Webhook por Sessão (Opcional)

Você pode sobrescrever o webhook para sessões específicas usando variáveis de ambiente:

```env
PEDRO_WEBHOOK_URL=http://192.168.1.200:3000/webhook/pedro
VANESSA_WEBHOOK_URL=http://192.168.1.201:3000/webhook/vanessa
```

## 📊 Exemplos de Configuração

### Exemplo 1: Produção com múltiplos servidores

```env
BASE_WEBHOOK_URL=http://servidor1.exemplo.com:3000/webhook
ADDITIONAL_WEBHOOKS=http://servidor2.exemplo.com:3000/webhook,http://servidor3.exemplo.com:3000/webhook
LOCAL_WEBHOOK_ENABLED=FALSE
```

Neste caso, todos os eventos serão enviados para os 3 servidores simultaneamente.

### Exemplo 2: Desenvolvimento local

```env
BASE_WEBHOOK_URL=http://localhost:3000/api/webhook
LOCAL_WEBHOOK_ENABLED=TRUE
LOCAL_WEBHOOK_URL=http://localhost:3000/api/webhook/debug
```

### Exemplo 3: Produção + Local + Específico por sessão

```env
BASE_WEBHOOK_URL=http://192.168.1.100:3000/webhook
ADDITIONAL_WEBHOOKS=http://192.168.1.101:3000/webhook
LOCAL_WEBHOOK_ENABLED=TRUE
LOCAL_WEBHOOK_URL=http://localhost:3000/api/webhook/local

# Webhook específico para a sessão "pedro"
PEDRO_WEBHOOK_URL=http://192.168.1.200:3000/webhook/pedro
```

Quando a sessão "pedro" enviar eventos:
- Enviará para `http://192.168.1.200:3000/webhook/pedro` (webhook específico da sessão)
- Enviará para `http://192.168.1.101:3000/webhook` (webhook adicional)
- Enviará para `http://localhost:3000/api/webhook/local` (webhook local)

## 🔍 Logs

Com `VERBOSE_LOGS=true`, você verá informações sobre o envio:

```
📤 [Webhook] message → 3 destino(s)
✅ [Webhook] message → webhook/pedro
✅ [Webhook] message → webhook
✅ [Webhook] message → webhook/local
```

## ⚠️ Observações Importantes

1. **Tolerância a Falhas**: Se um webhook falhar, os outros ainda serão chamados
2. **Timeout**: Cada webhook tem 5 segundos de timeout
3. **Erros 404**: Não são logados para evitar spam nos logs
4. **Duplicatas**: O sistema remove automaticamente URLs duplicadas
5. **Performance**: Os webhooks são chamados em paralelo para melhor performance

## 🐛 Correção do Erro `sendSeen`

O erro "Cannot read properties of undefined (reading 'markedUnread')" foi corrigido com:

1. Verificação se o chat existe antes de chamar `sendSeen()`
2. Try-catch para capturar e ignorar erros do `sendSeen`
3. Logs opcionais para debug (quando `VERBOSE_LOGS=true`)

Para desabilitar completamente a marcação de mensagens como lidas:

```env
SET_MESSAGES_AS_SEEN=FALSE
```

## 🔐 Segurança

Todos os webhooks recebem o header `x-api-key` com o valor definido em `API_KEY`.

Certifique-se de validar este header em seus endpoints de webhook:

```javascript
app.post('/webhook', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'SUA_API_KEY') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Processar webhook...
});
```
