/**
 * SCRIPT DE TESTE - FETCHMESSAGES AVANÇADO
 * 
 * Este script testa o endpoint aprimorado de fetchMessages
 * com suporte a reações, menções, respostas e mídia
 */

const fetch = require('node-fetch')

const API_BASE = 'http://localhost:200'
const API_KEY = 'redblack'
const SESSION_ID = 'redblack'

async function testEnhancedFetchMessages() {
  console.log('🧪 TESTANDO FETCHMESSAGES AVANÇADO\n')
  
  try {
    // Teste 1: Fetch básico (sem melhorias)
    console.log('📝 Teste 1: Fetch básico')
    const basicResponse = await fetch(`${API_BASE}/chat/fetchMessages/${SESSION_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        chatId: '555197756708@c.us', // Substitua pelo ID do chat real
        searchOptions: { limit: 5 }
      })
    })
    
    const basicData = await basicResponse.json()
    console.log(`✅ Status: ${basicResponse.status}`)
    console.log(`📊 Mensagens encontradas: ${basicData.messages?.length || 0}`)
    console.log()
    
    // Teste 2: Fetch com todas as melhorias
    console.log('🔥 Teste 2: Fetch com todas as melhorias')
    const enhancedResponse = await fetch(`${API_BASE}/chat/fetchMessages/${SESSION_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        chatId: '555197756708@c.us', // Substitua pelo ID do chat real
        searchOptions: { limit: 5 },
        includeReactions: true,
        includeMentions: true,
        includeQuoted: true,
        includeMedia: true,
        includeContacts: true
      })
    })
    
    const enhancedData = await enhancedResponse.json()
    console.log(`✅ Status: ${enhancedResponse.status}`)
    console.log(`📊 Mensagens encontradas: ${enhancedData.messages?.length || 0}`)
    
    if (enhancedData.success && enhancedData.messages?.length > 0) {
      const firstMessage = enhancedData.messages[0]
      console.log(`🎯 Primeira mensagem:`)
      console.log(`   - ID: ${firstMessage.id?._serialized}`)
      console.log(`   - Tipo: ${firstMessage.type}`)
      console.log(`   - Texto: ${firstMessage.body?.substring(0, 50)}...`)
      console.log(`   - Tem reações: ${firstMessage._enhanced?.reactions?.length > 0}`)
      console.log(`   - Tem menções: ${firstMessage._enhanced?.mentions?.length > 0}`)
      console.log(`   - Tem resposta: ${firstMessage._enhanced?.quotedMessage !== null}`)
      console.log(`   - Tem mídia: ${firstMessage.hasMedia}`)
      
      if (firstMessage._enhanced?.reactions?.length > 0) {
        console.log(`   🎭 Reações: ${firstMessage._enhanced.reactions.length}`)
      }
      
      if (firstMessage._enhanced?.mentions?.length > 0) {
        console.log(`   👥 Menções: ${firstMessage._enhanced.mentions.length}`)
      }
      
      if (firstMessage._enhanced?.quotedMessage) {
        console.log(`   💬 Resposta: ${firstMessage._enhanced.quotedMessage.body?.substring(0, 30)}...`)
      }
    }
    
    console.log(`\n📈 Informações de processamento:`)
    console.log(`   - Processado em: ${enhancedData.enhanced?.processedAt}`)
    console.log(`   - Total processado: ${enhancedData.enhanced?.totalMessages}`)
    console.log()
    
    // Teste 3: View Once Media
    console.log('👁️ Teste 3: View Once Media')
    const viewOnceResponse = await fetch(`${API_BASE}/viewonce/getMedia/${SESSION_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        chatId: '555197756708@c.us', // Substitua pelo ID do chat real
        limit: 10,
        includeExpired: true
      })
    })
    
    const viewOnceData = await viewOnceResponse.json()
    console.log(`✅ Status: ${viewOnceResponse.status}`)
    
    if (viewOnceData.success) {
      console.log(`📊 View Once encontradas: ${viewOnceData.data?.messages?.length || 0}`)
      console.log(`🔍 Total encontrado: ${viewOnceData.data?.totalFound || 0}`)
    } else {
      console.log(`❌ Erro: ${viewOnceData.error}`)
    }
    console.log()
    
    // Teste 4: View Once Stats
    console.log('📊 Teste 4: View Once Stats')
    const statsResponse = await fetch(`${API_BASE}/viewonce/getStats/${SESSION_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        chatId: '555197756708@c.us', // Substitua pelo ID do chat real
        days: 30
      })
    })
    
    const statsData = await statsResponse.json()
    console.log(`✅ Status: ${statsResponse.status}`)
    
    if (statsData.success) {
      const stats = statsData.data?.stats
      console.log(`📈 Estatísticas (últimos 30 dias):`)
      console.log(`   - Total mensagens: ${stats?.totalMessages || 0}`)
      console.log(`   - View Once: ${stats?.viewOnceMessages || 0}`)
      console.log(`   - Imagens: ${stats?.images || 0}`)
      console.log(`   - Vídeos: ${stats?.videos || 0}`)
      console.log(`   - Visualizadas: ${stats?.viewed || 0}`)
      console.log(`   - Não visualizadas: ${stats?.unviewed || 0}`)
    } else {
      console.log(`❌ Erro: ${statsData.error}`)
    }
    console.log()
    
    // Teste 5: Chats com View Once
    console.log('💬 Teste 5: Chats com View Once')
    const chatsResponse = await fetch(`${API_BASE}/viewonce/getChats/${SESSION_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        limit: 20
      })
    })
    
    const chatsData = await chatsResponse.json()
    console.log(`✅ Status: ${chatsResponse.status}`)
    
    if (chatsData.success) {
      console.log(`💬 Chats verificados: ${chatsData.data?.totalChatsChecked || 0}`)
      console.log(`👁️ Chats com View Once: ${chatsData.data?.chatsWithViewOnce || 0}`)
      
      if (chatsData.data?.chats?.length > 0) {
        console.log(`🏆 Top 3 chats:`)
        chatsData.data.chats.slice(0, 3).forEach((chat, index) => {
          console.log(`   ${index + 1}. ${chat.name} (${chat.viewOnceCount} view once)`)
        })
      }
    } else {
      console.log(`❌ Erro: ${chatsData.error}`)
    }
    
    console.log('\n🎉 TESTES CONCLUÍDOS!')
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error)
  }
}

// Função para testar com diferentes chats
async function testWithDifferentChats() {
  console.log('\n🔄 TESTANDO COM DIFERENTES CHATS\n')
  
  try {
    // Primeiro buscar lista de chats
    const chatsResponse = await fetch(`${API_BASE}/client/getChats/${SESSION_ID}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    })
    
    const chatsData = await chatsResponse.json()
    
    if (chatsData.success && chatsData.chats?.length > 0) {
      console.log(`📱 Encontrados ${chatsData.chats.length} chats`)
      
      // Testar com os primeiros 3 chats
      for (let i = 0; i < Math.min(3, chatsData.chats.length); i++) {
        const chat = chatsData.chats[i]
        console.log(`\n💬 Testando chat: ${chat.name || 'Sem nome'} (${chat.id._serialized})`)
        
        try {
          const testResponse = await fetch(`${API_BASE}/chat/fetchMessages/${SESSION_ID}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': API_KEY
            },
            body: JSON.stringify({
              chatId: chat.id._serialized,
              searchOptions: { limit: 3 },
              includeReactions: true,
              includeMentions: true,
              includeQuoted: true
            })
          })
          
          const testData = await testResponse.json()
          
          if (testData.success) {
            console.log(`   ✅ ${testData.messages?.length || 0} mensagens processadas`)
            
            if (testData.messages?.length > 0) {
              const withReactions = testData.messages.filter(m => m._enhanced?.reactions?.length > 0).length
              const withMentions = testData.messages.filter(m => m._enhanced?.mentions?.length > 0).length
              const withQuoted = testData.messages.filter(m => m._enhanced?.quotedMessage).length
              
              console.log(`   🎭 ${withReactions} com reações`)
              console.log(`   👥 ${withMentions} com menções`)
              console.log(`   💬 ${withQuoted} com respostas`)
            }
          } else {
            console.log(`   ❌ Erro: ${testData.error}`)
          }
          
        } catch (error) {
          console.log(`   ❌ Erro ao testar chat: ${error.message}`)
        }
      }
    } else {
      console.log('❌ Não foi possível obter lista de chats')
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar chats:', error)
  }
}

// Executar testes
if (require.main === module) {
  console.log('🚀 INICIANDO TESTES DO WHATSAPP BACKEND AVANÇADO')
  console.log('=' * 50)
  
  testEnhancedFetchMessages()
    .then(() => testWithDifferentChats())
    .then(() => {
      console.log('\n✅ TODOS OS TESTES EXECUTADOS!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ FALHA NOS TESTES:', error)
      process.exit(1)
    })
}

module.exports = { testEnhancedFetchMessages, testWithDifferentChats }