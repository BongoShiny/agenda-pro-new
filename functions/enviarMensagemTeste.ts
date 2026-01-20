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

    const WHATSAPP_API_TOKEN = (Deno.env.get("WHATSAPP_API_TOKEN") || "").trim();
    const WHATSAPP_API_URL = (Deno.env.get("WHATSAPP_API_URL") || "").trim();
    const WHATSAPP_CLIENT_TOKEN = (Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "").trim();

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_API_URL || !WHATSAPP_CLIENT_TOKEN) {
      return Response.json({ 
        error: 'Credenciais Z-API não configuradas completamente',
        tokenOk: !!WHATSAPP_API_TOKEN,
        urlOk: !!WHATSAPP_API_URL,
        clientTokenOk: !!WHATSAPP_CLIENT_TOKEN
      }, { status: 500 });
    }

    // Formatar telefone - remover caracteres especiais e adicionar +55
    const telefoneLimpo = telefone.replace(/\D/g, '');
    const telefoneFormatado = '55' + telefoneLimpo;
    
    console.log('🔧 Iniciando envio...');
    console.log('  Telefone:', telefoneFormatado);
    
    // Z-API - enviar mensagem de texto
    const sendUrl = WHATSAPP_API_URL;

    const sendPayload = {
      phone: telefoneFormatado,
      message: mensagem,
      clientToken: WHATSAPP_CLIENT_TOKEN
    };

    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
      },
      body: JSON.stringify(sendPayload)
    });

    console.log('📨 Status:', sendResponse.status);
    
    // Ler resposta como texto primeiro para debug
    const responseText = await sendResponse.text();
    console.log('📨 Resposta (texto):', responseText);
    
    // Tentar parsear como JSON
    let resultado;
    try {
      resultado = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.log('⚠️ Resposta não é JSON válido');
      resultado = { rawResponse: responseText };
    }
    
    console.log('📨 Resposta (parseada):', JSON.stringify(resultado, null, 2));
    
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