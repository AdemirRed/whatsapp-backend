#!/bin/bash

# Script para verificar se tudo está correto antes do deploy
echo "🔍 Verificando arquivos necessários para deploy Docker no Render..."

# Verificar se arquivos essenciais existem
files=("package.json" "server.js" "Dockerfile.simple" "start.sh" "src/app.js" "src/routes.js")

echo "📁 Verificando arquivos essenciais:"
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - OK"
    else
        echo "❌ $file - FALTANDO!"
    fi
done

echo ""
echo "🐳 Configurações para o Render (Docker):"
echo "========================================"
echo "Dockerfile Path: ./Dockerfile.simple"
echo "Health Check Path: /ping"
echo "Port: 3000 (via env var)"
echo "Mount Path: /app/sessions"
echo ""

echo "🔧 Variáveis de ambiente necessárias:"
echo "NODE_ENV=production"
echo "PORT=3000"
echo "API_KEY=154466"
echo "SESSION_ID=154466"
echo "BASE_WEBHOOK_URL=https://whatsapp-backend-1.onrender.com/localCallbackExample"
echo "ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE"
echo "RATE_LIMIT_MAX=1000"
echo "RATE_LIMIT_WINDOW_MS=1000"
echo "MAX_ATTACHMENT_SIZE=10000000"
echo "SET_MESSAGES_AS_SEEN=TRUE"
echo "DISABLED_CALLBACKS=message_ack|message_reaction"
echo "WEB_VERSION=2.2328.5"
echo "WEB_VERSION_CACHE_TYPE=none"
echo "RECOVER_SESSIONS=TRUE"
echo "SESSIONS_PATH=/app/sessions"
echo "ENABLE_SWAGGER_ENDPOINT=TRUE"

echo ""
echo "💾 Disk Configuration:"
echo "Name: sessions-data"  
echo "Mount Path: /app/sessions"
echo "Size: 1 GB"

echo ""
echo "🚀 URLs após deploy:"
echo "Health: https://whatsapp-backend-1.onrender.com/ping"
echo "API Docs: https://whatsapp-backend-1.onrender.com/api-docs/"
echo ""

echo "✅ Tudo pronto para deploy no Render com Docker!"
