import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é admin
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.cargo !== 'administrador' && user.cargo !== 'superior')) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { indiceInicio = 0, tamanhoLote = 5 } = body;

    // Buscar todos os agendamentos (apenas uma vez)
    let agendamentos = [];
    let skip = 0;
    let temMais = true;

    while (temMais) {
      const batch = await base44.asServiceRole.entities.Agendamento.list(null, 500, skip);
      if (!batch || !Array.isArray(batch) || batch.length === 0) {
        temMais = false;
      } else {
        agendamentos = agendamentos.concat(batch);
        skip += 500;
      }
    }

    // Filtrar agendamentos válidos
    const agendamentosValidos = agendamentos.filter(ag => {
      if (ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO" || !ag.cliente_nome) {
        return false;
      }
      if (!ag.cliente_telefone || ag.cliente_telefone.replace(/\D/g, '').length < 10) {
        return false;
      }
      return true;
    });

    // Buscar todos os leads (apenas uma vez)
    let leads = [];
    skip = 0;
    temMais = true;

    while (temMais) {
      const batch = await base44.asServiceRole.entities.Lead.list(null, 500, skip);
      if (!batch || !Array.isArray(batch) || batch.length === 0) {
        temMais = false;
      } else {
        leads = leads.concat(batch);
        skip += 500;
      }
    }

    const mapLeads = {};
    leads.forEach(lead => {
      if (lead.telefone) {
        const tel = lead.telefone.replace(/\D/g, '');
        if (tel) mapLeads[tel] = lead;
      }
    });

    // Processar apenas um lote pequeno
    const indiceFim = Math.min(indiceInicio + tamanhoLote, agendamentosValidos.length);
    let criados = 0;
    let atualizados = 0;
    let erros = 0;

    console.log(`🔄 Processando lote: ${indiceInicio} a ${indiceFim} de ${agendamentosValidos.length}`);

    for (let i = indiceInicio; i < indiceFim; i++) {
      const ag = agendamentosValidos[i];

      try {
        const tel = ag.cliente_telefone.replace(/\D/g, '');
        const leadExistente = mapLeads[tel];
        
        const novoStatus = (ag.tipo === 'avulsa' || ag.vendedor_id || ag.vendedor_nome) ? 'avulso' : 'plano_terapeutico';

        if (leadExistente) {
          await base44.asServiceRole.entities.Lead.update(leadExistente.id, {
            status: novoStatus,
            unidade_id: ag.unidade_id || leadExistente.unidade_id || "",
            unidade_nome: ag.unidade_nome || leadExistente.unidade_nome || "",
            vendedor_id: ag.vendedor_id || leadExistente.vendedor_id || "",
            vendedor_nome: ag.vendedor_nome || leadExistente.vendedor_nome || "",
            terapeuta_id: ag.profissional_id || leadExistente.terapeuta_id || "",
            terapeuta_nome: ag.profissional_nome || leadExistente.terapeuta_nome || "",
            convertido: true,
            data_conversao: ag.data || leadExistente.data_conversao,
            valor_negociado: ag.valor_combinado || leadExistente.valor_negociado || 0
          });
          atualizados++;
        } else {
          const novoLead = await base44.asServiceRole.entities.Lead.create({
            nome: ag.cliente_nome,
            telefone: ag.cliente_telefone,
            vendedor_id: ag.vendedor_id || "",
            vendedor_nome: ag.vendedor_nome || "",
            unidade_id: ag.unidade_id || "",
            unidade_nome: ag.unidade_nome || "",
            terapeuta_id: ag.profissional_id || "",
            terapeuta_nome: ag.profissional_nome || "",
            status: novoStatus,
            origem: "agenda",
            convertido: true,
            data_conversao: ag.data || new Date().toISOString().split('T')[0],
            valor_negociado: ag.valor_combinado || 0
          });
          criados++;
          mapLeads[tel] = novoLead;
        }

        // Delay pequeno entre cada operação
        await delay(100);

      } catch (error) {
        console.error(`❌ ${ag.cliente_nome}: ${error.message}`);
        erros++;
      }
    }

    const proximoIndice = indiceFim < agendamentosValidos.length ? indiceFim : null;

    console.log(`✅ Lote processado: criados=${criados}, atualizados=${atualizados}, erros=${erros}`);

    return Response.json({
      success: true,
      criados,
      atualizados,
      erros,
      processados: indiceFim - indiceInicio,
      totalRestante: agendamentosValidos.length - indiceFim,
      proximoIndice,
      totalAgendamentos: agendamentosValidos.length
    });

  } catch (error) {
    console.error('❌ ERRO:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});