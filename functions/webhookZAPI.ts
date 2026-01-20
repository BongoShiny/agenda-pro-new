import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // GET - verificação de status
    if (req.method === 'GET') {
      return Response.json({ 
        success: true,
        status: 'Webhook ativo',
        message: 'Configure este webhook na Z-API'
      }, { status: 200 });
    }

    // Receber dados do webhook da Z-API
    const body = await req.json().catch(() => ({}));
    console.log('📥 Webhook Z-API recebido:', JSON.stringify(body, null, 2));

    // Criar cliente base44 APÓS receber os dados
    const base44 = createClientFromRequest(req);

    // Extrair dados da Z-API - formato de mensagem recebida
    const mensagem = body.text || body.message || body.body || '';
    const telefone = body.phone || body.wuid || body.phoneNumber || '';

    console.log('📱 Telefone:', telefone);
    console.log('💬 Mensagem:', mensagem);

    // Se não tem dados suficientes
    if (!mensagem || !telefone) {
      console.log('⚠️ Dados insuficientes');
      return Response.json({ 
        success: true,
        message: 'Processado - dados insuficientes'
      }, { status: 200 });
    }

    // Limpar telefone - remover código do país 55 se existir
    let telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.startsWith('55')) {
      telefoneLimpo = telefoneLimpo.substring(2);
    }
    console.log('🔢 Telefone limpo:', telefoneLimpo);

    const mensagemLower = mensagem.toLowerCase().trim();
    
    // CONFIRMAR
    if (mensagemLower.includes('confirmar') || mensagemLower === 'confirmar') {
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
        descricao: `Confirmado via WhatsApp (Z-API): ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
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
    if (mensagemLower.includes('cancelar') || mensagemLower === 'cancelar') {
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
        descricao: `Cancelado via WhatsApp (Z-API): ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
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