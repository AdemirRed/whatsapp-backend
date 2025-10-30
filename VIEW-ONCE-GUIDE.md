# 👁️ SISTEMA DE GERENCIAMENTO DE MÍDIA VIEW ONCE

## 📖 Descrição

Este sistema permite detectar, visualizar e baixar fotos e vídeos enviados como "visualização única" (view once) no WhatsApp. A funcionalidade foi integrada ao projeto existente que já gerenciava enquetes.

## ⚠️ AVISO IMPORTANTE

**Mídia View Once é destinada a ser vista apenas uma vez. Use esta funcionalidade com responsabilidade e respeite a privacidade dos usuários.**

## 🔧 Funcionalidades Implementadas

### 1. **Detecção Automática**
- O sistema detecta automaticamente mensagens view once recebidas
- Emite eventos webhook para notificação em tempo real
- Identifica imagens e vídeos com visualização única

### 2. **Listagem de Mídia View Once**
- Lista todas as mensagens view once de um chat específico
- Mostra metadados como data, remetente, tipo de mídia
- Indica se a mídia ainda está disponível para download

### 3. **Download de Mídia**
- Baixa fotos e vídeos view once antes que expirem
- Opção de download forçado para mídia expirada
- Suporte a diferentes formatos (JPEG, PNG, MP4, etc.)

### 4. **Estatísticas**
- Contadores de view once por chat
- Gráficos de atividade por data
- Análise de mídia visualizada vs não visualizada

### 5. **Busca por Chats**
- Lista todos os chats que contêm mídia view once
- Ordenação por quantidade de view once
- Seleção rápida de chats

## 🌐 Endpoints da API

### **GET /viewonce/getMedia/:sessionId**
Lista mídia view once de um chat
```json
{
  "chatId": "555199999999@c.us",
  "limit": 50,
  "includeExpired": false
}
```

### **POST /viewonce/download/:sessionId**
Baixa mídia view once específica
```json
{
  "messageId": "true_555199999999@c.us_3EB05D5C285094DEDD18",
  "chatId": "555199999999@c.us",
  "force": false
}
```

### **POST /viewonce/getStats/:sessionId**
Obtém estatísticas de view once
```json
{
  "chatId": "555199999999@c.us",
  "days": 30
}
```

### **POST /viewonce/getChats/:sessionId**
Lista chats com view once
```json
{
  "limit": 50
}
```

## 🖥️ Interface Web

### **Acesso**
- Abra `http://localhost:200` no navegador
- Navegue até a seção "👁️ Gerenciar Mídia View Once"

### **Funcionalidades da Interface**
1. **📋 Listar View Once**: Mostra todas as mensagens view once de um chat
2. **📊 Estatísticas**: Exibe gráficos e contadores
3. **💬 Chats com View Once**: Lista chats que têm mídia view once
4. **💾 Baixar Mídia**: Download individual de mídia específica

## 🔧 Como Usar

### **1. Configurar Sessão**
```bash
# Iniciar servidor
npm start

# Acessar interface
http://localhost:200

# Criar sessão WhatsApp
1. Digite ID da sessão
2. Clique em "Criar"
3. Escaneie QR Code
```

### **2. Detectar View Once**
```javascript
// O sistema detecta automaticamente
// e emite webhooks para seu Boot:
{
  "dataType": "view_once_detected",
  "sessionId": "minha-sessao",
  "data": {
    "message": {...},
    "metadata": {
      "from": "555199999999@c.us",
      "type": "image",
      "hasMedia": true,
      "timestamp": 1698765432,
      "viewed": false
    }
  }
}
```

### **3. Listar Mídia View Once**
```bash
# Via interface web:
1. Preencha "ID da sessão"
2. Preencha "Chat ID" 
3. Clique "📋 Listar View Once"

# Via API:
curl -X POST http://localhost:200/viewonce/getMedia/sessao \
  -H "x-api-key: redblack" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "555199999999@c.us", "limit": 50}'
```

### **4. Baixar Mídia**
```bash
# Via interface web:
1. Na lista, clique "💾 Baixar Mídia"
2. Ou use o modal específico

# Via API:
curl -X POST http://localhost:200/viewonce/download/sessao \
  -H "x-api-key: redblack" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "true_555199999999@c.us_ABC123",
    "chatId": "555199999999@c.us",
    "force": false
  }'
```

## 🔄 Integração com Boot

### **Webhook Automático**
O sistema envia webhooks para sua aplicação Boot em `http://localhost:4001/api/whatsapp/webhook`:

```java
@PostMapping("/webhook")
public ResponseEntity<?> receiveWebhook(@RequestBody Map<String, Object> payload) {
    String dataType = (String) payload.get("dataType");
    
    if ("view_once_detected".equals(dataType)) {
        // Nova mídia view once detectada
        Map<String, Object> data = (Map<String, Object>) payload.get("data");
        Map<String, Object> metadata = (Map<String, Object>) data.get("metadata");
        
        // Processar detecção
        handleViewOnceDetected(metadata);
    }
    
    return ResponseEntity.ok(Map.of("success", true));
}
```

### **Integração com API**
```java
@Service
public class ViewOnceService {
    
    public List<ViewOnceMessage> getViewOnceMedia(String sessionId, String chatId) {
        // Chamar API /viewonce/getMedia
        RestTemplate restTemplate = new RestTemplate();
        String url = "http://localhost:200/viewonce/getMedia/" + sessionId;
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", "redblack");
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, Object> body = Map.of(
            "chatId", chatId,
            "limit", 50,
            "includeExpired", false
        );
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
        
        return parseViewOnceResponse(response.getBody());
    }
    
    public byte[] downloadViewOnceMedia(String sessionId, String messageId, String chatId) {
        // Chamar API /viewonce/download
        // Retornar bytes da mídia
    }
}
```

## 📁 Estrutura dos Arquivos

```
/src/controllers/viewOnceController.js    # Controller principal
/src/routes.js                           # Rotas adicionadas
/src/sessions.js                         # Detecção automática
/index.html                              # Interface web atualizada
```

## ⚡ Características Técnicas

### **Detecção de View Once**
```javascript
// Propriedades verificadas:
const isViewOnce = message._data && (
  message._data.isViewOnce || 
  message._data.viewOnce || 
  (message._data.ephemeral && message.hasMedia)
)
```

### **Download Automático**
- Detecta mídia view once recebida
- Baixa automaticamente se tamanho < limite
- Emite evento `view_once_media` com dados

### **Segurança**
- Headers de autenticação obrigatórios
- Validação de sessão
- Logs de download para auditoria
- Avisos sobre uso responsável

## 🚀 Exemplos de Uso

### **Monitoramento Automático**
```javascript
// No seu Boot, receba webhooks:
{
  "dataType": "view_once_detected",
  "sessionId": "comercial",
  "data": {
    "metadata": {
      "from": "cliente@c.us",
      "type": "image", 
      "timestamp": 1698765432,
      "viewed": false
    }
  }
}

// Processar automaticamente:
if (dataType === 'view_once_detected') {
    // Salvar notificação
    // Baixar mídia imediatamente
    // Notificar administradores
}
```

### **Dashboard de View Once**
```javascript
// Obter estatísticas para dashboard:
const stats = await getViewOnceStats('sessao', 'chat@c.us');

// Resultado:
{
  "viewOnceMessages": 15,
  "images": 12,
  "videos": 3,
  "viewed": 8,
  "unviewed": 7,
  "byDate": {
    "2024-10-30": 5,
    "2024-10-29": 3
  }
}
```

## 🛠️ Troubleshooting

### **Mídia não baixa**
- ✅ Verificar se mensagem não foi visualizada
- ✅ Usar `force: true` para mídia expirada
- ✅ Confirmar que sessão está ativa
- ✅ Verificar tamanho da mídia (limite de 10MB)

### **View Once não detectado**
- ✅ Verificar se callback está habilitado
- ✅ Confirmar que é realmente view once
- ✅ Verificar logs do console

### **Webhook não chega no Boot**
- ✅ Verificar se Boot está rodando em localhost:4001
- ✅ Confirmar endpoint `/api/whatsapp/webhook`
- ✅ Verificar configuração BASE_WEBHOOK_URL

## 📈 Próximas Melhorias

- [ ] Backup automático de view once
- [ ] Filtros avançados por data/tipo
- [ ] Compressão de mídia baixada
- [ ] Notificações push
- [ ] Dashboard analytics

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do console
2. Confirmar configuração de webhooks
3. Testar endpoints via Postman
4. Verificar permissões de arquivo

---

**🔐 Lembre-se: Use esta funcionalidade de forma ética e responsável!**