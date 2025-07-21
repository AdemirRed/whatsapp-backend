# Configuração para Railway.app
# Este arquivo substitui o render.yaml

# Variáveis de ambiente necessárias:
# NODE_ENV=production
# PORT=3000
# API_KEY=154466
# SESSION_ID=154466
# BASE_WEBHOOK_URL=https://whatsapp-backend-production.up.railway.app/localCallbackExample
# ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE
# RATE_LIMIT_MAX=1000
# RATE_LIMIT_WINDOW_MS=1000
# MAX_ATTACHMENT_SIZE=10000000
# SET_MESSAGES_AS_SEEN=TRUE
# DISABLED_CALLBACKS=message_ack|message_reaction
# WEB_VERSION=2.2328.5
# WEB_VERSION_CACHE_TYPE=none
# RECOVER_SESSIONS=TRUE
# SESSIONS_PATH=/app/sessions
# ENABLE_SWAGGER_ENDPOINT=TRUE

# Railway detecta automaticamente:
# - Dockerfile
# - package.json
# - Porta via $PORT

# Para criar volume persistente:
# 1. Vá nas configurações do projeto
# 2. Adicione um Volume
# 3. Mount path: /app/sessions
# 4. Size: 1GB
