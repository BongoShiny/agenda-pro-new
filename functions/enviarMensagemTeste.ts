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
        error: 'Configurações do WhatsApp não encontradas. Configure as variáveis de ambiente.' 
      }, { status: 500 });
    }

    // Enviar mensagem via API do WhatsApp
    const url = `${WHATSAPP_API_URL}/message/sendText/${WHATSAPP_INSTANCE_NAME}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_TOKEN
      },
      body: JSON.stringify({
        number: telefone,
        text: mensagem
      })
    });

    const resultado = await response.json();

    if (!response.ok) {
      return Response.json({ 
        error: 'Erro ao enviar mensagem', 
        detalhes: resultado 
      }, { status: response.status });
    }

    return Response.json({ 
      sucesso: true, 
      mensagem: 'Mensagem enviada com sucesso!',
      resultado: resultado
    });

  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});