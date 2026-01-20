import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Buscar unidade Alphaville
    const unidades = await base44.asServiceRole.entities.Unidade.list();
    const alphaville = unidades.find(u => u.nome.toLowerCase().includes('alphaville'));
    
    if (!alphaville) {
      return Response.json({ error: 'Alphaville não encontrada' }, { status: 404 });
    }

    // Gerar datas dos sábados de 24/01/2026 até 25/07/2026
    const sabados = [];
    const dataInicio = new Date(2026, 0, 24); // 24/01/2026
    const dataFim = new Date(2026, 6, 25); // 25/07/2026

    for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 6) { // 6 = Sábado
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        sabados.push(`${ano}-${mes}-${dia}`);
      }
    }

    // Buscar todos os agendamentos desses sábados
    const todosAgendamentos = await base44.asServiceRole.entities.Agendamento.list();
    
    const agendamentosSabados = todosAgendamentos.filter(ag => 
      ag.unidade_id === alphaville.id && 
      sabados.includes(ag.data)
    );

    // Separar por status
    const cancelados = agendamentosSabados.filter(ag => ag.status === "cancelado");
    const bloqueios = agendamentosSabados.filter(ag => ag.status === "bloqueio" || ag.tipo === "bloqueio");
    const fechados = agendamentosSabados.filter(ag => ag.cliente_nome === "FECHADO");
    const validos = agendamentosSabados.filter(ag => 
      ag.status !== "cancelado" && 
      ag.status !== "bloqueio" && 
      ag.tipo !== "bloqueio" &&
      ag.cliente_nome !== "FECHADO"
    );

    // Reativar os cancelados
    for (const ag of cancelados) {
      await base44.asServiceRole.entities.Agendamento.update(ag.id, {
        status: "agendado"
      });
    }

    return Response.json({
      sabados: sabados,
      total_agendamentos: agendamentosSabados.length,
      validos: validos.length,
      cancelados_reativados: cancelados.length,
      bloqueios: bloqueios.length,
      fechados: fechados.length,
      detalhes: {
        cancelados_reativados: cancelados.map(ag => ({
          id: ag.id,
          cliente: ag.cliente_nome,
          data: ag.data,
          hora: `${ag.hora_inicio} - ${ag.hora_fim}`
        })),
        bloqueios_encontrados: bloqueios.map(ag => ({
          id: ag.id,
          cliente: ag.cliente_nome,
          data: ag.data,
          hora: `${ag.hora_inicio} - ${ag.hora_fim}`
        }))
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});