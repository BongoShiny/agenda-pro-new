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
    
    // ENVIAR MENSAGEM - Usar send-template da Octadesk
    console.log('📤 Enviando mensagem via send-template...');
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
    
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const resultado = await response.json();
    console.log('📨 Resposta API:', JSON.stringify(resultado, null, 2));
    
    if (response.ok && resultado.result) {
      return Response.json({ 
        sucesso: true, 
        mensagem: '✅ Mensagem enviada com sucesso!',
        resultado: resultado
      });
    }
    
    // Se deu erro, retornar detalhes
    console.log('❌ Erro ao enviar:', resultado);
    return Response.json({ 
      sucesso: false,
      error: 'Erro ao enviar mensagem',
      detalhes: resultado.error || 'Verifique as credenciais da API',
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