# 🚀 WhatsApp Web API - Portable

## 📦 Conteúdo do Pacote

- `server.js` + `src/` - Código fonte da aplicação
- `package.json` - Configurações do projeto
- `node_modules/` - Dependências incluídas
- `.env` - Configurações (EDITAR CONFORME NECESSÁRIO) 
- `start.bat` - Script que baixa Node.js automaticamente
- `sessions/` - Pasta para armazenar sessões WhatsApp
- `README.md` - Este arquivo

## ⚙️ ANTES DE EXECUTAR - Configurar .env

Abra o arquivo `.env` e configure:

```bash
# OPCIONAL: Configurar webhook para receber eventos (se não configurar, a API funcionará normalmente)
BASE_WEBHOOK_URL=http://SEU_SERVIDOR:3000/webhook

# Definir sua chave de API
API_KEY=sua-chave-secreta-aqui

# Porta do servidor (padrão: 200)
PORT=200
```

## 🏃‍♂️ Como Executar

### ✨ Execução Automática (Recomendado)
1. **Clique duplo em `start.bat`**
2. **Na primeira vez**: Script baixará Node.js automaticamente (~30MB)
3. **Próximas vezes**: Iniciará diretamente
4. Aguarde carregar (pode demorar na primeira vez)

### 🔧 Execução Manual (se tiver Node.js)
1. Abra CMD ou PowerShell nesta pasta
2. Execute: `node server.js`

## 🌐 Acessar a API

Após iniciar, acesse:

- **Swagger (Documentação)**: whatsapp-backend-production-9cdd.up.railway.app/api-docs
- **API Base**: whatsapp-backend-production-9cdd.up.railway.app/
- **QR Code para conectar**: GET whatsapp-backend-production-9cdd.up.railway.app/session/qr/SUA_SESSAO

## 📱 Como Conectar WhatsApp

1. Inicie a API com `start.bat`
2. Acesse: whatsapp-backend-production-9cdd.up.railway.app/session/qr/minha-sessao  
3. Escaneie o QR Code com seu WhatsApp
4. Pronto! API conectada

## 🔑 Usar a API

Todas as requisições precisam do header:
```
x-api-key: sua-chave-secreta-aqui
```

**Exemplo - Enviar mensagem:**
```bash
POST whatsapp-backend-production-9cdd.up.railway.app/client/sendMessage/minha-sessao
Headers: x-api-key: sua-chave-secreta-aqui
Body: {
  "chatId": "5511999999999@c.us",
  "message": "Olá!"
}
```

## 📁 Estrutura Portável

- `node.exe` - Node.js baixado automaticamente (primeira execução)
- `node_modules/` - **NÃO DELETAR** - Dependências incluídas
- `sessions/` - **NÃO DELETAR** - Sessões salvas do WhatsApp
- `.wwebjs_cache/` - Cache do WhatsApp Web (criada automaticamente)

## 🛠️ Troubleshooting

**Erro de porta ocupada:**
- Mude `PORT=200` no `.env` para outro valor (ex: `PORT=3001`)

**WhatsApp desconecta:**
- Delete a pasta `sessions/session-NOME/`
- Conecte novamente pelo QR Code

**Erro de download Node.js:**
- Verifique conexão com internet
- Execute como Administrador
- Baixe manualmente: https://nodejs.org/dist/v18.17.0/node-v18.17.0-win-x64.zip

**API lenta na primeira execução:**
- É normal - está baixando cache do WhatsApp Web
- Próximas execuções serão mais rápidas

## 💡 Vantagens desta Solução

- ✅ **Auto-instalação**: Baixa Node.js automaticamente
- ✅ **Portável**: Funciona sem instalação prévia
- ✅ **Completo**: Todas dependências incluídas
- ✅ **Flexível**: Funciona com Node.js local ou do sistema
- ✅ **Pequeno**: ~50MB (vs 200MB+ do executável)

## 📞 Suporte

- Documentação completa: whatsapp-backend-production-9cdd.up.railway.app/api-docs (após iniciar)
- Verifique o arquivo `.env` se houver problemas de conexão