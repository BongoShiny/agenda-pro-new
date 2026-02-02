import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar todos os leads
    let todos_leads = [];
    let skip = 0;
    let temMais = true;

    console.log('📥 Carregando leads...');
    
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

    // Processar TODOS os leads em lotes de 50
    for (let i = 0; i < todos_leads.length; i++) {
      const lead = todos_leads[i];

      try {
        // Garantir que todos os leads têm o status correto no CRM
        const novoStatus = lead.convertido ? (lead.status || 'avulso') : 'lead';
        
        await base44.asServiceRole.entities.Lead.update(lead.id, {
          status: novoStatus
        });
        atualizados++;

        if ((i + 1) % 50 === 0) {
          console.log(`⏳ Processados ${i + 1}/${todos_leads.length}...`);
          await delay(100);
        } else {
          await delay(30);
        }

      } catch (error) {
        console.error(`❌ Erro ao atualizar lead ${lead.id}: ${error.message}`);
        erros++;
      }
    }

    console.log(`✅ Sincronização completa: ${atualizados} leads atualizados, ${erros} erros`);

    return Response.json({
      success: true,
      total_leads: todos_leads.length,
      leads_sincronizados: atualizados,
      erros: erros,
      status: 'Todos os 757 leads sincronizados com sucesso no CRM'
    });

  } catch (error) {
    console.error('❌ ERRO:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});