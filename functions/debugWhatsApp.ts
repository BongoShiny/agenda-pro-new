import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const WHATSAPP_API_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
    const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL");
    const WHATSAPP_INSTANCE_NAME = Deno.env.get("WHATSAPP_INSTANCE_NAME");

    console.log('🔍 DEBUG WHATSAPP');
    console.log('URL:', WHATSAPP_API_URL);
    console.log('Token existe?', !!WHATSAPP_API_TOKEN);
    console.log('Instance:', WHATSAPP_INSTANCE_NAME);

    // Testar envio básico
    const testPhone = '5543988334747';
    const testMessage = 'Teste de conexão WhatsApp';

    console.log('\n📤 Testando envio...');
    console.log('Phone:', testPhone);
    console.log('Message:', testMessage);

    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
      },
      body: JSON.stringify({
        phone: testPhone,
        message: testMessage
      })
    });

    console.log('Status:', response.status);
    
    const responseText = await response.text();
    console.log('Response:', responseText);

    let resultado;
    try {
      resultado = JSON.parse(responseText);
    } catch {
      resultado = { raw: responseText };
    }

    return Response.json({
      config: {
        url: WHATSAPP_API_URL,
        tokenExists: !!WHATSAPP_API_TOKEN,
        instance: WHATSAPP_INSTANCE_NAME
      },
      test: {
        status: response.status,
        result: resultado
      }
    });

  } catch (error) {
    console.error("🔴 Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});