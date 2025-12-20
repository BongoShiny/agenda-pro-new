import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Receber dados do webhook
    const body = await req.json();
    
    console.log('Webhook recebido:', JSON.stringify(body, null, 2));

    // Extrair informações da mensagem (formato pode variar por API)
    const mensagem = body.message?.text?.body || body.data?.body || body.body || '';
    const telefone = body.from || body.data?.from || body.key?.remoteJid || '';

    if (!mensagem || !telefone) {
      return Response.json({ message: 'Dados insuficientes' }, { status: 400 });
    }

    // Limpar telefone
    const telefoneLimpo = telefone.replace(/\D/g, '').replace('55', '');

    // Verificar se é comando de confirmação ou cancelamento (aceita a palavra em qualquer lugar)
    const mensagemLower = mensagem.toLowerCase();
    
    if (mensagemLower.includes('confirmar')) {
      // Buscar agendamentos pendentes do cliente
      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        status: 'agendado'
      });

      // Encontrar agendamentos deste telefone
      const agendamentosCliente = agendamentos.filter(ag => {
        const telAgLimpo = (ag.cliente_telefone || '').replace(/\D/g, '').replace('55', '');
        return telAgLimpo === telefoneLimpo;
      });

      if (agendamentosCliente.length === 0) {
        return Response.json({ message: 'Nenhum agendamento pendente encontrado' });
      }

      // Confirmar o próximo agendamento
      const proximoAgendamento = agendamentosCliente.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      await base44.asServiceRole.entities.Agendamento.update(proximoAgendamento.id, {
        status: 'confirmado'
      });

      // Registrar no log
      await base44.asServiceRole.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: "sistema-whatsapp",
        descricao: `Agendamento confirmado via WhatsApp: ${proximoAgendamento.cliente_nome} - ${proximoAgendamento.data} ${proximoAgendamento.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: proximoAgendamento.id,
        dados_antigos: JSON.stringify({ status: 'agendado' }),
        dados_novos: JSON.stringify({ status: 'confirmado' })
      });

      return Response.json({ 
        success: true, 
        message: 'Agendamento confirmado',
        agendamento_id: proximoAgendamento.id
      });

    } else if (mensagemLower.includes('cancelar')) {
      // Buscar agendamentos pendentes do cliente
      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        status: 'agendado'
      });

      // Encontrar agendamentos deste telefone
      const agendamentosCliente = agendamentos.filter(ag => {
        const telAgLimpo = (ag.cliente_telefone || '').replace(/\D/g, '').replace('55', '');
        return telAgLimpo === telefoneLimpo;
      });

      if (agendamentosCliente.length === 0) {
        return Response.json({ message: 'Nenhum agendamento pendente encontrado' });
      }

      // Cancelar o próximo agendamento
      const proximoAgendamento = agendamentosCliente.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      // Registrar no log antes de deletar
      await base44.asServiceRole.entities.LogAcao.create({
        tipo: "excluiu_agendamento",
        usuario_email: "sistema-whatsapp",
        descricao: `Agendamento cancelado via WhatsApp: ${proximoAgendamento.cliente_nome} - ${proximoAgendamento.data} ${proximoAgendamento.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: proximoAgendamento.id,
        dados_antigos: JSON.stringify(proximoAgendamento)
      });

      // Deletar o agendamento
      await base44.asServiceRole.entities.Agendamento.delete(proximoAgendamento.id);

      return Response.json({ 
        success: true, 
        message: 'Agendamento cancelado',
        agendamento_id: proximoAgendamento.id
      });
    }

    return Response.json({ message: 'Comando não reconhecido' });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});