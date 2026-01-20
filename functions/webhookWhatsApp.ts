import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  // SEMPRE retornar 200 OK para não bloquear webhooks
  try {
    const base44 = createClientFromRequest(req);
    
    // GET - verificação de status
    if (req.method === 'GET') {
      return Response.json({ 
        success: true,
        status: 'Webhook ativo',
        message: 'Configure este webhook na Octadesk'
      }, { status: 200 });
    }
    
    // Receber dados
    const body = await req.json().catch(() => ({}));
    console.log('📥 Webhook recebido:', JSON.stringify(body, null, 2));

    // Extrair dados - múltiplos formatos
    const mensagem = body.message?.body || body.body || body.text || body.mensagem || '';
    const telefone = body.contact?.phoneNumber || body.phoneNumber || body.from || body.phone || body.telefone || '';

    console.log('📱 Telefone:', telefone);
    console.log('💬 Mensagem:', mensagem);

    // Se não tem dados suficientes
    if (!mensagem || !telefone) {
      console.log('⚠️ Dados insuficientes');
      return Response.json({ 
        success: true,
        message: 'Processado - dados insuficientes',
        recebido: body
      }, { status: 200 });
    }

    // Limpar telefone - remover código do país 55 se existir
    let telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.startsWith('55')) {
      telefoneLimpo = telefoneLimpo.substring(2);
    }
    console.log('🔢 Telefone limpo:', telefoneLimpo);

    const mensagemLower = mensagem.toLowerCase();
    
    // CONFIRMAR
    if (mensagemLower.includes('confirmar')) {
      console.log('✅ Processando confirmação...');
      
      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        status: 'agendado'
      });

      const agendamentosCliente = agendamentos.filter(ag => {
        let telAg = (ag.cliente_telefone || '').replace(/\D/g, '');
        if (telAg.startsWith('55')) {
          telAg = telAg.substring(2);
        }
        console.log(`📞 Comparando: ${telAg} === ${telefoneLimpo}`);
        return telAg === telefoneLimpo;
      });

      if (agendamentosCliente.length === 0) {
        console.log('❌ Nenhum agendamento encontrado');
        return Response.json({ 
          success: true,
          message: 'Nenhum agendamento encontrado' 
        }, { status: 200 });
      }

      const proximo = agendamentosCliente.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      await base44.asServiceRole.entities.Agendamento.update(proximo.id, {
        status: 'confirmado'
      });

      await base44.asServiceRole.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: "sistema-whatsapp",
        descricao: `Confirmado via WhatsApp: ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: proximo.id,
        dados_antigos: JSON.stringify({ status: 'agendado' }),
        dados_novos: JSON.stringify({ status: 'confirmado' })
      });

      console.log('✅ Agendamento confirmado:', proximo.id);
      
      return Response.json({ 
        success: true, 
        message: 'Agendamento confirmado',
        agendamento_id: proximo.id
      }, { status: 200 });
    }
    
    // CANCELAR
    if (mensagemLower.includes('cancelar')) {
      console.log('❌ Processando cancelamento...');
      
      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        status: 'agendado'
      });

      const agendamentosCliente = agendamentos.filter(ag => {
        let telAg = (ag.cliente_telefone || '').replace(/\D/g, '');
        if (telAg.startsWith('55')) {
          telAg = telAg.substring(2);
        }
        console.log(`📞 Comparando: ${telAg} === ${telefoneLimpo}`);
        return telAg === telefoneLimpo;
      });

      if (agendamentosCliente.length === 0) {
        console.log('❌ Nenhum agendamento encontrado');
        return Response.json({ 
          success: true,
          message: 'Nenhum agendamento encontrado' 
        }, { status: 200 });
      }

      const proximo = agendamentosCliente.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      await base44.asServiceRole.entities.LogAcao.create({
        tipo: "excluiu_agendamento",
        usuario_email: "sistema-whatsapp",
        descricao: `Cancelado via WhatsApp: ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: proximo.id,
        dados_antigos: JSON.stringify(proximo)
      });

      await base44.asServiceRole.entities.Agendamento.delete(proximo.id);

      console.log('❌ Agendamento cancelado:', proximo.id);
      
      return Response.json({ 
        success: true, 
        message: 'Agendamento cancelado',
        agendamento_id: proximo.id
      }, { status: 200 });
    }

    console.log('⚠️ Comando não reconhecido');
    return Response.json({ 
      success: true,
      message: 'Comando não reconhecido' 
    }, { status: 200 });

  } catch (error) {
      console.error('🔴 Erro:', error);
      console.error('🔴 Stack:', error.stack);
      return Response.json({ 
        success: true,
        message: 'Erro processado',
        error: error.message,
        stack: error.stack
      }, { status: 200 });
    }
});