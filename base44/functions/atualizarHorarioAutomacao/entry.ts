import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const horario = body.horario || "18:00";

    console.log('🕐 Atualizando horário da automação para:', horario);

    // Buscar todas as automações do tipo scheduled
    const response = await fetch(`https://api.base44.com/api/v1/apps/${Deno.env.get('BASE44_APP_ID')}/automations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('BASE44_API_KEY')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar automações');
    }

    const automations = await response.json();
    
    // Encontrar automação de WhatsApp
    const whatsappAutomation = automations.find(a => 
      a.function_name === 'enviarLembreteWhatsApp' && 
      a.automation_type === 'scheduled' &&
      !a.is_archived
    );

    if (!whatsappAutomation) {
      console.log('⚠️ Automação de WhatsApp não encontrada');
      return Response.json({ 
        success: false, 
        message: 'Automação não encontrada' 
      });
    }

    console.log('✅ Automação encontrada:', whatsappAutomation.id);

    // Atualizar horário da automação
    const updateResponse = await fetch(`https://api.base44.com/api/v1/apps/${Deno.env.get('BASE44_APP_ID')}/automations/${whatsappAutomation.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('BASE44_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start_time: horario
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error('Erro ao atualizar automação: ' + error);
    }

    console.log('✅ Horário da automação atualizado com sucesso!');

    return Response.json({ 
      success: true,
      message: 'Horário atualizado',
      horario: horario
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});