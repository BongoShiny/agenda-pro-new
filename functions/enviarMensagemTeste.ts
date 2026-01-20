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

    // Formatar telefone para Octadesk (com código do país)
    let telefoneFormatado = telefone.replace(/\D/g, '');
    if (!telefoneFormatado.startsWith('55')) {
      telefoneFormatado = '55' + telefoneFormatado;
    }
    
    // Octadesk: buscar contato existente
    const buscaContatoUrl = `${WHATSAPP_API_URL}/api/v1/contacts?phoneNumber=${telefoneFormatado}`;
    
    console.log('Buscando contato:', buscaContatoUrl);
    
    let contatoId = null;
    
    try {
      const buscaResponse = await fetch(buscaContatoUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WHATSAPP_API_TOKEN
        }
      });
      
      if (buscaResponse.ok) {
        const contatos = await buscaResponse.json();
        if (contatos && contatos.length > 0) {
          contatoId = contatos[0].id;
          console.log('Contato encontrado:', contatoId);
        }
      }
    } catch (e) {
      console.log('Erro ao buscar contato:', e);
    }
    
    // Se não encontrou contato, criar um novo
    if (!contatoId) {
      try {
        const criarContatoUrl = `${WHATSAPP_API_URL}/api/v1/contacts`;
        const criarResponse = await fetch(criarContatoUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': WHATSAPP_API_TOKEN
          },
          body: JSON.stringify({
            name: 'Cliente',
            phoneNumber: telefoneFormatado
          })
        });
        
        if (criarResponse.ok) {
          const novoContato = await criarResponse.json();
          contatoId = novoContato.id;
          console.log('Novo contato criado:', contatoId);
        }
      } catch (e) {
        console.log('Erro ao criar contato:', e);
      }
    }
    
    if (!contatoId) {
      return Response.json({ 
        error: 'Não foi possível criar/encontrar contato',
        telefone: telefoneFormatado
      }, { status: 400 });
    }
    
    // Buscar ou criar chat
    const buscaChatUrl = `${WHATSAPP_API_URL}/api/v1/chats?contactId=${contatoId}`;
    
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
        if (chats && chats.length > 0) {
          chatId = chats[0].id;
          console.log('Chat encontrado:', chatId);
        }
      }
    } catch (e) {
      console.log('Erro ao buscar chat:', e);
    }
    
    // Se não encontrou chat, criar um novo
    if (!chatId) {
      try {
        const criarChatUrl = `${WHATSAPP_API_URL}/api/v1/chats`;
        const criarResponse = await fetch(criarChatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': WHATSAPP_API_TOKEN
          },
          body: JSON.stringify({
            contactId: contatoId,
            channel: 'whatsapp'
          })
        });
        
        if (criarResponse.ok) {
          const novoChat = await criarResponse.json();
          chatId = novoChat.id;
          console.log('Novo chat criado:', chatId);
        }
      } catch (e) {
        console.log('Erro ao criar chat:', e);
      }
    }
    
    if (!chatId) {
      return Response.json({ 
        error: 'Não foi possível criar/encontrar chat',
        contatoId: contatoId
      }, { status: 400 });
    }
    
    // Enviar mensagem
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
      chatId: chatId,
      contatoId: contatoId
    });

  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});