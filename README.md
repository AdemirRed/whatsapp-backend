# API WhatsApp REST Completa

API REST profissional para integração com WhatsApp Web, baseada na biblioteca [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js). Solução robusta, escalável e segura para integração com WhatsApp em projetos corporativos.

Este projeto foi desenvolvido com foco em funcionalidades avançadas e facilidade de uso. Contribuições são sempre bem-vindas! ⭐

## 🚀 Funcionalidades Principais

✅ **Interface HTML Moderna** - Dashboard completo para gerenciamento  
✅ **Autenticação por Código** - Pareamento via código QR ou telefone  
✅ **Transcrição de Áudio** - Conversão automática de áudio para texto  
✅ **Edição de Mensagens** - Modificar mensagens enviadas (100% funcional)  
✅ **Sistema de Enquetes** - Criar e gerenciar enquetes completas  
✅ **Conversão de Arquivos** - Base64 e criação de stickers  
✅ **Mídia View Once** - Gerenciamento de mídia com visualização única  
✅ **Múltiplas Sessões** - Suporte a várias instâncias simultâneas  
✅ **Documentação Swagger** - API totalmente documentada  

**AVISO**: Este projeto não é oficialmente relacionado ao WhatsApp. Use por sua conta e risco.

## 📋 Índice

[1. Início Rápido](#início-rápido)  
[2. Funcionalidades Completas](#funcionalidades-completas)  
[3. Instalação Local](#instalação-local)  
[4. Configuração](#configuração)  
[5. Documentação](#documentação)  
[6. Deploy em Produção](#deploy-em-produção)  
[7. Contribuição](#contribuição)  
[8. Licença](#licença)

## Início Rápido

### 🐳 Com Docker

1. Clone o repositório:

```bash
git clone https://github.com/AdemirRed/whatsapp-backend.git
cd whatsapp-backend
```

2. Execute com Docker Compose:

```bash
docker-compose pull && docker-compose up
```

3. Acesse a interface: whatsapp-backend-production-9cdd.up.railway.app

4. Escaneie o QR Code ou use autenticação por código

5. Comece a usar: whatsapp-backend-production-9cdd.up.railway.app/client/getContacts/SUA_SESSAO

### 🖥️ Instalação Local

```bash
git clone https://github.com/AdemirRed/whatsapp-backend.git
cd whatsapp-backend
npm install
cp .env.example .env
npm start
```

## Funcionalidades Completas

### 📱 **Interface HTML Avançada**
- Dashboard moderno com tema dark
- Gerenciamento visual de sessões
- Controle de navegador headless/visível
- Estatísticas em tempo real
- Hibernação inteligente de sessões

### 🔐 **Autenticação Flexível**
- QR Code tradicional
- **Novo**: Pareamento por código de telefone
- Múltiplas sessões simultâneas
- Reconexão automática

### 🎵 **Transcrição de Áudio Inteligente**
- Conversão automática de áudio para texto
- Integração com serviço BipText
- Interface de arrastar e soltar
- Suporte a múltiplos formatos

### ✏️ **Edição de Mensagens (100% Funcional)**
- Editar mensagens enviadas por você
- Validação de tempo (15 minutos)
- Feedback de sucesso/erro
- API REST completa

### 📊 **Sistema de Enquetes Completo**
- Criar enquetes com múltiplas opções
- Respostas únicas ou múltiplas
- Buscar votos por usuário
- Estatísticas detalhadas
- Export de resultados

### 🖼️ **Conversão e Mídia**
- Converter arquivos para Base64
- Criação de stickers personalizados
- Redimensionamento automático
- Gerenciamento de mídia View Once

### 📋 **API REST Completa**

| Funcionalidade | Status | Funcionalidade | Status |
|---|---|---|---|
| Enviar Mensagem de Texto | ✅ | Criar Grupo | ✅ |
| Enviar Imagem | ✅ | Administrar Grupo | ✅ |
| Enviar Vídeo | ✅ | Enquetes Completas | ✅ |
| Enviar Áudio | ✅ | **Editar Mensagens** | ✅ |
| Enviar Documento | ✅ | **Transcrever Áudio** | ✅ |
| Botões Interativos | ✅ | **Mídia View Once** | ✅ |
| Listas | ✅ | **Converter Stickers** | ✅ |
| Localização | ✅ | **Hibernar Sessões** | ✅ |
| Contatos | ✅ | Download de Mídia | ✅ |
| Status Online | ✅ | Múltiplas Sessões | ✅ |

### 🔧 **Recursos Técnicos**
- Swagger Documentation completa
- Middleware de validação robusto
- Logs estruturados para debugging
- Tratamento avançado de erros
- Rate limiting configurável
- Callbacks personalizáveis

## Instalação Local

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Chrome/Chromium instalado

### Passos de Instalação

1. **Clone o repositório**:
```bash
git clone https://github.com/AdemirRed/whatsapp-backend.git
cd whatsapp-backend
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure o ambiente**:
```bash
cp .env.example .env
```

4. **Configure as variáveis no .env**:
```env
# Configurações básicas
PORT=200
API_KEY=sua_chave_api_aqui
BASE_WEBHOOK_URL=whatsapp-backend-production-9cdd.up.railway.app/

# Configuração do navegador
HEADLESS_BROWSER=false  # true para headless, false para visível

# Configurações de sessão
SESSIONS_PATH=./sessions
RECOVER_SESSIONS=TRUE
```

5. **Inicie o servidor**:
```bash
npm start
```

6. **Acesse a interface**:
```
whatsapp-backend-production-9cdd.up.railway.app
```

## Configuração

### Variáveis de Ambiente Principais

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | 200 | Porta do servidor |
| `API_KEY` | "" | Chave de autenticação da API |
| `HEADLESS_BROWSER` | true | Executar navegador em modo headless |
| `BASE_WEBHOOK_URL` | (opcional) | URL base para webhooks - Se não configurado, eventos não serão enviados |
| `SESSIONS_PATH` | ./sessions | Diretório para salvar sessões |
| `WEB_VERSION` | 2.2328.5 | Versão do WhatsApp Web |
| `RATE_LIMIT_MAX` | 1000 | Limite de requisições |

### Exemplos de Uso da API

#### 1. Iniciar Sessão
```bash
GET /session/start/minha-sessao
```

#### 2. Enviar Mensagem
```bash
POST /client/sendMessage/minha-sessao
Content-Type: application/json
x-api-key: sua_chave

{
  "chatId": "5511999999999@c.us",
  "contentType": "string",
  "content": "Olá! Esta é uma mensagem de teste."
}
```

#### 3. Editar Mensagem (Nova Funcionalidade)
```bash
POST /message/edit/minha-sessao
Content-Type: application/json
x-api-key: sua_chave

{
  "chatId": "5511999999999@c.us",
  "messageId": "ID_DA_MENSAGEM",
  "newContent": "Texto editado da mensagem"
}
```

#### 4. Transcrever Áudio (Nova Funcionalidade)
```bash
POST /audio/transcribe/minha-sessao
Content-Type: application/json
x-api-key: sua_chave

{
  "chatId": "5511999999999@c.us",
  "messageId": "ID_MENSAGEM_AUDIO"
}
```

#### 5. Criar Enquete (Nova Funcionalidade)
```bash
POST /client/sendMessage/minha-sessao
Content-Type: application/json
x-api-key: sua_chave

{
  "chatId": "5511999999999@c.us",
  "contentType": "Poll",
  "content": {
    "pollName": "Qual sua linguagem favorita?",
    "pollOptions": ["JavaScript", "Python", "Java", "C#"],
    "options": {
      "allowMultipleAnswers": false
    }
  }
}
```

## Documentação

### 📚 API Documentation

A documentação completa da API está disponível através do Swagger:

- **Online**: Acesse `/api-docs` quando o servidor estiver rodando
- **Arquivo**: [swagger.json](https://raw.githubusercontent.com/AdemirRed/whatsapp-backend/main/swagger.json)
- **Editor Swagger**: [Visualizar no Swagger Editor](https://editor.swagger.io/?url=https://raw.githubusercontent.com/AdemirRed/whatsapp-backend/main/swagger.json)

### 🔗 Endpoints Principais

#### Sessões
- `GET /session/start/:sessionId` - Iniciar nova sessão
- `GET /session/qr/:sessionId` - Obter QR Code
- `GET /session/status/:sessionId` - Status da sessão
- `GET /session/terminate/:sessionId` - Encerrar sessão
- `GET /session/hibernate/:sessionId` - Hibernar sessão
- `GET /session/reactivate/:sessionId` - Reativar sessão

#### Mensagens
- `POST /client/sendMessage/:sessionId` - Enviar mensagem
- `POST /message/edit/:sessionId` - **Editar mensagem**
- `POST /message/delete/:sessionId` - Deletar mensagem
- `POST /message/forward/:sessionId` - Encaminhar mensagem

#### Áudio e Mídia
- `POST /audio/transcribe/:sessionId` - **Transcrever áudio**
- `GET /audio/fileToBase64` - Interface de conversão
- `GET /sticker/create` - Interface de stickers
- `POST /sticker/convert/:sessionId` - Converter para sticker

#### Enquetes
- `POST /poll/getChatPolls/:sessionId` - Listar enquetes
- `POST /poll/getVotes/:sessionId` - Obter votos
- `POST /poll/getVotesByContact/:sessionId` - Votos por contato

#### View Once
- `POST /viewonce/getMedia/:sessionId` - Mídia view once
- `POST /viewonce/download/:sessionId` - Download de mídia
- `POST /viewonce/getStats/:sessionId` - Estatísticas

### 🔐 Autenticação

Todas as rotas da API requerem autenticação via header:

```bash
x-api-key: SUA_CHAVE_API
```

### 📱 Interface Web

A interface web está disponível em `whatsapp-backend-production-9cdd.up.railway.app` e inclui:

- Dashboard de sessões com estatísticas
- Gerenciamento visual de sessões
- Ferramentas de conversão de arquivos
- Interface para criação de stickers
- Controles de hibernação em massa

## Deploy em Produção

### 🐳 Docker (Recomendado)

1. **Build da imagem**:
```bash
docker build -t whatsapp-backend .
```

2. **Execute com configurações de produção**:
```bash
docker run -d \
  --name whatsapp-api \
  -p 200:200 \
  -e API_KEY=sua_chave_super_secreta \
  -e HEADLESS_BROWSER=true \
  -e ENABLE_LOCAL_CALLBACK_EXAMPLE=FALSE \
  -v $(pwd)/sessions:/app/sessions \
  whatsapp-backend
```

### ⚙️ Configurações de Produção

```env
# Segurança
API_KEY=uma_chave_muito_segura_aqui
HEADLESS_BROWSER=true
ENABLE_LOCAL_CALLBACK_EXAMPLE=FALSE

# Performance
RATE_LIMIT_MAX=500
RATE_LIMIT_WINDOW_MS=1000

# Webhooks
BASE_WEBHOOK_URL=https://seu-dominio.com/webhook/

# Callbacks (desabilitar os desnecessários)
DISABLED_CALLBACKS=media_uploaded,contact_changed
```

### 🔒 Segurança

- Configure uma `API_KEY` forte
- Use HTTPS em produção
- Implemente rate limiting
- Configure firewall adequadamente
- Monitore logs de acesso

### 📊 Monitoramento

Execute periodicamente para limpeza:
```bash
GET /session/terminateInactive
```

## Testes

Execute a suíte de testes:

```bash
npm test
```

## Contribuição

Contribuições são sempre bem-vindas! 🎉

### Como Contribuir

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** um Pull Request

### Padrões de Commit

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Alterações na documentação
- `style:` - Formatação, ponto e vírgula, etc
- `refactor:` - Refatoração de código
- `test:` - Adição de testes
- `chore:` - Tarefas de build, config, etc

### Áreas que Precisam de Contribuição

- [ ] Testes automatizados
- [ ] Otimização de performance
- [ ] Novos tipos de mídia
- [ ] Integração com mais serviços
- [ ] Melhorias na interface
- [ ] Documentação em outros idiomas

## Roadmap

### 🚧 Em Desenvolvimento
- [ ] Mensagens programadas
- [ ] Backup automático de conversas
- [ ] API GraphQL
- [ ] Integração com IA (ChatGPT/Gemini)
- [ ] Dashboard analytics avançado

### 💡 Planejado
- [ ] Suporte a WhatsApp Business API
- [ ] Multi-tenant support
- [ ] Cluster mode
- [ ] Marketplace de plugins

## Aviso Legal

⚠️ **IMPORTANTE**: Este projeto não é oficialmente afiliado, associado, autorizado ou endossado pelo WhatsApp ou qualquer uma de suas subsidiárias ou afiliadas. 

- Use por sua própria conta e risco
- O WhatsApp pode banir contas que usam bots não oficiais
- Respeite os termos de serviço do WhatsApp
- Este projeto é apenas para fins educacionais e de desenvolvimento

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE.md](./LICENSE.md) para detalhes.

## Suporte

### 🐛 Encontrou um Bug?
- Abra uma [issue](https://github.com/AdemirRed/whatsapp-backend/issues)
- Descreva o problema detalhadamente
- Inclua logs e screenshots se possível

### 💡 Tem uma Ideia?
- Abra uma [discussão](https://github.com/AdemirRed/whatsapp-backend/discussions)
- Descreva sua ideia
- Explique como isso beneficiaria o projeto

### 📧 Contato
- **GitHub**: [@AdemirRed](https://github.com/AdemirRed)
- **Issues**: [GitHub Issues](https://github.com/AdemirRed/whatsapp-backend/issues)

---

## ⭐ Star History

Se este projeto te ajudou, considere dar uma ⭐ estrela!

[![Star History Chart](https://api.star-history.com/svg?repos=AdemirRed/whatsapp-backend&type=Date)](https://star-history.com/#AdemirRed/whatsapp-backend&Date)

---

<div align="center">

**Desenvolvido com ❤️ para a comunidade**

[⬆️ Voltar ao topo](#api-whatsapp-rest-completa)

</div>
