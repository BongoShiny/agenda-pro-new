import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Aceitar tanto GET quanto POST
    if (req.method === 'GET') {
      return Response.json({ 
        status: 'Webhook ativo',
        message: 'Configure este webhook na Octadesk para receber mensagens'
      });
    }
    
    // Receber dados do webhook
    const body = await req.json().catch(() => ({}));
    
    console.log('Webhook recebido:', JSON.stringify(body, null, 2));

    // Extrair informações - Octadesk pode enviar vários formatos
    const mensagem = body.message?.body || body.body || body.text || body.message?.text?.body || '';
    const telefone = body.contact?.phoneNumber || body.phoneNumber || body.from || body.phone || body.key?.remoteJid || '';

    console.log('Mensagem extraída:', mensagem);
    console.log('Telefone extraído:', telefone);

    if (!mensagem || !telefone) {
      console.log('Dados insuficientes - retornando 200 para não bloquear webhook');
      return Response.json({ 
        success: true,
        message: 'Processado (dados insuficientes)',
        recebido: body
      }, { status: 200 });
    }

    // Limpar telefone (remover código do país e caracteres especiais)
    const telefoneLimpo = telefone.replace(/\D/g, '').replace(/^55/, '');

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
    // Sempre retornar 200 para não bloquear o webhook real
    return Response.json({ 
      success: true,
      message: 'Processado com erro',
      error: error.message 
    }, { status: 200 });
  }
});