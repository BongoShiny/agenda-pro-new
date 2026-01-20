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

    // Enviar mensagem via API do WhatsApp (Octadesk v2)
    const url = `${WHATSAPP_API_URL}/api/v2/whatsapp/sendMessage`;
    
    console.log('Enviando para URL:', url);
    console.log('Dados:', { phone: telefone, message: mensagem });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
      },
      body: JSON.stringify({
        phone: telefone,
        message: mensagem
      })
    });

    const resultado = await response.json();

    if (!response.ok) {
      console.error('Erro da API WhatsApp:', resultado);
      
      let mensagemErro = 'Erro ao enviar mensagem';
      if (resultado.message && resultado.message.includes('sendText')) {
        mensagemErro = `Erro: Verifique se a instância "${WHATSAPP_INSTANCE_NAME}" está correta. URL: ${url}`;
      }
      
      return Response.json({ 
        error: mensagemErro, 
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