import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { telefone, mensagem } = await req.json();

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
    
    // Tentar múltiplas abordagens para enviar a mensagem
    
    // Abordagem 1: Buscar chat existente
    try {
      const buscaChatUrl = `${WHATSAPP_API_URL}/api/v1/chats`;
      console.log('Buscando chats existentes...');
      
      const buscaResponse = await fetch(buscaChatUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WHATSAPP_API_TOKEN
        }
      });
      
      if (buscaResponse.ok) {
        const chats = await buscaResponse.json();
        console.log('Chats encontrados:', chats.length);
        
        // Procurar chat com este telefone
        const chatExistente = chats.find(chat => {
          const phoneChat = (chat.contact?.phoneNumber || chat.phoneNumber || '').replace(/\D/g, '');
          return phoneChat.includes(telefoneFormatado.replace(/^55/, '')) || 
                 telefoneFormatado.includes(phoneChat);
        });
        
        if (chatExistente) {
          console.log('Chat encontrado:', chatExistente.id);
          
          // Enviar mensagem para o chat existente
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
          
          if (response.ok) {
            return Response.json({ 
              sucesso: true, 
              mensagem: '✅ Mensagem enviada com sucesso!',
              resultado: resultado,
              metodo: 'chat_existente'
            });
          } else {
            console.log('Erro ao enviar para chat existente:', resultado);
          }
        }
      }
    } catch (e) {
      console.log('Erro na abordagem 1:', e);
    }
    
    // Abordagem 2: Send template
    try {
      console.log('Tentando send-template...');
      const url = `${WHATSAPP_API_URL}/api/v1/chat/send-template`;
      
      const payload = {
        origin: {
          contact: {
            channel: "whatsapp"
          }
        },
        target: {
          contact: {
            channel: "whatsapp",
            phoneNumber: telefoneFormatado
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
      
      if (response.ok && !resultado.error) {
        return Response.json({ 
          sucesso: true, 
          mensagem: '✅ Mensagem enviada com sucesso!',
          resultado: resultado,
          metodo: 'send_template'
        });
      } else {
        console.log('Erro no send-template:', resultado);
      }
    } catch (e) {
      console.log('Erro na abordagem 2:', e);
    }

    // Se chegou aqui, nenhuma abordagem funcionou
    return Response.json({ 
      error: '❌ Não foi possível enviar a mensagem',
      mensagem: 'Verifique se: 1) O número do WhatsApp está correto, 2) A API da Octadesk está configurada corretamente, 3) O cliente já iniciou uma conversa antes',
      telefone: telefoneFormatado,
      tentativas: ['chat_existente', 'send_template']
    }, { status: 400 });

  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});