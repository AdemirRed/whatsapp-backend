/**
 * EXEMPLO DE WEBHOOK PARA CAPTURAR VOTOS DE ENQUETES
 * 
 * A biblioteca whatsapp-web.js já possui suporte nativo para capturar votos
 * de enquetes através do evento 'vote_update'. Este exemplo mostra como
 * configurar um webhook para receber essas notificações.
 */

const express = require('express');
const app = express();
const port = 3001;

// Middleware para processar JSON
app.use(express.json());

// Endpoint para receber webhooks de votos de enquetes
app.post('/webhook/vote', (req, res) => {
    console.log('🗳️ VOTO RECEBIDO VIA WEBHOOK!');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Dados completos:', JSON.stringify(req.body, null, 2));
    
    const { sessionId, event, payload } = req.body;
    
    if (event === 'vote_update') {
        const { vote } = payload;
        
        console.log('\n📊 INFORMAÇÕES DO VOTO:');
        console.log('- Sessão:', sessionId);
        console.log('- Votante:', vote.voter);
        console.log('- Timestamp do voto:', new Date(vote.interractedAtTs * 1000).toISOString());
        console.log('- ID da mensagem da enquete:', vote.parentMsgKey);
        
        // Aqui você pode processar o voto como desejar:
        // - Salvar no banco de dados
        // - Enviar notificação
        // - Atualizar estatísticas em tempo real
        // - Integrar com outros sistemas
        
        processVote(sessionId, vote);
    }
    
    res.status(200).json({ received: true });
});

// Função para processar o voto recebido
function processVote(sessionId, vote) {
    console.log('\n🔄 PROCESSANDO VOTO...');
    
    // Exemplo de processamento:
    const voteData = {
        sessionId: sessionId,
        voter: vote.voter,
        pollMessageId: vote.parentMsgKey,
        timestamp: vote.interractedAtTs,
        receivedAt: Date.now()
    };
    
    // Aqui você implementaria sua lógica de negócio:
    // 1. Salvar no banco de dados
    // 2. Atualizar contadores
    // 3. Notificar administradores
    // 4. Etc.
    
    console.log('✅ Voto processado:', voteData);
}

// Endpoint de teste
app.get('/webhook/test', (req, res) => {
    res.json({ 
        message: 'Webhook funcionando!',
        timestamp: new Date().toISOString(),
        endpoint: '/webhook/vote'
    });
});

app.listen(port, () => {
    console.log(`🚀 Webhook server rodando em http://localhost:${port}`);
    console.log(`📝 Endpoint para votos: http://localhost:${port}/webhook/vote`);
    console.log(`🧪 Teste: http://localhost:${port}/webhook/test`);
});

/**
 * CONFIGURAÇÃO NECESSÁRIA:
 * 
 * 1. No arquivo .env da API do WhatsApp, configure:
 *    BASE_WEBHOOK_URL=http://localhost:3001/webhook/vote
 * 
 * 2. Certifique-se que vote_update não está em DISABLED_CALLBACKS
 * 
 * 3. Inicie este webhook server: node webhook-example.js
 * 
 * 4. Inicie a API do WhatsApp: npm start
 * 
 * 5. Crie uma enquete e vote nela - você receberá a notificação!
 */