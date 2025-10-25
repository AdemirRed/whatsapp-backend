/**
 * EXEMPLO DE WEBHOOK RECEIVER PARA BOOT
 * 
 * Este é um exemplo de como sua aplicação Boot deve receber
 * os webhooks de votos, mensagens e reações do WhatsApp
 */

// Estrutura que sua aplicação Boot receberá:

// ===============================
// 1. WEBHOOK DE VOTO (vote_update)
// ===============================
const exemploVoteWebhook = {
  "dataType": "vote_update",
  "sessionId": "redblack", 
  "data": {
    "vote": {
      "voter": "555198804804@c.us",
      "interractedAtTs": 1698765432,
      "parentMsgKey": {
        "id": "3EB0123456789ABCDEF",
        "fromMe": false,
        "_serialized": "false_555198804804@c.us_3EB0123456789ABCDEF"
      },
      "parentMessage": {
        "id": {
          "id": "3EB0123456789ABCDEF",
          "fromMe": false,
          "_serialized": "false_555198804804@c.us_3EB0123456789ABCDEF"
        },
        "body": "Qual sua cor favorita?",
        "type": "poll_creation",
        "timestamp": 1698765400,
        "from": "5511999999999@c.us",
        "to": "555198804804@c.us",
        "deviceType": "web",
        "hasMedia": false,
        "poll": {
          "name": "Qual sua cor favorita?",
          "options": ["Azul", "Verde", "Vermelho", "Amarelo"],
          "allowMultipleAnswers": false
        }
      }
    }
  }
};

// ===============================
// 2. WEBHOOK DE MENSAGEM
// ===============================
const exemploMessageWebhook = {
  "dataType": "message",
  "sessionId": "redblack",
  "data": {
    "id": {
      "id": "3EB0123456789ABCDEF",
      "fromMe": false,
      "_serialized": "false_5511999999999@c.us_3EB0123456789ABCDEF"
    },
    "body": "Olá! Como está?",
    "type": "chat",
    "timestamp": 1698765432,
    "from": "5511999999999@c.us",
    "to": "555198804804@c.us",
    "author": "5511999999999@c.us",
    "deviceType": "android",
    "isForwarded": false,
    "forwardingScore": 0,
    "isStatus": false,
    "isStarred": false,
    "fromMe": false,
    "hasMedia": false,
    "hasQuotedMsg": false
  }
};

// ===============================
// 3. WEBHOOK DE REAÇÃO
// ===============================
const exemploReactionWebhook = {
  "dataType": "message_reaction", 
  "sessionId": "redblack",
  "data": {
    "reaction": {
      "id": {
        "id": "3EB0123456789ABCDEF",
        "fromMe": false,
        "_serialized": "false_5511999999999@c.us_3EB0123456789ABCDEF"
      },
      "msgId": {
        "id": "3EB0MESSAGE123456789",
        "fromMe": true,
        "_serialized": "true_555198804804@c.us_3EB0MESSAGE123456789"
      },
      "reaction": "👍", // emoji da reação
      "read": false,
      "senderId": "5511999999999@c.us",
      "timestamp": 1698765432
    }
  }
};

// ===============================
// EXEMPLO DE CONTROLLER BOOT JAVA
// ===============================

/*
@RestController
@RequestMapping("/api/whatsapp")
public class WhatsAppWebhookController {
    
    @PostMapping("/webhook")
    public ResponseEntity<String> receiveWebhook(@RequestBody Map<String, Object> payload) {
        
        String dataType = (String) payload.get("dataType");
        String sessionId = (String) payload.get("sessionId"); 
        Map<String, Object> data = (Map<String, Object>) payload.get("data");
        
        switch (dataType) {
            case "vote_update":
                processVote(sessionId, data);
                break;
                
            case "message":
                processMessage(sessionId, data);
                break;
                
            case "message_reaction":
                processReaction(sessionId, data);
                break;
                
            case "message_create":
                processMessageCreate(sessionId, data);
                break;
                
            default:
                log.info("Evento não tratado: {}", dataType);
        }
        
        return ResponseEntity.ok("Webhook recebido");
    }
    
    private void processVote(String sessionId, Map<String, Object> data) {
        Map<String, Object> vote = (Map<String, Object>) data.get("vote");
        String voter = (String) vote.get("voter");
        Long timestamp = (Long) vote.get("interractedAtTs");
        
        Map<String, Object> parentMessage = (Map<String, Object>) vote.get("parentMessage");
        String pollName = (String) parentMessage.get("body");
        
        log.info("VOTO RECEBIDO - Sessão: {}, Votante: {}, Enquete: {}", 
                sessionId, voter, pollName);
        
        // Salvar no banco de dados
        VoteEntity voteEntity = new VoteEntity();
        voteEntity.setSessionId(sessionId);
        voteEntity.setVoter(voter);
        voteEntity.setPollName(pollName);
        voteEntity.setTimestamp(Instant.ofEpochSecond(timestamp));
        voteRepository.save(voteEntity);
        
        // Notificar outros sistemas
        eventPublisher.publishEvent(new VoteReceivedEvent(voteEntity));
    }
    
    private void processMessage(String sessionId, Map<String, Object> data) {
        String messageId = getMessageId(data);
        String body = (String) data.get("body");
        String from = (String) data.get("from");
        String type = (String) data.get("type");
        
        log.info("MENSAGEM RECEBIDA - Sessão: {}, De: {}, Tipo: {}, Texto: {}", 
                sessionId, from, type, body);
        
        // Processar mensagem
        MessageEntity message = new MessageEntity();
        message.setSessionId(sessionId);
        message.setMessageId(messageId);
        message.setBody(body);
        message.setFromNumber(from);
        message.setType(type);
        messageRepository.save(message);
    }
    
    private void processReaction(String sessionId, Map<String, Object> data) {
        Map<String, Object> reaction = (Map<String, Object>) data.get("reaction");
        String emoji = (String) reaction.get("reaction");
        String senderId = (String) reaction.get("senderId");
        
        log.info("REAÇÃO RECEBIDA - Sessão: {}, De: {}, Emoji: {}", 
                sessionId, senderId, emoji);
        
        // Processar reação
        // ...
    }
    
    private String getMessageId(Map<String, Object> data) {
        Map<String, Object> id = (Map<String, Object>) data.get("id");
        return (String) id.get("_serialized");
    }
}
*/

module.exports = {
    exemploVoteWebhook,
    exemploMessageWebhook, 
    exemploReactionWebhook
};