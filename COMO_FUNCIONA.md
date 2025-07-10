# Como Funciona o WhatsApp Backend

Este documento explica detalhadamente como funciona o sistema de backend para WhatsApp, incluindo sua arquitetura, componentes e fluxos de funcionamento.

## Visão Geral da Arquitetura

O WhatsApp Backend é uma API REST que atua como um wrapper (envoltório) para a biblioteca `whatsapp-web.js`. Ele permite que aplicações externas interajam com o WhatsApp Web de forma programática, sem precisar lidar diretamente com a complexidade do WhatsApp Web.

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Backend API                     │
├─────────────────────────────────────────────────────────────┤
│  Express.js Server (server.js)                             │
│  ├── Rotas REST API (routes.js)                            │
│  ├── Controladores (controllers/)                          │
│  ├── Middleware (middleware.js)                            │
│  └── Configurações (config.js)                             │
├─────────────────────────────────────────────────────────────┤
│  Gerenciamento de Sessões (sessions.js)                    │
│  ├── Mapa de Sessões Ativas                                │
│  ├── Autenticação Local                                    │
│  └── Recuperação de Sessões                                │
├─────────────────────────────────────────────────────────────┤
│  WhatsApp-Web.js (Biblioteca Core)                         │
│  ├── Cliente WhatsApp                                      │
│  ├── Puppeteer (Controle do Browser)                       │
│  └── LocalAuth (Armazenamento Local)                       │
├─────────────────────────────────────────────────────────────┤
│  Browser Automatizado (Puppeteer + Chrome)                 │
│  └── WhatsApp Web Interface                                │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo de Funcionamento

### 1. Inicialização do Sistema

1. **Carregamento das Configurações**: O sistema carrega as variáveis de ambiente do arquivo `.env`
2. **Inicialização do Express**: O servidor Express é configurado com middlewares (CORS, body-parser, rate limiting)
3. **Configuração das Rotas**: As rotas REST são registradas e organizadas por funcionalidade
4. **Restauração de Sessões**: Sessões existentes são automaticamente restauradas se `RECOVER_SESSIONS=TRUE`

### 2. Gerenciamento de Sessões

#### Criação de uma Nova Sessão

```javascript
// Exemplo de criação de sessão
GET /session/start/MINHA_SESSAO
```

**Fluxo interno:**
1. Sistema verifica se a sessão já existe
2. Cria uma nova instância do `LocalAuth` para armazenamento
3. Configura opções do Puppeteer (browser automatizado)
4. Inicializa cliente WhatsApp com `new Client(options)`
5. Registra eventos e callbacks
6. Inicia o processo de autenticação

#### Autenticação via QR Code

1. **Geração do QR**: O WhatsApp Web gera um QR code único
2. **Disponibilização**: O QR é disponibilizado via webhooks e endpoints REST
3. **Escaneamento**: Usuário escaneia com o app móvel do WhatsApp
4. **Validação**: Sistema recebe confirmação e estabelece conexão
5. **Persistência**: Dados de autenticação são salvos localmente

### 3. Estrutura de Endpoints da API

#### Endpoints de Sessão (`/session`)
- `GET /session/start/:sessionId` - Inicia nova sessão
- `GET /session/status/:sessionId` - Verifica status da sessão
- `GET /session/qr/:sessionId` - Obtém QR code como texto
- `GET /session/qr/:sessionId/image` - Obtém QR code como imagem PNG
- `GET /session/terminate/:sessionId` - Termina sessão específica
- `GET /session/terminateInactive` - Termina sessões inativas
- `GET /session/terminateAll` - Termina todas as sessões

#### Endpoints de Cliente (`/client`)
- `GET /client/getContacts/:sessionId` - Lista contatos
- `GET /client/getChats/:sessionId` - Lista conversas
- `POST /client/sendMessage/:sessionId` - Envia mensagem
- `POST /client/createGroup/:sessionId` - Cria grupo
- `POST /client/setStatus/:sessionId` - Define status do perfil

#### Endpoints de Mensagem (`/message`)
- `POST /message/forward/:sessionId` - Encaminha mensagem
- `POST /message/delete/:sessionId` - Deleta mensagem
- `POST /message/react/:sessionId` - Adiciona reação
- `POST /message/downloadMedia/:sessionId` - Baixa mídia

### 4. Sistema de Webhooks

O sistema implementa um robusto sistema de callbacks via webhooks:

#### Eventos Suportados
- `qr` - Novo QR code gerado
- `authenticated` - Autenticação bem-sucedida
- `ready` - Cliente pronto para uso
- `message` - Nova mensagem recebida
- `message_create` - Mensagem criada
- `message_ack` - Confirmação de entrega
- `call` - Chamada recebida
- `group_join` - Entrada em grupo
- `group_leave` - Saída de grupo

#### Configuração de Webhooks
```bash
# Webhook global (todas as sessões)
BASE_WEBHOOK_URL=http://localhost:3000/callback

# Webhook específico por sessão
MINHA_SESSAO_WEBHOOK_URL=http://localhost:3000/callback/especifico
```

### 5. Armazenamento e Persistência

#### Estrutura de Pastas
```
./sessions/
├── session-SESSAO1/
│   ├── Default/
│   │   ├── Local Storage/
│   │   ├── Session Storage/
│   │   └── IndexedDB/
│   └── SingletonCookies
├── session-SESSAO2/
└── ...
```

#### Dados Armazenados
- **Tokens de Autenticação**: Credenciais criptografadas do WhatsApp
- **Configurações do Browser**: Preferências e estado do Puppeteer
- **Cache de Contatos**: Lista de contatos sincronizada
- **Histórico de Mensagens**: Cache local das mensagens recentes

### 6. Segurança e Autenticação

#### Autenticação da API
```bash
# Chave global da API
API_KEY=sua_chave_secreta_aqui

# Uso nos headers
x-api-key: sua_chave_secreta_aqui
```

#### Rate Limiting
```bash
RATE_LIMIT_MAX=1000        # Máximo de requisições
RATE_LIMIT_WINDOW_MS=1000  # Janela de tempo em ms
```

#### Validações de Sessão
- Verificação de existência da sessão
- Validação do estado de conexão
- Verificação de permissões

### 7. Processo de Envio de Mensagens

#### Fluxo Detalhado
1. **Recepção da Requisição**: API recebe POST com dados da mensagem
2. **Validação**: Verifica sessionId, autenticação e formato dos dados
3. **Identificação do Destinatário**: Resolve número/contato do WhatsApp
4. **Processamento**: Formata mensagem conforme tipo (texto, mídia, etc.)
5. **Envio**: Utiliza whatsapp-web.js para enviar via browser automatizado
6. **Confirmação**: Retorna status de envio e ID da mensagem
7. **Webhook**: Dispara callbacks configurados (se habilitados)

#### Tipos de Mensagem Suportados
- **Texto Simples**: Mensagens de texto comum
- **Mídia**: Imagens, vídeos, áudios, documentos
- **Localização**: Coordenadas geográficas
- **Contato**: Cartão de visita
- **Botões**: Mensagens interativas com botões
- **Listas**: Menus de seleção
- **Templates**: Mensagens formatadas

### 8. Monitoramento e Logs

#### Logs do Sistema
- **Inicialização**: Registro de startup e configurações
- **Sessões**: Criação, destruição e erros de sessão
- **Mensagens**: Log de envios e recebimentos
- **Webhooks**: Registro de callbacks enviados
- **Erros**: Stack traces e debugging

#### Healthcheck
```
GET /ping - Verifica se servidor está ativo
```

### 9. Escalabilidade e Performance

#### Gerenciamento de Recursos
- **Múltiplas Sessões**: Suporte a sessões simultâneas
- **Cleanup Automático**: Remoção de sessões inativas
- **Rate Limiting**: Controle de carga da API
- **Memory Management**: Limpeza de resources do Puppeteer

#### Otimizações
- **Cache de Contatos**: Evita requisições desnecessárias
- **Reutilização de Conexões**: Mantém sessões ativas
- **Lazy Loading**: Carregamento sob demanda
- **Connection Pooling**: Gerenciamento eficiente de recursos

### 10. Tratamento de Erros

#### Tipos de Erro Comuns
- **session_not_found**: Sessão não existe
- **session_not_connected**: Sessão não autenticada
- **browser_tab_closed**: Tab do browser foi fechada
- **rate_limit_exceeded**: Limite de requisições excedido
- **invalid_number**: Número do WhatsApp inválido

#### Recovery e Failover
- **Auto-Restart**: Reinício automático de sessões com falha
- **Session Recovery**: Recuperação de estado após crashes
- **Graceful Degradation**: Funcionamento parcial em caso de erros

## Configurações Avançadas

### Variáveis de Ambiente Principais

```bash
# Servidor
PORT=3000
API_KEY=chave_secreta

# WhatsApp
BASE_WEBHOOK_URL=http://localhost:3000/callback
MAX_ATTACHMENT_SIZE=10000000
SET_MESSAGES_AS_SEEN=TRUE
WEB_VERSION='2.2328.5'

# Sessões
SESSIONS_PATH=./sessions
RECOVER_SESSIONS=TRUE

# Callbacks Desabilitados
DISABLED_CALLBACKS=message_ack|message_reaction
```

### Customização de Webhooks

É possível customizar webhooks por sessão e desabilitar eventos específicos para otimização de performance.

## Casos de Uso Comuns

1. **Chatbots Automatizados**: Integração com sistemas de IA
2. **Notificações de Sistema**: Envio de alertas e atualizações
3. **Atendimento ao Cliente**: Sistemas de suporte automatizado
4. **Marketing Digital**: Campanhas e broadcasts
5. **Integrações ERP/CRM**: Conectar WhatsApp com sistemas empresariais

## Limitações e Considerações

- **Política do WhatsApp**: Uso não oficial pode resultar em bloqueio
- **Rate Limits**: WhatsApp impõe limites de mensagens
- **Recursos de Hardware**: Cada sessão consome recursos significativos
- **Estabilidade**: Dependente da estabilidade do WhatsApp Web
- **Atualizações**: Mudanças no WhatsApp podem afetar funcionamento

---

*Este documento fornece uma visão técnica completa do funcionamento do WhatsApp Backend. Para informações sobre instalação e configuração básica, consulte o README.md principal.*