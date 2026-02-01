import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Função auxiliar para delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar todos os agendamentos válidos (sem telefone válido são ignorados)
    let agendamentos = await base44.asServiceRole.entities.Agendamento.list();
    
    const agendamentosValidos = agendamentos.filter(ag => {
      if (ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO" || !ag.cliente_nome) {
        return false;
      }
      if (!ag.cliente_telefone || ag.cliente_telefone.replace(/\D/g, '').length < 10) {
        return false;
      }
      return true;
    });

    console.log(`🎯 Total de agendamentos válidos: ${agendamentosValidos.length}`);

    // Buscar todos os leads existentes
    let leads = await base44.asServiceRole.entities.Lead.list();
    const mapLeads = {};
    leads.forEach(lead => {
      if (lead.telefone) {
        const tel = lead.telefone.replace(/\D/g, '');
        if (tel) mapLeads[tel] = lead;
      }
    });

    let processados = 0;
    let criados = 0;
    let atualizados = 0;
    let erros = 0;

    // Processar em lotes pequenos com delays
    for (let i = 0; i < agendamentosValidos.length; i++) {
      const ag = agendamentosValidos[i];
      
      try {
        const tel = ag.cliente_telefone.replace(/\D/g, '');
        const leadExistente = mapLeads[tel];
        
        const novoStatus = (ag.tipo === 'avulsa' || ag.vendedor_id || ag.vendedor_nome) ? 'avulso' : 'plano_terapeutico';

        if (leadExistente) {
          await base44.asServiceRole.entities.Lead.update(leadExistente.id, {
            status: novoStatus,
            unidade_id: ag.unidade_id || "",
            unidade_nome: ag.unidade_nome || "",
            vendedor_id: ag.vendedor_id || "",
            vendedor_nome: ag.vendedor_nome || "",
            terapeuta_id: ag.profissional_id || "",
            terapeuta_nome: ag.profissional_nome || "",
            convertido: true,
            data_conversao: ag.data || new Date().toISOString().split('T')[0],
            valor_negociado: ag.valor_combinado || 0
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
        
        processados++;

        // Delay progressivo: mais agressivo no início, mais lento depois
        if (i % 5 === 4) {
          await delay(200);
        }

      } catch (error) {
        console.error(`❌ ${ag.cliente_nome}: ${error.message}`);
        erros++;
      }

      // A cada 100 processados, um delay maior
      if (processados % 100 === 0) {
        console.log(`📊 ${processados}/${agendamentosValidos.length} processados... (criados: ${criados}, atualizados: ${atualizados})`);
        await delay(1000);
      }
    }

    console.log('✅ SINCRONIZAÇÃO CONCLUÍDA');
    console.log(`📊 Total processados: ${processados}`);
    console.log(`📊 Leads criados: ${criados}`);
    console.log(`📊 Leads atualizados: ${atualizados}`);
    console.log(`📊 Erros: ${erros}`);

    return Response.json({
      success: true,
      processados,
      criados,
      atualizados,
      erros,
      total: agendamentosValidos.length
    });

  } catch (error) {
    console.error('❌ ERRO:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});