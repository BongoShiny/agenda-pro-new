import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const agendamentoId = url.searchParams.get('agendamento_id');

    // Buscar agendamento
    if (action === 'get_agendamento') {
      if (!agendamentoId) {
        return Response.json({ error: 'ID do agendamento não fornecido' }, { status: 400 });
      }

      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({ id: agendamentoId });
      return Response.json(agendamentos.length > 0 ? agendamentos[0] : null);
    }

    // Verificar resposta existente
    if (action === 'check_resposta') {
      if (!agendamentoId) {
        return Response.json({ error: 'ID do agendamento não fornecido' }, { status: 400 });
      }

      const respostas = await base44.asServiceRole.entities.RespostaNPS.filter({ agendamento_id: agendamentoId });
      return Response.json(respostas.length > 0 ? respostas[0] : null);
    }

    // Salvar resposta NPS
    if (action === 'salvar_resposta') {
      const dados = await req.json();
      const resposta = await base44.asServiceRole.entities.RespostaNPS.create(dados);
      return Response.json(resposta);
    }

    return Response.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});