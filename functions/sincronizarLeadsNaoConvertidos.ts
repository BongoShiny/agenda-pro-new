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

    // Filtrar leads não convertidos (sem status "avulso" ou "plano_terapeutico")
    const leads_nao_convertidos = todos_leads.filter(lead => 
      !lead.convertido && (!lead.status || lead.status === "lead")
    );

    console.log(`🔍 Leads não convertidos com status "lead": ${leads_nao_convertidos.length}`);

    let atualizados = 0;
    let erros = 0;

    // Processar em lotes de 50
    for (let i = 0; i < leads_nao_convertidos.length; i++) {
      const lead = leads_nao_convertidos[i];

      try {
        // Garantir que o status está como "lead"
        await base44.asServiceRole.entities.Lead.update(lead.id, {
          status: 'lead',
          convertido: false
        });
        atualizados++;

        if ((i + 1) % 50 === 0) {
          console.log(`⏳ Processados ${i + 1}/${leads_nao_convertidos.length}...`);
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
      status: 'Leads sincronizados com sucesso no CRM'
    });

  } catch (error) {
    console.error('❌ ERRO:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});