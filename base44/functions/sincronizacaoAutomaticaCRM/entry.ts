import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar ou criar controle
    let controles = await base44.asServiceRole.entities.ControleSincronizacaoCRM.list();
    let controle = controles.length > 0 ? controles[0] : null;

    if (!controle) {
      controle = await base44.asServiceRole.entities.ControleSincronizacaoCRM.create({
        indice_atual: 0,
        total_agendamentos: 0,
        criados: 0,
        atualizados: 0,
        erros: 0,
        em_progresso: false
      });
    }

    // Se já está em progresso, aguardar
    if (controle.em_progresso) {
      console.log('⏸️ Sincronização já em progresso, aguardando...');
      return Response.json({ message: 'Em progresso' });
    }

    // Buscar todos os agendamentos válidos (cache inicial)
    let agendamentos = [];
    let skip = 0;
    let temMais = true;

    console.log('📥 Carregando agendamentos...');
    
    while (temMais) {
      const batch = await base44.asServiceRole.entities.Agendamento.list(null, 1000, skip);
      if (!batch || !Array.isArray(batch) || batch.length === 0) {
        temMais = false;
      } else {
        agendamentos = agendamentos.concat(batch);
        skip += 1000;
      }
    }

    const agendamentosValidos = agendamentos.filter(ag => {
      if (ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO" || !ag.cliente_nome) return false;
      if (!ag.cliente_telefone || ag.cliente_telefone.replace(/\D/g, '').length < 10) return false;
      return true;
    });

    console.log(`✅ ${agendamentosValidos.length} agendamentos válidos`);

    // Se já processou todos, desativar automação
    if (controle.indice_atual >= agendamentosValidos.length) {
      console.log('✅ SINCRONIZAÇÃO COMPLETA! Desativando automação...');
      
      // Buscar e desativar a automação
      const automacoes = await base44.asServiceRole.listAutomations();
      const automacao = automacoes.find(a => a.function_name === 'sincronizacaoAutomaticaCRM' && a.is_active);
      
      if (automacao) {
        await base44.asServiceRole.updateAutomation(automacao.id, { is_active: false });
        console.log('🛑 Automação desativada automaticamente');
      }
      
      await base44.asServiceRole.entities.ControleSincronizacaoCRM.update(controle.id, {
        em_progresso: false,
        ultima_execucao: new Date().toISOString()
      });
      
      return Response.json({ 
        message: 'Sincronização completa!',
        automacao_desativada: true,
        totais: {
          criados: controle.criados,
          atualizados: controle.atualizados,
          erros: controle.erros
        }
      });
    }

    // Marcar como em progresso
    await base44.asServiceRole.entities.ControleSincronizacaoCRM.update(controle.id, {
      em_progresso: true,
      total_agendamentos: agendamentosValidos.length
    });

    // Buscar leads
    let leads = [];
    skip = 0;
    temMais = true;

    while (temMais) {
      const batch = await base44.asServiceRole.entities.Lead.list(null, 1000, skip);
      if (!batch || !Array.isArray(batch) || batch.length === 0) {
        temMais = false;
      } else {
        leads = leads.concat(batch);
        skip += 1000;
      }
    }

    const mapLeads = {};
    leads.forEach(lead => {
      if (lead.telefone) {
        const tel = lead.telefone.replace(/\D/g, '');
        if (tel) mapLeads[tel] = lead;
      }
    });

    // Processar lote maior (100 por vez)
    const tamanhoLote = 100;
    const indiceFim = Math.min(controle.indice_atual + tamanhoLote, agendamentosValidos.length);
    
    let criados = 0;
    let atualizados = 0;
    let erros = 0;

    console.log(`🔄 Processando ${controle.indice_atual} a ${indiceFim} de ${agendamentosValidos.length}`);

    for (let i = controle.indice_atual; i < indiceFim; i++) {
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

        // Delay entre operações (50ms apenas)
        await delay(50);

      } catch (error) {
        console.error(`❌ ${ag.cliente_nome}: ${error.message}`);
        erros++;
      }
    }

    // Atualizar controle
    await base44.asServiceRole.entities.ControleSincronizacaoCRM.update(controle.id, {
      indice_atual: indiceFim,
      criados: (controle.criados || 0) + criados,
      atualizados: (controle.atualizados || 0) + atualizados,
      erros: (controle.erros || 0) + erros,
      em_progresso: false,
      ultima_execucao: new Date().toISOString()
    });

    const progresso = ((indiceFim / agendamentosValidos.length) * 100).toFixed(1);
    
    console.log(`✅ Lote completo: +${criados} criados, +${atualizados} atualizados, ${erros} erros`);
    console.log(`📊 Progresso: ${progresso}% (${indiceFim}/${agendamentosValidos.length})`);

    return Response.json({
      success: true,
      lote: { criados, atualizados, erros },
      totais: {
        criados: (controle.criados || 0) + criados,
        atualizados: (controle.atualizados || 0) + atualizados,
        erros: (controle.erros || 0) + erros
      },
      progresso: `${progresso}%`,
      processados: indiceFim,
      total: agendamentosValidos.length,
      restante: agendamentosValidos.length - indiceFim
    });

  } catch (error) {
    console.error('❌ ERRO:', error);
    
    // Desbloquear em caso de erro
    try {
      const base44 = createClientFromRequest(req);
      const controles = await base44.asServiceRole.entities.ControleSincronizacaoCRM.list();
      if (controles.length > 0) {
        await base44.asServiceRole.entities.ControleSincronizacaoCRM.update(controles[0].id, {
          em_progresso: false
        });
      }
    } catch {}
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});