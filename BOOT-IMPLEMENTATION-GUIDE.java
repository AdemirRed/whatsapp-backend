/**
 * IMPLEMENTAÇÃO PARA SEU BOOT APPLICATION
 * 
 * Controller Spring Boot para receber webhooks do WhatsApp
 * Copie este código para sua aplicação Boot
 */

// ============== JAVA SPRING BOOT CONTROLLER ==============

@RestController
@RequestMapping("/api/whatsapp")
@Slf4j
public class WhatsAppWebhookController {

    @Autowired
    private WhatsAppService whatsAppService; // Seu serviço de negócio

    /**
     * Endpoint principal que recebe todos os webhooks do WhatsApp
     * Este é o endpoint que você configurou: /api/whatsapp/webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> receiveWebhook(@RequestBody Map<String, Object> payload) {
        try {
            log.info("🎉 Webhook recebido: {}", payload);
            
            String dataType = (String) payload.get("dataType");
            String sessionId = (String) payload.get("sessionId");
            Map<String, Object> data = (Map<String, Object>) payload.get("data");
            
            log.info("📊 Evento: {} | Sessão: {}", dataType, sessionId);
            
            // Processar diferentes tipos de eventos
            switch (dataType) {
                case "vote_update":
                    processVoteUpdate(sessionId, data);
                    break;
                    
                case "message":
                case "message_create": 
                    processMessage(sessionId, data);
                    break;
                    
                case "message_reaction":
                    processReaction(sessionId, data);
                    break;
                    
                case "authenticated":
                    log.info("✅ Sessão autenticada: {}", sessionId);
                    break;
                    
                case "ready":
                    log.info("🚀 Sessão pronta: {}", sessionId);
                    break;
                    
                default:
                    log.info("📨 Evento não tratado: {}", dataType);
            }
            
            // IMPORTANTE: Retornar status 200 para que o WhatsApp API não marque como "Failed"
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Webhook processado com sucesso");
            response.put("timestamp", Instant.now().toString());
            response.put("eventType", dataType);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ Erro ao processar webhook", e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            errorResponse.put("timestamp", Instant.now().toString());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * Processar voto de enquete - FUNÇÃO PRINCIPAL QUE VOCÊ QUERIA
     */
    private void processVoteUpdate(String sessionId, Map<String, Object> data) {
        try {
            log.info("🗳️ Processando voto de enquete...");
            
            Map<String, Object> vote = (Map<String, Object>) data.get("vote");
            
            // Extrair dados do voto
            String voter = (String) vote.get("voter");
            Long interactedAt = (Long) vote.get("interractedAtTs");
            List<Map<String, Object>> selectedOptions = (List<Map<String, Object>>) vote.get("selectedOptions");
            
            // Dados da enquete pai
            Map<String, Object> parentMessage = (Map<String, Object>) vote.get("parentMessage");
            String pollName = (String) parentMessage.get("pollName");
            List<Map<String, Object>> pollOptions = (List<Map<String, Object>>) parentMessage.get("pollOptions");
            Boolean allowMultiple = (Boolean) parentMessage.get("allowMultipleAnswers");
            
            // ID da mensagem da enquete
            Map<String, Object> msgKey = (Map<String, Object>) vote.get("parentMsgKey");
            String messageId = (String) msgKey.get("_serialized");
            String chatId = (String) msgKey.get("remote");
            
            log.info("📊 DETALHES DO VOTO:");
            log.info("  👤 Votante: {}", voter);
            log.info("  🗳️ Enquete: {}", pollName);
            log.info("  ✅ Opções votadas: {}", selectedOptions);
            log.info("  💬 Chat: {}", chatId);
            log.info("  🆔 Mensagem: {}", messageId);
            log.info("  🕒 Timestamp: {}", new Date(interactedAt));
            
            // AQUI VOCÊ IMPLEMENTA SUA LÓGICA DE NEGÓCIO:
            
            // 1. Salvar voto no banco de dados
            VoteEntity voteEntity = new VoteEntity();
            voteEntity.setVoter(voter);
            voteEntity.setPollName(pollName);
            voteEntity.setMessageId(messageId);
            voteEntity.setChatId(chatId);
            voteEntity.setSessionId(sessionId);
            voteEntity.setVotedAt(new Date(interactedAt));
            voteEntity.setSelectedOptions(selectedOptions.toString()); // ou JSON
            
            whatsAppService.saveVote(voteEntity);
            log.info("💾 Voto salvo no banco de dados");
            
            // 2. Atualizar estatísticas em tempo real
            whatsAppService.updatePollStatistics(messageId, pollName);
            log.info("📊 Estatísticas atualizadas");
            
            // 3. Notificar outros sistemas (WebSocket, Cache, etc.)
            whatsAppService.notifyVoteUpdate(chatId, pollName, voter, selectedOptions);
            log.info("🔔 Notificações enviadas");
            
            // 4. Trigger de automações (se necessário)
            // whatsAppService.triggerVoteAutomations(vote);
            
        } catch (Exception e) {
            log.error("❌ Erro ao processar voto", e);
            throw new RuntimeException("Erro ao processar voto: " + e.getMessage());
        }
    }
    
    /**
     * Processar mensagem normal
     */
    private void processMessage(String sessionId, Map<String, Object> data) {
        log.info("💬 Processando mensagem...");
        
        String from = (String) data.get("from");
        String body = (String) data.get("body");
        String type = (String) data.get("type");
        
        // Se for criação de enquete
        if ("poll_creation".equals(type)) {
            String pollName = (String) data.get("pollName");
            List<Map<String, Object>> pollOptions = (List<Map<String, Object>>) data.get("pollOptions");
            
            log.info("🗳️ Nova enquete criada: {} com {} opções", pollName, pollOptions.size());
            
            // Salvar enquete no banco
            whatsAppService.savePoll(pollName, pollOptions, from, sessionId);
        } else {
            // Processar mensagem normal
            whatsAppService.saveMessage(from, body, type, sessionId);
        }
    }
    
    /**
     * Processar reação
     */
    private void processReaction(String sessionId, Map<String, Object> data) {
        log.info("😀 Processando reação...");
        
        Map<String, Object> reaction = (Map<String, Object>) data.get("reaction");
        String senderId = (String) reaction.get("senderId");
        String emoji = (String) reaction.get("reaction");
        
        // Salvar reação
        whatsAppService.saveReaction(senderId, emoji, sessionId);
    }
}

// ============== ENTITY EXEMPLO ==============

@Entity
@Table(name = "whatsapp_votes")
public class VoteEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "voter")
    private String voter;
    
    @Column(name = "poll_name")
    private String pollName;
    
    @Column(name = "message_id")
    private String messageId;
    
    @Column(name = "chat_id")
    private String chatId;
    
    @Column(name = "session_id")
    private String sessionId;
    
    @Column(name = "voted_at")
    private Date votedAt;
    
    @Column(name = "selected_options", columnDefinition = "TEXT")
    private String selectedOptions;
    
    @Column(name = "created_at")
    private Date createdAt = new Date();
    
    // Getters e Setters...
}

// ============== SERVICE EXEMPLO ==============

@Service
@Slf4j
public class WhatsAppService {
    
    @Autowired
    private VoteRepository voteRepository;
    
    // Outras injeções...
    
    public void saveVote(VoteEntity vote) {
        voteRepository.save(vote);
        log.info("✅ Voto salvo: {} votou em {}", vote.getVoter(), vote.getPollName());
    }
    
    public void updatePollStatistics(String messageId, String pollName) {
        // Implementar lógica de estatísticas
        List<VoteEntity> votes = voteRepository.findByMessageId(messageId);
        log.info("📊 Enquete '{}' tem {} votos totais", pollName, votes.size());
    }
    
    public void notifyVoteUpdate(String chatId, String pollName, String voter, List<Map<String, Object>> options) {
        // Implementar notificações (WebSocket, Cache, etc.)
        log.info("🔔 Notificando voto: {} em {} no chat {}", voter, pollName, chatId);
    }
    
    // Outros métodos...
}

// ============== CONFIGURAÇÃO APPLICATION.PROPERTIES ==============

# Configurações do webhook
whatsapp.webhook.enabled=true
whatsapp.webhook.url=http://localhost:201/
whatsapp.vote.processing.enabled=true

# Logging
logging.level.com.yourcompany.whatsapp=DEBUG