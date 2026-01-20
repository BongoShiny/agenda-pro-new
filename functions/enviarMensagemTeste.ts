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

    // Octadesk API - primeiro precisamos criar ou buscar um chat
    // Passo 1: Buscar se existe um chat com este contato
    const buscaChatUrl = `${WHATSAPP_API_URL}/api/v1/chats`;
    
    console.log('Buscando chat existente...');
    
    let chatId = null;
    
    try {
      const buscaResponse = await fetch(buscaChatUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WHATSAPP_API_TOKEN
        }
      });
      
      if (buscaResponse.ok) {
        const chats = await buscaResponse.json();
        // Procurar chat com este telefone
        const chatExistente = chats.find(chat => 
          chat.phoneNumber && chat.phoneNumber.replace(/\D/g, '').includes(telefone.replace(/\D/g, ''))
        );
        
        if (chatExistente) {
          chatId = chatExistente.id;
          console.log('Chat existente encontrado:', chatId);
        }
      }
    } catch (e) {
      console.log('Erro ao buscar chats:', e);
    }
    
    // Se não encontrou chat existente, retorna erro orientando o usuário
    if (!chatId) {
      return Response.json({ 
        error: 'Chat não encontrado',
        mensagem: 'Para enviar mensagem via Octadesk, é necessário que o cliente tenha iniciado uma conversa antes. O cliente precisa enviar uma mensagem primeiro.',
        telefone: telefone
      }, { status: 400 });
    }
    
    // Passo 2: Enviar mensagem para o chat existente
    const url = `${WHATSAPP_API_URL}/api/v1/chat/${chatId}/messages`;
    
    console.log('Enviando para URL:', url);
    console.log('Dados:', { type: 'public', body: mensagem, channel: 'whatsapp' });
    
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

    if (!response.ok) {
      console.error('Erro da API WhatsApp:', resultado);
      
      return Response.json({ 
        error: 'Erro ao enviar mensagem', 
        detalhes: resultado 
      }, { status: response.status });
    }

    return Response.json({ 
      sucesso: true, 
      mensagem: 'Mensagem enviada com sucesso!',
      resultado: resultado,
      chatId: chatId
    });

  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});