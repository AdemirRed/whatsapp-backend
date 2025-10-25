#!/usr/bin/env node

/**
 * SCRIPT DE TESTE DE CONEXÃO WEBHOOK
 * 
 * Testa se o webhook está enviando corretamente
 * para o servidor Boot simulator
 */

const axios = require('axios');

async function testWebhookConnection() {
    console.log('🔍 ======= TESTE DE CONEXÃO WEBHOOK =======');
    
    // 1. Verificar se o servidor Boot está rodando
    try {
        console.log('🌐 Testando servidor Boot em localhost:4001...');
        const response = await axios.get('http://localhost:4001');
        console.log('✅ Servidor Boot está rodando!');
    } catch (error) {
        console.log('❌ Servidor Boot não está rodando em localhost:4001');
        console.log('💡 Execute: node webhook-boot-simulator.js');
        return;
    }
    
    // 2. Testar envio de webhook simulado
    console.log('\n📤 Enviando webhook de teste...');
    
    const testWebhookData = {
        dataType: 'vote_update',
        sessionId: 'teste',
        data: {
            vote: {
                voter: '5551234567890@c.us',
                selectedOptions: [
                    { name: 'Opção A', localId: 0 }
                ],
                interractedAtTs: Date.now(),
                parentMessage: {
                    pollName: 'Teste de Enquete',
                    pollOptions: [
                        { name: 'Opção A' },
                        { name: 'Opção B' }
                    ],
                    allowMultipleAnswers: false,
                    from: '5551234567890@c.us',
                    to: '5551234567891@c.us',
                    timestamp: Math.floor(Date.now() / 1000)
                },
                parentMsgKey: {
                    fromMe: false,
                    remote: '5551234567890@c.us',
                    id: 'TEST123456789',
                    _serialized: 'false_5551234567890@c.us_TEST123456789'
                }
            }
        }
    };
    
    try {
        const response = await axios.post('http://localhost:4001/api/whatsapp/webhook', testWebhookData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook enviado com sucesso!');
        console.log('📊 Resposta:', response.data);
        
        // 3. Verificar estatísticas
        console.log('\n📈 Verificando estatísticas...');
        const statsResponse = await axios.get('http://localhost:4001/api/whatsapp/stats');
        console.log('📊 Stats:', statsResponse.data);
        
    } catch (error) {
        console.log('❌ Erro ao enviar webhook:', error.message);
        if (error.response) {
            console.log('📄 Resposta do servidor:', error.response.data);
        }
    }
    
    console.log('\n🔗 Para monitorar em tempo real:');
    console.log('   http://localhost:4001 (interface web)');
    console.log('   http://localhost:4001/api/whatsapp/stats (estatísticas)');
    console.log('==========================================');
}

// Função para verificar se o servidor WhatsApp está rodando
async function checkWhatsappServer() {
    try {
        console.log('\n🔍 Verificando servidor WhatsApp em localhost:201...');
        const response = await axios.get('http://localhost:201');
        console.log('✅ Servidor WhatsApp está rodando!');
        return true;
    } catch (error) {
        console.log('❌ Servidor WhatsApp não está rodando em localhost:201');
        console.log('💡 Execute: npm start');
        return false;
    }
}

async function main() {
    await testWebhookConnection();
    await checkWhatsappServer();
    
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. ✅ Execute webhook-boot-simulator.js em um terminal');
    console.log('2. ✅ Execute npm start em outro terminal');
    console.log('3. 📱 Crie uma enquete no WhatsApp');
    console.log('4. 🗳️  Vote na enquete');
    console.log('5. 👀 Veja os webhooks chegando no simulator');
    console.log('6. 🚀 Implemente no seu Boot usando o exemplo');
}

if (require.main === module) {
    main();
}

module.exports = { testWebhookConnection, checkWhatsappServer };