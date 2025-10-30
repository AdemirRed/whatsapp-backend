/**
 * IMPLEMENTAÇÃO COMPLETA PARA BOOT APPLICATION
 * 
 * Controller Spring Boot para gerenciar mídia View Once do WhatsApp
 * Integração completa com detecção, download e armazenamento
 */

// ============== JAVA SPRING BOOT CONTROLLER ==============

@RestController
@RequestMapping("/api/whatsapp")
@Slf4j
public class WhatsAppViewOnceController {

    @Autowired
    private ViewOnceService viewOnceService;
    
    @Autowired
    private WhatsAppApiService whatsAppApiService;

    /**
     * Webhook para receber notificações de View Once detectado
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> receiveWebhook(@RequestBody Map<String, Object> payload) {
        try {
            String dataType = (String) payload.get("dataType");
            String sessionId = (String) payload.get("sessionId");
            
            log.info("🎯 Webhook recebido: {} para sessão {}", dataType, sessionId);
            
            if ("view_once_detected".equals(dataType)) {
                handleViewOnceDetected(sessionId, payload);
            } else if ("view_once_media".equals(dataType)) {
                handleViewOnceMedia(sessionId, payload);
            } else {
                // Outros tipos de webhook (message, vote_update, etc.)
                handleOtherWebhooks(dataType, sessionId, payload);
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Webhook processado com sucesso",
                "timestamp", Instant.now().toString()
            ));
            
        } catch (Exception e) {
            log.error("❌ Erro ao processar webhook", e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
    
    /**
     * Processar detecção de nova mídia View Once
     */
    private void handleViewOnceDetected(String sessionId, Map<String, Object> payload) {
        try {
            Map<String, Object> data = (Map<String, Object>) payload.get("data");
            Map<String, Object> metadata = (Map<String, Object>) data.get("metadata");
            
            String from = (String) metadata.get("from");
            String type = (String) metadata.get("type");
            Boolean hasMedia = (Boolean) metadata.get("hasMedia");
            Long timestamp = ((Number) metadata.get("timestamp")).longValue();
            Boolean viewed = (Boolean) metadata.get("viewed");
            
            log.info("👁️ View Once detectado: {} de {} ({})", type, from, hasMedia ? "com mídia" : "sem mídia");
            
            if (hasMedia && !viewed) {
                // Salvar notificação no banco
                ViewOnceDetectedEntity detection = new ViewOnceDetectedEntity();
                detection.setSessionId(sessionId);
                detection.setFromContact(from);
                detection.setMediaType(type);
                detection.setDetectedAt(new Date());
                detection.setTimestamp(new Date(timestamp * 1000));
                detection.setHasMedia(hasMedia);
                detection.setViewed(viewed);
                detection.setStatus("DETECTED");
                
                viewOnceService.saveDetection(detection);
                
                // Tentar baixar mídia automaticamente
                tryDownloadViewOnceMedia(sessionId, data);
                
                // Notificar administradores
                notifyAdministrators(detection);
            }
            
        } catch (Exception e) {
            log.error("❌ Erro ao processar detecção View Once", e);
        }
    }
    
    /**
     * Processar mídia View Once baixada
     */
    private void handleViewOnceMedia(String sessionId, Map<String, Object> payload) {
        try {
            Map<String, Object> data = (Map<String, Object>) payload.get("data");
            Map<String, Object> messageMedia = (Map<String, Object>) data.get("messageMedia");
            Map<String, Object> message = (Map<String, Object>) data.get("message");
            
            String mimeType = (String) messageMedia.get("mimetype");
            String filename = (String) messageMedia.get("filename");
            String base64Data = (String) messageMedia.get("data");
            
            // Converter base64 para bytes
            byte[] mediaBytes = Base64.getDecoder().decode(base64Data);
            
            // Salvar arquivo fisicamente
            String savedPath = saveViewOnceMediaFile(mediaBytes, filename, mimeType);
            
            // Salvar referência no banco
            ViewOnceMediaEntity mediaEntity = new ViewOnceMediaEntity();
            mediaEntity.setSessionId(sessionId);
            mediaEntity.setMessageId(getMessageId(message));
            mediaEntity.setFromContact(getFromContact(message));
            mediaEntity.setMimeType(mimeType);
            mediaEntity.setFilename(filename);
            mediaEntity.setFilePath(savedPath);
            mediaEntity.setFileSize((long) mediaBytes.length);
            mediaEntity.setDownloadedAt(new Date());
            mediaEntity.setStatus("DOWNLOADED");
            
            viewOnceService.saveMedia(mediaEntity);
            
            log.info("💾 Mídia View Once salva: {} ({} bytes)", filename, mediaBytes.length);
            
        } catch (Exception e) {
            log.error("❌ Erro ao processar mídia View Once", e);
        }
    }
    
    /**
     * Tentar baixar mídia View Once automaticamente
     */
    private void tryDownloadViewOnceMedia(String sessionId, Map<String, Object> messageData) {
        try {
            // Extrair dados da mensagem
            Map<String, Object> message = (Map<String, Object>) messageData.get("message");
            String messageId = getMessageId(message);
            String fromContact = getFromContact(message);
            
            // Chamar API para baixar
            ViewOnceMediaResponse response = whatsAppApiService.downloadViewOnceMedia(
                sessionId, messageId, fromContact, false
            );
            
            if (response.isSuccess()) {
                log.info("✅ Mídia View Once baixada automaticamente: {}", messageId);
            } else {
                log.warn("⚠️ Falha ao baixar mídia View Once: {}", response.getError());
            }
            
        } catch (Exception e) {
            log.error("❌ Erro ao tentar baixar mídia View Once automaticamente", e);
        }
    }
    
    /**
     * Salvar arquivo de mídia fisicamente
     */
    private String saveViewOnceMediaFile(byte[] mediaBytes, String filename, String mimeType) {
        try {
            // Diretório de armazenamento
            String baseDir = "storage/viewonce/" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
            Path directoryPath = Paths.get(baseDir);
            Files.createDirectories(directoryPath);
            
            // Nome único do arquivo
            String uniqueFilename = System.currentTimeMillis() + "_" + filename;
            Path filePath = directoryPath.resolve(uniqueFilename);
            
            // Salvar arquivo
            Files.write(filePath, mediaBytes);
            
            log.info("📁 Arquivo salvo: {}", filePath.toString());
            return filePath.toString();
            
        } catch (Exception e) {
            log.error("❌ Erro ao salvar arquivo", e);
            throw new RuntimeException("Erro ao salvar mídia: " + e.getMessage());
        }
    }
    
    /**
     * Notificar administradores sobre nova mídia View Once
     */
    private void notifyAdministrators(ViewOnceDetectedEntity detection) {
        try {
            // Enviar notificação por email, Slack, etc.
            String subject = "Nova mídia View Once detectada";
            String message = String.format(
                "Nova mídia View Once detectada:\n" +
                "- Sessão: %s\n" +
                "- Contato: %s\n" +
                "- Tipo: %s\n" +
                "- Data: %s",
                detection.getSessionId(),
                detection.getFromContact(),
                detection.getMediaType(),
                detection.getDetectedAt()
            );
            
            // notificationService.sendNotification(subject, message);
            log.info("🔔 Notificação enviada para administradores");
            
        } catch (Exception e) {
            log.error("❌ Erro ao enviar notificação", e);
        }
    }
    
    // ============== ENDPOINTS DE GERENCIAMENTO ==============
    
    /**
     * Listar mídias View Once salvas
     */
    @GetMapping("/viewonce/list")
    public ResponseEntity<List<ViewOnceMediaEntity>> listViewOnceMedia(
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String fromContact,
            @RequestParam(defaultValue = "50") int limit) {
        
        List<ViewOnceMediaEntity> mediaList = viewOnceService.findViewOnceMedia(
            sessionId, fromContact, limit
        );
        
        return ResponseEntity.ok(mediaList);
    }
    
    /**
     * Baixar arquivo de mídia View Once
     */
    @GetMapping("/viewonce/download/{id}")
    public ResponseEntity<Resource> downloadViewOnceFile(@PathVariable Long id) {
        try {
            ViewOnceMediaEntity media = viewOnceService.findById(id);
            if (media == null) {
                return ResponseEntity.notFound().build();
            }
            
            Path filePath = Paths.get(media.getFilePath());
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }
            
            Resource resource = new FileSystemResource(filePath);
            
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + media.getFilename() + "\"")
                .header(HttpHeaders.CONTENT_TYPE, media.getMimeType())
                .body(resource);
                
        } catch (Exception e) {
            log.error("❌ Erro ao baixar arquivo", e);
            return ResponseEntity.status(500).build();
        }
    }
    
    /**
     * Obter estatísticas de View Once
     */
    @GetMapping("/viewonce/stats")
    public ResponseEntity<ViewOnceStatsDTO> getViewOnceStats(
            @RequestParam(required = false) String sessionId,
            @RequestParam(defaultValue = "30") int days) {
        
        ViewOnceStatsDTO stats = viewOnceService.getStatistics(sessionId, days);
        return ResponseEntity.ok(stats);
    }
    
    // ============== MÉTODOS UTILITÁRIOS ==============
    
    private String getMessageId(Map<String, Object> message) {
        Map<String, Object> id = (Map<String, Object>) message.get("id");
        return (String) id.get("_serialized");
    }
    
    private String getFromContact(Map<String, Object> message) {
        return (String) message.get("from");
    }
    
    private void handleOtherWebhooks(String dataType, String sessionId, Map<String, Object> payload) {
        // Processar outros tipos de webhook (message, vote_update, etc.)
        log.info("📨 Processando webhook: {}", dataType);
    }
}

// ============== ENTIDADES JPA ==============

@Entity
@Table(name = "viewonce_detections")
public class ViewOnceDetectedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "session_id")
    private String sessionId;
    
    @Column(name = "from_contact")
    private String fromContact;
    
    @Column(name = "media_type")
    private String mediaType;
    
    @Column(name = "detected_at")
    private Date detectedAt;
    
    @Column(name = "timestamp")
    private Date timestamp;
    
    @Column(name = "has_media")
    private Boolean hasMedia;
    
    @Column(name = "viewed")
    private Boolean viewed;
    
    @Column(name = "status")
    private String status;
    
    // Getters e Setters...
}

@Entity
@Table(name = "viewonce_media")
public class ViewOnceMediaEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "session_id")
    private String sessionId;
    
    @Column(name = "message_id")
    private String messageId;
    
    @Column(name = "from_contact")
    private String fromContact;
    
    @Column(name = "mime_type")
    private String mimeType;
    
    @Column(name = "filename")
    private String filename;
    
    @Column(name = "file_path")
    private String filePath;
    
    @Column(name = "file_size")
    private Long fileSize;
    
    @Column(name = "downloaded_at")
    private Date downloadedAt;
    
    @Column(name = "status")
    private String status;
    
    // Getters e Setters...
}

// ============== SERVICE ==============

@Service
@Slf4j
public class ViewOnceService {
    
    @Autowired
    private ViewOnceDetectionRepository detectionRepository;
    
    @Autowired
    private ViewOnceMediaRepository mediaRepository;
    
    public void saveDetection(ViewOnceDetectedEntity detection) {
        detectionRepository.save(detection);
        log.info("✅ Detecção View Once salva: {}", detection.getId());
    }
    
    public void saveMedia(ViewOnceMediaEntity media) {
        mediaRepository.save(media);
        log.info("✅ Mídia View Once salva: {}", media.getId());
    }
    
    public List<ViewOnceMediaEntity> findViewOnceMedia(String sessionId, String fromContact, int limit) {
        if (sessionId != null && fromContact != null) {
            return mediaRepository.findBySessionIdAndFromContactOrderByDownloadedAtDesc(
                sessionId, fromContact, PageRequest.of(0, limit)
            );
        } else if (sessionId != null) {
            return mediaRepository.findBySessionIdOrderByDownloadedAtDesc(
                sessionId, PageRequest.of(0, limit)
            );
        } else {
            return mediaRepository.findAllByOrderByDownloadedAtDesc(PageRequest.of(0, limit));
        }
    }
    
    public ViewOnceMediaEntity findById(Long id) {
        return mediaRepository.findById(id).orElse(null);
    }
    
    public ViewOnceStatsDTO getStatistics(String sessionId, int days) {
        Date cutoffDate = Date.from(Instant.now().minus(days, ChronoUnit.DAYS));
        
        ViewOnceStatsDTO stats = new ViewOnceStatsDTO();
        
        if (sessionId != null) {
            stats.setTotalDetections(detectionRepository.countBySessionIdAndDetectedAtAfter(sessionId, cutoffDate));
            stats.setTotalMedia(mediaRepository.countBySessionIdAndDownloadedAtAfter(sessionId, cutoffDate));
        } else {
            stats.setTotalDetections(detectionRepository.countByDetectedAtAfter(cutoffDate));
            stats.setTotalMedia(mediaRepository.countByDownloadedAtAfter(cutoffDate));
        }
        
        // Mais estatísticas...
        
        return stats;
    }
}

// ============== CONFIGURAÇÕES ==============

@Configuration
@EnableJpaRepositories
public class ViewOnceConfig {
    
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
    
    @Value("${whatsapp.api.url:http://localhost:200}")
    private String whatsappApiUrl;
    
    @Value("${whatsapp.api.key:redblack}")
    private String whatsappApiKey;
    
    @Bean
    public WhatsAppApiService whatsAppApiService() {
        return new WhatsAppApiService(whatsappApiUrl, whatsappApiKey);
    }
}

// ============== SCRIPT SQL ==============

/*
CREATE TABLE viewonce_detections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    from_contact VARCHAR(255) NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    detected_at TIMESTAMP NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    has_media BOOLEAN NOT NULL,
    viewed BOOLEAN NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_detected (session_id, detected_at),
    INDEX idx_from_contact (from_contact),
    INDEX idx_status (status)
);

CREATE TABLE viewonce_media (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    from_contact VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    downloaded_at TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_downloaded (session_id, downloaded_at),
    INDEX idx_message_id (message_id),
    INDEX idx_from_contact (from_contact),
    INDEX idx_status (status)
);
*/