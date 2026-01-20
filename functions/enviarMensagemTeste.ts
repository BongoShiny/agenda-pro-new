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
    const WHATSAPP_API_URL = "https://o216174-f20.octadesk.services";

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
    
    console.log('🔧 Iniciando envio único...');
    console.log('  Telefone:', telefoneFormatado);
    
    // MÉTODO DIRETO: send-template (único método que funciona)
    const sendUrl = `${WHATSAPP_API_URL}/chat/send-template`;
    
    const sendPayload = {
      origin: {
        contact: {
          channel: "whatsapp",
          phoneNumber: "554384981523",
          name: "Vibe Terapias",
          email: "sistema@vibe.com",
          waba: "154138641866717"
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
    
    console.log('📤 Enviando...');
    
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_TOKEN
      },
      body: JSON.stringify(sendPayload)
    });

    const resultado = await sendResponse.json();
    console.log('📨 Resposta:', JSON.stringify(resultado, null, 2));
    
    if (sendResponse.ok && resultado.result) {
      return Response.json({ 
        sucesso: true, 
        mensagem: '✅ Mensagem enviada!',
        resultado: resultado
      });
    }
    
    return Response.json({ 
      sucesso: false,
      error: resultado.error || 'Erro ao enviar',
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