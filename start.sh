#!/bin/sh

# Script de inicialização para Render
# Garante que o diretório de sessões seja configurado corretamente

echo "🚀 Iniciando aplicação WhatsApp Web API..."

# Verificar se estamos em produção
if [ "$NODE_ENV" = "production" ]; then
    echo "📦 Ambiente: Produção (Render)"
    
    # Criar diretório de sessões se não existir
    if [ ! -d "/app/sessions" ]; then
        echo "📁 Criando diretório de sessões: /app/sessions"
        mkdir -p /app/sessions
    fi
    
    # Verificar permissões
    ls -la /app/sessions
    
    echo "✅ Diretório de sessões configurado"
    echo "📊 Espaço em disco disponível:"
    df -h /app/sessions
else
    echo "🔧 Ambiente: Desenvolvimento"
    
    # Criar diretório local se não existir
    if [ ! -d "./sessions" ]; then
        echo "📁 Criando diretório de sessões local: ./sessions"
        mkdir -p ./sessions
    fi
fi

echo "🌐 Variáveis de ambiente importantes:"
echo "   - NODE_ENV: $NODE_ENV"
echo "   - PORT: $PORT"
echo "   - SESSIONS_PATH: $SESSIONS_PATH"
echo "   - RECOVER_SESSIONS: $RECOVER_SESSIONS"
echo "   - BASE_WEBHOOK_URL: $BASE_WEBHOOK_URL"

echo "🔄 Iniciando servidor Node.js..."
exec node server.js
