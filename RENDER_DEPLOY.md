# Guia de Deploy no Render

## Opção 1: Deploy via GitHub (Recomendado)

### Passos:

1. **Faça commit dos novos arquivos no seu repositório:**
   ```bash
   git add Dockerfile.render render.yaml
   git commit -m "Add Render configuration files"
   git push origin main
   ```

2. **No painel do Render (https://render.com):**
   - Conecte sua conta GitHub
   - Clique em "New +" → "Web Service"
   - Selecione seu repositório `whatsapp-backend`
   - Configure:
     - **Name**: whatsapp-api (ou o nome que preferir)
     - **Environment**: Docker
     - **Dockerfile Path**: `./Dockerfile.render`
     - **Plan**: Starter (ou Standard para mais recursos)

3. **Configure as variáveis de ambiente:**
   ```
   NODE_ENV=production
   API_KEY=redblack
   BASE_WEBHOOK_URL=https://SUA-APLICACAO.onrender.com/localCallbackExample
   ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE
   MAX_ATTACHMENT_SIZE=5000000
   SET_MESSAGES_AS_SEEN=TRUE
   DISABLED_CALLBACKS=message_ack
   ENABLE_SWAGGER_ENDPOINT=TRUE
   ```

4. **Configure o Persistent Disk (opcional, para manter sessões):**
   - Name: `sessions-data`
   - Mount Path: `/app/sessions`
   - Size: 1GB

## Opção 2: Deploy usando render.yaml

1. **Certifique-se que o render.yaml está na raiz do projeto**

2. **No Render Dashboard:**
   - Clique em "New +" → "Blueprint"
   - Conecte ao seu repositório GitHub
   - O Render automaticamente detectará o render.yaml

3. **Atualize a URL do webhook no render.yaml:**
   - Substitua `sua-aplicacao` pelo nome real da sua aplicação

## Importantes Considerações para o Render:

### 1. **Limitações do Plano Gratuito:**
- Aplicação "hiberna" após 15 minutos de inatividade
- Pode levar 30+ segundos para "acordar"
- Para WhatsApp, recomenda-se o plano Starter ($7/mês) para evitar hibernação

### 2. **Persistência de Dados:**
- Use Persistent Disk para manter as sessões do WhatsApp
- Sem persistência, você precisará escanear o QR code toda vez que a aplicação reiniciar

### 3. **Recursos Necessários:**
- WhatsApp Web + Puppeteer consome mais memória
- Considere o plano Standard para melhor performance

### 4. **Monitoramento:**
- Use o endpoint `/ping` para health checks
- Acesse `/api-docs` para a documentação Swagger (se habilitada)

## URLs da Aplicação:
Após o deploy, sua aplicação estará disponível em:
- **API**: `https://SUA-APLICACAO.onrender.com`
- **Health Check**: `https://SUA-APLICACAO.onrender.com/ping`
- **Swagger Docs**: `https://SUA-APLICACAO.onrender.com/api-docs`

## Problemas Comuns:

### 1. **Timeout no primeiro acesso:**
- Normal no plano gratuito devido à hibernação
- Considere usar um serviço de "ping" para manter ativo

### 2. **Sessões perdidas:**
- Configure Persistent Disk para manter sessões
- Verifique se o path `/app/sessions` está correto

### 3. **Erro de memória:**
- Upgrade para plano com mais RAM
- Otimize configurações do Puppeteer se necessário

## Alternativa: Deploy Direto (sem Docker)

Se preferir não usar Docker, você pode fazer deploy direto:

1. **Crie um novo Web Service**
2. **Configure:**
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Adicione as mesmas variáveis de ambiente**

Note: Para WhatsApp, o Docker é recomendado pois garante que todas as dependências do Puppeteer estejam instaladas.
