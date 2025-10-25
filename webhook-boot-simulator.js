#!/usr/bin/env node

/**
 * WEBHOOK RECEIVER DE TESTE PARA BOOT
 * 
 * Este servidor simula como sua aplicação Boot deve receber
 * os webhooks de votos, mensagens e reações
 */

const express = require('express');
const app = express();
const port = 4001;

app.use(express.json({ limit: '50mb' }));

// Armazenar eventos recebidos
const eventsReceived = [];

// Endpoint principal - igual ao que você tem no Boot
app.post('/api/whatsapp/webhook', (req, res) => {
    const timestamp = new Date().toISOString();
    
    console.log('\n🎉 ======= WEBHOOK RECEBIDO =======');
    console.log('⏰ Timestamp:', timestamp);
    console.log('📋 Headers:', req.headers);
    
    const { dataType, sessionId, data } = req.body;
    
    console.log('📊 DADOS DO WEBHOOK:');
    console.log('  🏷️  Tipo de Evento:', dataType);
    console.log('  🔗 Sessão:', sessionId);
    
    // Processar diferentes tipos de eventos
    switch (dataType) {
        case 'vote_update':
            processVote(sessionId, data);
            break;
            
        case 'message':
            processMessage(sessionId, data);
            break;
            
        case 'message_create':
            processMessageCreate(sessionId, data);
            break;
            
        case 'message_reaction':
            processReaction(sessionId, data);
            break;
            
        case 'authenticated':
            console.log('✅ Sessão autenticada:', sessionId);
            break;
            
        case 'ready':
            console.log('🚀 Sessão pronta:', sessionId);
            break;
            
        case 'loading_screen':
            console.log('⏳ Carregando:', data);
            break;
            
        default:
            console.log('📨 Evento não tratado:', dataType);
            console.log('📄 Dados:', JSON.stringify(data, null, 2));
    }
    
    // Armazenar evento
    eventsReceived.push({
        id: eventsReceived.length + 1,
        timestamp,
        dataType,
        sessionId,
        data
    });
    
    console.log('=====================================\n');
    
    res.status(200).json({ 
        success: true,
        message: 'Webhook recebido com sucesso',
        timestamp: timestamp,
        eventId: eventsReceived.length
    });
});

// Processar voto de enquete
function processVote(sessionId, data) {
    const vote = data.vote;
    
    console.log('🗳️  VOTO RECEBIDO:');
    console.log('  👤 Votante:', vote.voter);
    console.log('  🕒 Timestamp:', new Date(vote.interractedAtTs).toLocaleString('pt-BR'));
    console.log('  📝 Enquete:', vote.parentMessage.pollName);
    console.log('  📊 Opções da enquete:', vote.parentMessage.pollOptions);
    console.log('  ✅ Opções selecionadas:', vote.selectedOptions);
    console.log('  🆔 ID da mensagem:', vote.parentMsgKey._serialized);
    console.log('  💬 Chat:', vote.parentMsgKey.remote);
    console.log('  🔄 Multiple answers:', vote.parentMessage.allowMultipleAnswers);
    
    // Aqui você implementaria a lógica do seu Boot:
    // - Salvar no banco de dados
    // - Notificar outros sistemas
    // - Atualizar estatísticas
    
    console.log('💾 [BOOT ACTION] Salvando voto no banco de dados...');
    console.log('📊 [BOOT ACTION] Atualizando estatísticas da enquete...');
}

// Processar mensagem
function processMessage(sessionId, data) {
    console.log('💬 MENSAGEM RECEBIDA:');
    console.log('  📱 De:', data.from);
    console.log('  📝 Texto:', data.body);
    console.log('  📅 Timestamp:', new Date(data.timestamp * 1000).toLocaleString('pt-BR'));
    console.log('  🏷️  Tipo:', data.type);
    console.log('  🆔 ID:', data.id?._serialized);
    
    if (data.hasMedia) {
        console.log('  📎 Tem mídia: SIM');
    }
    
    if (data.hasQuotedMsg) {
        console.log('  💬 Resposta a mensagem: SIM');
    }
    
    console.log('💾 [BOOT ACTION] Salvando mensagem no banco...');
}

// Processar criação de mensagem
function processMessageCreate(sessionId, data) {
    console.log('📝 MENSAGEM CRIADA:');
    console.log('  📱 De:', data.from);
    console.log('  📝 Texto:', data.body);
    console.log('  🏷️  Tipo:', data.type);
    
    // Se for criação de enquete
    if (data.type === 'poll_creation') {
        console.log('  🗳️  ENQUETE CRIADA:');
        console.log('    📋 Nome:', data.pollName);
        console.log('    📊 Opções:', data.pollOptions);
        console.log('    🔄 Múltiplas respostas:', data.allowMultipleAnswers);
        
        console.log('💾 [BOOT ACTION] Registrando nova enquete...');
    }
}

// Processar reação
function processReaction(sessionId, data) {
    console.log('😀 REAÇÃO RECEBIDA:');
    console.log('  👤 De:', data.reaction.senderId);
    console.log('  😀 Emoji:', data.reaction.reaction);
    console.log('  🎯 Mensagem alvo:', data.reaction.msgId._serialized);
    console.log('  🕒 Timestamp:', new Date(data.reaction.timestamp).toLocaleString('pt-BR'));
    
    console.log('💾 [BOOT ACTION] Salvando reação...');
}

// Endpoint para ver estatísticas
app.get('/api/whatsapp/stats', (req, res) => {
    const stats = {
        totalEvents: eventsReceived.length,
        eventsByType: {},
        lastEvents: eventsReceived.slice(-10)
    };
    
    // Contar eventos por tipo
    eventsReceived.forEach(event => {
        stats.eventsByType[event.dataType] = (stats.eventsByType[event.dataType] || 0) + 1;
    });
    
    res.json(stats);
});

// Endpoint para ver todos os eventos
app.get('/api/whatsapp/events', (req, res) => {
    res.json({
        total: eventsReceived.length,
        events: eventsReceived
    });
});

// Página de monitoramento
app.get('/', (req, res) => {
    const eventsByType = {};
    eventsReceived.forEach(event => {
        eventsByType[event.dataType] = (eventsByType[event.dataType] || 0) + 1;
    });
    
    res.send(`
        <h1>🚀 Webhook WhatsApp - Simulator Boot</h1>
        <p><strong>Status:</strong> Recebendo webhooks do WhatsApp</p>
        <p><strong>Total de eventos:</strong> ${eventsReceived.length}</p>
        
        <h2>📊 Eventos por tipo:</h2>
        <pre>${JSON.stringify(eventsByType, null, 2)}</pre>
        
        <h2>🔄 Último evento:</h2>
        <pre>${JSON.stringify(eventsReceived[eventsReceived.length - 1] || 'Nenhum evento ainda', null, 2)}</pre>
        
        <h2>🔗 Links:</h2>
        <ul>
            <li><a href="/api/whatsapp/stats">Estatísticas</a></li>
            <li><a href="/api/whatsapp/events">Todos os eventos</a></li>
        </ul>
        
        <script>
            // Atualizar a cada 3 segundos
            setTimeout(() => location.reload(), 3000);
        </script>
    `);
});

app.listen(port, () => {
    console.log('🚀 ======= WEBHOOK BOOT SIMULATOR =======');
    console.log('📍 Endpoint: http://localhost:' + port + '/api/whatsapp/webhook');
    console.log('📊 Monitor: http://localhost:' + port);
    console.log('📈 Stats: http://localhost:' + port + '/api/whatsapp/stats');
    console.log('📋 Events: http://localhost:' + port + '/api/whatsapp/events');
    console.log('');
    console.log('💡 Este servidor simula como sua aplicação Boot');
    console.log('   deve receber e processar os webhooks do WhatsApp');
    console.log('==========================================\n');
    
    console.log('⏳ Aguardando webhooks do WhatsApp...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n📊 RESUMO FINAL:');
    console.log('Total de eventos recebidos:', eventsReceived.length);
    
    const eventsByType = {};
    eventsReceived.forEach(event => {
        eventsByType[event.dataType] = (eventsByType[event.dataType] || 0) + 1;
    });
    
    console.log('Eventos por tipo:', eventsByType);
    console.log('Webhook Boot Simulator encerrado.');
    process.exit(0);
});