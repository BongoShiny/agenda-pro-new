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

    const WHATSAPP_API_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
    const WHATSAPP_API_URL = "https://api.octadesk.services";

    if (!WHATSAPP_API_TOKEN) {
      return Response.json({ 
        error: 'Token da API não encontrado' 
      }, { status: 500 });
    }

    // Formatar telefone
    let telefoneFormatado = telefone.replace(/\D/g, '');
    if (!telefoneFormatado.startsWith('55')) {
      telefoneFormatado = '55' + telefoneFormatado;
    }
    
    console.log('🔧 Iniciando envio...');
    console.log('  Telefone:', telefoneFormatado);
    
    // API da Octadesk - enviar mensagem
    const sendUrl = `${WHATSAPP_API_URL}/api/v1/whatsapp/send`;
    
    const sendPayload = {
      number: telefoneFormatado,
      body: mensagem,
      waba: "154138641866717"
    };
    
    console.log('📤 URL:', sendUrl);
    console.log('📦 Payload:', JSON.stringify(sendPayload, null, 2));
    
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apitoken': WHATSAPP_API_TOKEN
      },
      body: JSON.stringify(sendPayload)
    });

    const resultado = await sendResponse.json();
    console.log('📨 Status:', sendResponse.status);
    console.log('📨 Resposta:', JSON.stringify(resultado, null, 2));
    
    if (sendResponse.ok) {
      return Response.json({ 
        sucesso: true, 
        mensagem: '✅ Mensagem enviada!',
        resultado: resultado
      });
    }
    
    return Response.json({ 
      sucesso: false,
      error: resultado.error || resultado.message || 'Erro ao enviar',
      status: sendResponse.status,
      resultado: resultado
    }, { status: 200 });

  } catch (error) {
    console.error("🔴 Erro ao enviar mensagem:", error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 200 });
  }
});