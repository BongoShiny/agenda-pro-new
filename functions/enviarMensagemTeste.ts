import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { telefone, mensagem } = body;
    
    console.log('📥 Dados recebidos:', body);

    if (!telefone || !mensagem) {
      return Response.json({ error: 'Telefone e mensagem são obrigatórios' }, { status: 400 });
    }

    const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL");
    const WHATSAPP_API_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
    const WHATSAPP_INSTANCE_NAME = Deno.env.get("WHATSAPP_INSTANCE_NAME");

    if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN || !WHATSAPP_INSTANCE_NAME) {
      return Response.json({ 
        error: 'Configurações do WhatsApp não encontradas. Configure as variáveis de ambiente: WHATSAPP_API_URL, WHATSAPP_API_TOKEN, WHATSAPP_INSTANCE_NAME' 
      }, { status: 500 });
    }

    // Formatar telefone
    let telefoneFormatado = telefone.replace(/\D/g, '');
    if (!telefoneFormatado.startsWith('55')) {
      telefoneFormatado = '55' + telefoneFormatado;
    }
    
    console.log('🔧 Configurações:');
    console.log('  Telefone formatado:', telefoneFormatado);
    console.log('  Mensagem:', mensagem);
    console.log('  API URL:', WHATSAPP_API_URL);
    console.log('  Instance:', WHATSAPP_INSTANCE_NAME);
    
    // PASSO 1: Buscar chats existentes
    console.log('🔍 Buscando chats existentes...');
    const buscaChatUrl = `${WHATSAPP_API_URL}/chats`;
    
    const buscaResponse = await fetch(buscaChatUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_TOKEN
      }
    });
    
    if (buscaResponse.ok) {
      const chats = await buscaResponse.json();
      console.log(`📋 Total de chats: ${chats.length}`);
      
      // Extrair apenas números do telefone
      const telLimpo = telefoneFormatado.replace(/\D/g, '');
      const telSem55 = telLimpo.replace(/^55/, '');
      console.log(`🔢 Procurando por: ${telLimpo} ou ${telSem55}`);
      
      // Log todos os telefones para debug
      chats.forEach((chat, i) => {
        const phone = (chat.contact?.phoneNumber || chat.phoneNumber || '').replace(/\D/g, '');
        console.log(`Chat ${i}: ${phone}`);
      });
      
      // Procurar chat - comparação mais flexível
      const chatExistente = chats.find(chat => {
        const phoneChat = (chat.contact?.phoneNumber || chat.phoneNumber || '').replace(/\D/g, '');
        
        // Comparar de várias formas
        const match = 
          phoneChat === telLimpo || 
          phoneChat === telSem55 || 
          phoneChat.endsWith(telSem55) || 
          telSem55.endsWith(phoneChat) ||
          (phoneChat.length >= 10 && telSem55.includes(phoneChat.slice(-10))) ||
          (telSem55.length >= 10 && phoneChat.includes(telSem55.slice(-10)));
        
        if (match) {
          console.log(`✅ MATCH! Chat ID: ${chat.id}, Phone: ${phoneChat}`);
        }
        return match;
      });
      
      if (chatExistente) {
        // ENVIAR PARA CHAT EXISTENTE
        console.log(`📤 Enviando mensagem para chat ${chatExistente.id}...`);
        const url = `${WHATSAPP_API_URL}/chat/${chatExistente.id}/messages`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': WHATSAPP_API_TOKEN
          },
          body: JSON.stringify({
            type: 'public',
            body: mensagem,
            channel: 'whatsapp'
          })
        });
        
        const resultado = await response.json();
        console.log('📨 Resposta:', JSON.stringify(resultado, null, 2));
        
        if (response.ok) {
          return Response.json({ 
            sucesso: true, 
            mensagem: '✅ Mensagem enviada com sucesso!',
            resultado: resultado,
            metodo: 'chat_existente',
            chat_id: chatExistente.id
          });
        } else {
          return Response.json({ 
            sucesso: false,
            error: 'Erro ao enviar para chat existente',
            resultado: resultado
          }, { status: 200 });
        }
      } else {
        console.log('❌ Chat não encontrado nos chats existentes');
      }
    } else {
      console.log('❌ Erro ao buscar chats:', buscaResponse.status);
    }
    
    // PASSO 2: Tentar via send-template (inicia novo chat se necessário)
    console.log('📤 Tentando send-template...');
    const sendUrl = `${WHATSAPP_API_URL}/chat/send-template`;
    
    const sendPayload = {
      origin: {
        contact: {
          channel: "whatsapp",
          phoneNumber: "554384981523",
          name: "Sistema Vibe",
          email: "sistema@vibe.com"
        }
      },
      target: {
        contact: {
          channel: "whatsapp",
          phoneNumber: telefoneFormatado,
          name: "Cliente",
          email: `${telefoneFormatado}@temp.com`
        }
      },
      content: {
        text: mensagem
      },
      options: {
        automaticAssign: true
      }
    };
    
    console.log('📦 Payload send-template:', JSON.stringify(sendPayload, null, 2));
    
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_TOKEN
      },
      body: JSON.stringify(sendPayload)
    });

    const resultado = await sendResponse.json();
    console.log('📨 Resposta send-template:', JSON.stringify(resultado, null, 2));
    
    if (sendResponse.ok && resultado.result) {
      return Response.json({ 
        sucesso: true, 
        mensagem: '✅ Mensagem enviada com sucesso!',
        resultado: resultado,
        metodo: 'send_template'
      });
    }
    
    // Se falhou, retornar erro detalhado
    return Response.json({ 
      sucesso: false,
      error: 'Nenhum método funcionou',
      detalhes: resultado.error || 'Não foi possível enviar a mensagem',
      resultado: resultado,
      telefone: telefoneFormatado,
      sugestao: 'Verifique se a instância do WhatsApp está conectada na Octadesk'
    }, { status: 200 });

  } catch (error) {
    console.error("🔴 Erro ao enviar mensagem:", error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 200 });
  }
});