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

    // Formatar telefone para Octadesk (formato internacional)
    let telefoneFormatado = telefone.replace(/\D/g, '');
    if (!telefoneFormatado.startsWith('55')) {
      telefoneFormatado = '55' + telefoneFormatado;
    }
    
    // Usar API de send-template da Octadesk (permite enviar sem chat existente)
    const url = `${WHATSAPP_API_URL}/api/v1/chat/send-template`;
    
    console.log('Enviando template para:', telefoneFormatado);
    console.log('URL:', url);
    
    const payload = {
      origin: {
        contact: {
          channel: "whatsapp",
          name: "Sistema",
          email: "sistema@agendamento.com"
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
        templateId: null, // Usar mensagem customizada
        text: mensagem
      },
      options: {
        automaticAssign: true
      }
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const resultado = await response.json();
    
    console.log('Resposta:', JSON.stringify(resultado, null, 2));

    if (!response.ok) {
      console.error('Erro da API WhatsApp:', resultado);
      
      return Response.json({ 
        error: 'Erro ao enviar mensagem', 
        detalhes: resultado,
        status: response.status
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