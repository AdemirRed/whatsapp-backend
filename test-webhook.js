#!/usr/bin/env node

/**
 * TESTE RÁPIDO DO WEBHOOK DE VOTOS
 * 
 * Este script demonstra como capturar votos de enquetes em tempo real
 */

const express = require('express');
const app = express();
const port = 3001;

app.use(express.json({ limit: '50mb' }));

// Armazenar votos recebidos
const votesReceived = [];

// Endpoint principal para receber webhooks
app.post('/webhook/vote', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log('\n🎉 ======= NOVO VOTO RECEBIDO =======');
    console.log('⏰ Timestamp:', timestamp);
    
    const { sessionId, event, payload } = req.body;
    
    if (event === 'vote_update') {
        const { vote } = payload;
        
        console.log('📊 DETALHES DO VOTO:');
        console.log('  🏷️  Sessão:', sessionId);
        console.log('  👤 Votante:', vote.voter);
        console.log('  🕒 Horário do voto:', new Date(vote.interractedAtTs * 1000).toLocaleString('pt-BR'));
        console.log('  🆔 ID da enquete:', vote.parentMsgKey?.id || 'N/A');
        
        // Tentar extrair informações da enquete
        if (vote.parentMessage) {
            console.log('  📝 Enquete:', vote.parentMessage.body || 'N/A');
            console.log('  📍 Chat:', vote.parentMessage.from || 'N/A');
        }
        
        // Armazenar o voto
        const voteData = {
            id: votesReceived.length + 1,
            sessionId,
            voter: vote.voter,
            timestamp: vote.interractedAtTs,
            receivedAt: Date.now(),
            pollId: vote.parentMsgKey?.id,
            chatId: vote.parentMessage?.from
        };
        
        votesReceived.push(voteData);
        
        console.log('✅ Voto #' + voteData.id + ' processado e armazenado!');
        console.log('📈 Total de votos recebidos:', votesReceived.length);
        
    } else {
        console.log('📨 Evento recebido:', event);
    }
    
    console.log('=====================================\n');
    
    res.status(200).json({ 
        success: true, 
        received: true,
        timestamp: timestamp,
        totalVotes: votesReceived.length
    });
});

// Endpoint para ver estatísticas
app.get('/webhook/stats', (req, res) => {
    res.json({
        totalVotesReceived: votesReceived.length,
        votes: votesReceived,
        lastVote: votesReceived[votesReceived.length - 1] || null,
        webhookActive: true,
        timestamp: new Date().toISOString()
    });
});

// Endpoint de teste
app.get('/webhook/test', (req, res) => {
    res.json({ 
        status: 'Webhook funcionando!',
        endpoint: '/webhook/vote',
        stats: '/webhook/stats',
        totalVotesReceived: votesReceived.length,
        timestamp: new Date().toISOString()
    });
});

// Página simples para monitorar
app.get('/', (req, res) => {
    res.send(`
        <h1>🗳️ Monitor de Votos WhatsApp</h1>
        <p><strong>Status:</strong> Webhook ativo e funcionando!</p>
        <p><strong>Votos recebidos:</strong> ${votesReceived.length}</p>
        <p><strong>Endpoint:</strong> POST /webhook/vote</p>
        
        <h2>Último voto:</h2>
        <pre>${JSON.stringify(votesReceived[votesReceived.length - 1] || 'Nenhum voto ainda', null, 2)}</pre>
        
        <h2>Links úteis:</h2>
        <ul>
            <li><a href="/webhook/test">Teste do webhook</a></li>
            <li><a href="/webhook/stats">Estatísticas completas</a></li>
        </ul>
        
        <h2>Como testar:</h2>
        <ol>
            <li>Certifique-se que a API WhatsApp está rodando na porta 200</li>
            <li>Crie uma enquete usando a API</li>
            <li>Vote na enquete pelo WhatsApp</li>
            <li>Veja os votos aparecerem aqui!</li>
        </ol>
        
        <script>
            // Atualizar página a cada 5 segundos para ver novos votos
            setTimeout(() => location.reload(), 5000);
        </script>
    `);
});

app.listen(port, () => {
    console.log('🚀 ======= WEBHOOK DE VOTOS INICIADO =======');
    console.log('📍 Rodando em: http://localhost:' + port);
    console.log('🎯 Endpoint de votos: http://localhost:' + port + '/webhook/vote');
    console.log('📊 Monitor web: http://localhost:' + port);
    console.log('🧪 Teste: http://localhost:' + port + '/webhook/test');
    console.log('📈 Stats: http://localhost:' + port + '/webhook/stats');
    console.log('');
    console.log('💡 PRÓXIMO PASSO:');
    console.log('   1. Inicie a API WhatsApp: npm start');
    console.log('   2. Crie uma enquete');
    console.log('   3. Vote nela e veja os resultados aqui!');
    console.log('==========================================\n');
    
    console.log('⏳ Aguardando votos...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n📊 RESUMO FINAL:');
    console.log('Total de votos capturados:', votesReceived.length);
    console.log('Webhook encerrado.');
    process.exit(0);
});