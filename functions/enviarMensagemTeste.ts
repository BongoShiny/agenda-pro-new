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
    const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL") || "https://o216174-f20.api002.octadesk.services";

    console.log('🔑 Token existe?', !!WHATSAPP_API_TOKEN);
    console.log('🌐 URL:', WHATSAPP_API_URL);

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
    
    // API da Octadesk - enviar mensagem via template
    const sendUrl = `${WHATSAPP_API_URL}/chat/send-template`;
    
    const sendPayload = {
      origin: {
        contact: {
          name: "Vibe Terapias",
          channel: "whatsapp"
        }
      },
      target: {
        contact: {
          name: "Cliente",
          phoneNumber: telefoneFormatado,
          channel: "whatsapp"
        }
      },
      content: {
        templateId: "text_message",
        parameters: {
          body: mensagem
        }
      },
      options: {
        automaticAssign: true
      }
    };
    
    console.log('📤 URL:', sendUrl);
    console.log('📦 Payload:', JSON.stringify(sendPayload, null, 2));
    
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_TOKEN
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