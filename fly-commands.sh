# Comandos para deploy no Fly.io

# 1. Instalar Fly CLI
# Windows: irm https://fly.io/install.ps1 | iex

# 2. Fazer login
# fly auth login

# 3. Criar app
# fly apps create whatsapp-backend-seu-nome

# 4. Configurar variáveis de ambiente
fly secrets set NODE_ENV=production
fly secrets set API_KEY=154466
fly secrets set SESSION_ID=154466
fly secrets set ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE
fly secrets set RATE_LIMIT_MAX=1000
fly secrets set RATE_LIMIT_WINDOW_MS=1000
fly secrets set MAX_ATTACHMENT_SIZE=10000000
fly secrets set SET_MESSAGES_AS_SEEN=TRUE
fly secrets set DISABLED_CALLBACKS="message_ack|message_reaction"
fly secrets set WEB_VERSION=2.2328.5
fly secrets set WEB_VERSION_CACHE_TYPE=none
fly secrets set RECOVER_SESSIONS=TRUE
fly secrets set SESSIONS_PATH=/app/sessions
fly secrets set ENABLE_SWAGGER_ENDPOINT=TRUE

# 5. Criar volume
fly volumes create sessions_data --region gru --size 1

# 6. Deploy
fly deploy

# 7. Configurar BASE_WEBHOOK_URL
fly secrets set BASE_WEBHOOK_URL=https://whatsapp-backend-seu-nome.fly.dev/localCallbackExample
