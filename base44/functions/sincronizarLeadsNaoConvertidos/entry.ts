import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar todos os agendamentos
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

    console.log(`✅ Total de agendamentos carregados: ${agendamentos.length}`);

    // Buscar todos os leads existentes
    let todos_leads = [];
    skip = 0;
    temMais = true;

    while (temMais) {
      const batch = await base44.asServiceRole.entities.Lead.list(null, 1000, skip);
      if (!batch || !Array.isArray(batch) || batch.length === 0) {
        temMais = false;
      } else {
        todos_leads = todos_leads.concat(batch);
        skip += 1000;
      }
    }

    console.log(`✅ Total de leads carregados: ${todos_leads.length}`);

    let atualizados = 0;
    let erros = 0;

    // Mapear leads por telefone para referência rápida
    const mapLeads = {};
    todos_leads.forEach(lead => {
      if (lead.telefone) {
        const tel = lead.telefone.replace(/\D/g, '');
        mapLeads[tel] = lead;
      }
    });

    // Processar agendamentos em lotes
    const tamanhoLote = 200;
    
    for (let i = 0; i < agendamentos.length; i++) {
      const ag = agendamentos[i];

      // Pular bloqueios e registros inválidos
      if (ag.tipo === 'bloqueio' || ag.status === 'bloqueio' || !ag.cliente_telefone) {
        continue;
      }

      try {
        const tel = ag.cliente_telefone.replace(/\D/g, '');
        const leadExistente = mapLeads[tel];
        
        // Determinar status baseado em data_pagamento
        let novoStatus = 'lead';
        let dataReferencia = ag.created_date ? ag.created_date.split('T')[0] : new Date().toISOString().split('T')[0];
        
        if (ag.data_pagamento) {
          // Venda com pagamento = Avulso
          novoStatus = 'avulso';
          dataReferencia = ag.data_pagamento;
        } else if (ag.created_date) {
          // Venda sem pagamento = Lead (usa data_entrada)
          novoStatus = 'lead';
          dataReferencia = ag.created_date.split('T')[0];
        }

        if (leadExistente) {
          // Atualizar lead existente
          await base44.asServiceRole.entities.Lead.update(leadExistente.id, {
            status: novoStatus,
            data_entrada: dataReferencia,
            convertido: novoStatus === 'avulso'
          });
          atualizados++;
        }

        // Delay adaptativo
        await delay(50);
        
        if ((i + 1) % tamanhoLote === 0) {
          console.log(`⏳ Processados ${i + 1}/${agendamentos.length}...`);
          await delay(500);
        }

      } catch (error) {
        console.error(`❌ Erro ao sincronizar agendamento ${ag.id}: ${error.message}`);
        erros++;
        await delay(100);
      }
    }

    console.log(`✅ Sincronização completa: ${atualizados} leads atualizados, ${erros} erros`);

    return Response.json({
      success: true,
      total_agendamentos: agendamentos.length,
      total_leads: todos_leads.length,
      leads_sincronizados: atualizados,
      erros: erros,
      status: 'Leads sincronizados com data_pagamento e data_entrada'
    });

  } catch (error) {
    console.error('❌ ERRO:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});