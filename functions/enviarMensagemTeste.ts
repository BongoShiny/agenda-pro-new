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
    
    console.log('Telefone formatado:', telefoneFormatado);
    console.log('Mensagem:', mensagem);
    console.log('API URL:', WHATSAPP_API_URL);
    
    // PASSO 1: Buscar chats existentes
    console.log('🔍 Buscando chats existentes...');
    const buscaChatUrl = `${WHATSAPP_API_URL}/api/v1/chats`;
    
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
      
      // Limpar telefone para comparação
      const telLimpo = telefoneFormatado.replace(/^55/, '');
      console.log(`🔢 Procurando por: ${telLimpo} ou ${telefoneFormatado}`);
      
      // Procurar chat com este telefone
      const chatExistente = chats.find(chat => {
        const phoneChat = (chat.contact?.phoneNumber || chat.phoneNumber || '').replace(/\D/g, '');
        const match = phoneChat === telLimpo || phoneChat === telefoneFormatado || 
                     phoneChat.endsWith(telLimpo) || telLimpo.endsWith(phoneChat);
        
        if (match) {
          console.log(`✅ Chat encontrado! ID: ${chat.id}, Phone: ${phoneChat}`);
        }
        return match;
      });
      
      if (chatExistente) {
        // ENVIAR PARA CHAT EXISTENTE
        console.log(`📤 Enviando mensagem para chat ${chatExistente.id}...`);
        const url = `${WHATSAPP_API_URL}/api/v1/chat/${chatExistente.id}/messages`;
        
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
        console.log('❌ Chat não encontrado');
      }
    }
    
    // PASSO 2: Se não encontrou chat, tentar send-template
    console.log('📤 Tentando send-template...');
    const url = `${WHATSAPP_API_URL}/api/v1/chat/send-template`;
    
    const payload = {
      origin: {
        contact: {
          channel: "whatsapp",
          name: "Sistema",
          email: "sistema@agenda.com"
        }
      },
      target: {
        contact: {
          channel: "whatsapp",
          phoneNumber: telefoneFormatado,
          name: "Cliente",
          email: "cliente@temp.com"
        }
      },
      content: {
        text: mensagem
      },
      options: {
        automaticAssign: true
      }
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const resultado = await response.json();
    console.log('📨 Resposta send-template:', JSON.stringify(resultado, null, 2));
    
    if (response.ok && resultado.result) {
      return Response.json({ 
        sucesso: true, 
        mensagem: '✅ Mensagem enviada com sucesso!',
        resultado: resultado,
        metodo: 'send_template'
      });
    }
    
    // Se deu erro
    return Response.json({ 
      sucesso: false,
      error: 'Erro ao enviar mensagem',
      detalhes: resultado.error || 'Não foi possível enviar',
      resultado: resultado,
      telefone: telefoneFormatado
    }, { status: 200 });

  } catch (error) {
    console.error("🔴 Erro ao enviar mensagem:", error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 200 });
  }
});