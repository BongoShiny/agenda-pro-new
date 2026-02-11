import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;

      // Buscar agendamento
      if (action === 'get_agendamento') {
        const agendamento = await base44.asServiceRole.entities.Agendamento.get(body.agendamento_id);
        return Response.json(agendamento || null);
      }

      // Verificar resposta existente
      if (action === 'check_resposta') {
        const respostas = await base44.asServiceRole.entities.RespostaNPS.filter({ agendamento_id: body.agendamento_id });
        return Response.json(respostas.length > 0 ? respostas[0] : null);
      }

      // Salvar resposta NPS
      if (action === 'salvar_resposta') {
        const { action: _, ...dados } = body;
        const resposta = await base44.asServiceRole.entities.RespostaNPS.create(dados);
        return Response.json(resposta);
      }
    }

    return Response.json({ error: 'Método ou ação não reconhecida' }, { status: 400 });
  } catch (error) {
    console.error('Erro na função npsPublico:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});