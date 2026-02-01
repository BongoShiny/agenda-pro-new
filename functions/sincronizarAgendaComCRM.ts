import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é admin
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.cargo !== 'administrador' && user.cargo !== 'superior')) {
      return Response.json({ error: 'Acesso negado - apenas administradores' }, { status: 403 });
    }

    console.log('🔄 INICIANDO SINCRONIZAÇÃO COMPLETA AGENDA → CRM');

    // Buscar TODOS os agendamentos com paginação
    let agendamentosCompletos = [];
    let skip = 0;
    const batchSize = 1000;
    let temMais = true;

    while (temMais) {
      console.log(`📥 Buscando agendamentos: skip=${skip}, limit=${batchSize}`);
      const batch = await base44.asServiceRole.entities.Agendamento.list(null, batchSize, skip);
      
      if (!batch || batch.length === 0) {
        temMais = false;
      } else {
        agendamentosCompletos = agendamentosCompletos.concat(batch);
        skip += batchSize;
        console.log(`  ✅ Carregados ${agendamentosCompletos.length} agendamentos até agora`);
      }
    }
    
    console.log(`📊 Total de agendamentos no banco: ${agendamentosCompletos.length}`);
    
    // Garantir que é um array
    if (!Array.isArray(agendamentosCompletos)) {
      agendamentosCompletos = [];
    }

    // Filtrar agendamentos válidos
    const agendamentosValidos = agendamentosCompletos.filter(ag => {
      // Excluir bloqueios e FECHADOS
      if (ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO" || !ag.cliente_nome) {
        return false;
      }
      
      // Excluir agendamentos sem telefone válido
      if (!ag.cliente_telefone || ag.cliente_telefone.replace(/\D/g, '').length < 10) {
        return false;
      }
      
      return true;
    });

    console.log(`✅ Total de agendamentos válidos: ${agendamentosValidos.length}`);

    // Buscar todos os leads existentes com paginação
    let leadsExistentes = [];
    skip = 0;
    temMais = true;

    while (temMais) {
      console.log(`📥 Buscando leads: skip=${skip}, limit=${batchSize}`);
      const batch = await base44.asServiceRole.entities.Lead.list(null, batchSize, skip);
      
      if (!batch || batch.length === 0) {
        temMais = false;
      } else {
        leadsExistentes = leadsExistentes.concat(batch);
        skip += batchSize;
        console.log(`  ✅ Carregados ${leadsExistentes.length} leads até agora`);
      }
    }
    
    console.log(`📋 Total de leads existentes: ${leadsExistentes.length}`);
    
    const mapLeadsPorTelefone = {};
    leadsExistentes.forEach(lead => {
      if (lead.telefone) {
        const telefoneNormalizado = lead.telefone.replace(/\D/g, '');
        if (telefoneNormalizado) {
          mapLeadsPorTelefone[telefoneNormalizado] = lead;
        }
      }
    });

    let leadsAtualizados = 0;
    let leadsCriados = 0;
    let erros = 0;

    // Helper para delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Processar cada agendamento válido com throttle
    for (let i = 0; i < agendamentosValidos.length; i++) {
      const ag = agendamentosValidos[i];
      
      try {
        const telefoneNormalizado = ag.cliente_telefone.replace(/\D/g, '');
        const leadExistente = mapLeadsPorTelefone[telefoneNormalizado];

        // Determinar status: se tipo=avulsa OU tem vendedor = "avulso", senão = "plano_terapeutico"
        let novoStatus = 'plano_terapeutico';
        if (ag.tipo === 'avulsa' || ag.vendedor_id || ag.vendedor_nome) {
          novoStatus = 'avulso';
        }

        if (leadExistente) {
          // Atualizar lead existente
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
          leadsAtualizados++;
        } else {
          // Criar novo lead
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
            temperatura: "quente",
            convertido: true,
            data_entrada: new Date().toISOString(),
            data_conversao: ag.data || new Date().toISOString().split('T')[0],
            valor_negociado: ag.valor_combinado || 0
          });
          leadsCriados++;
          
          // Adicionar ao mapa
          mapLeadsPorTelefone[telefoneNormalizado] = novoLead;
        }

        // Adicionar delay a cada 10 operações para evitar rate limit
        if ((i + 1) % 10 === 0) {
          console.log(`⏳ Processados ${i + 1}/${agendamentosValidos.length}... aguardando 500ms`);
          await delay(500);
        }

      } catch (error) {
        console.error(`❌ Erro ao processar ${ag.cliente_nome}:`, error.message);
        erros++;
      }
    }

    // Registrar log
    await base44.asServiceRole.entities.LogAcao.create({
      tipo: "sincronizou_crm",
      usuario_email: user.email,
      descricao: `Sincronização Agenda → CRM: ${leadsCriados} leads criados, ${leadsAtualizados} atualizados, ${erros} erros`,
      entidade_tipo: "Lead"
    });

    console.log('✅ SINCRONIZAÇÃO CONCLUÍDA');
    console.log(`📊 Leads criados: ${leadsCriados}`);
    console.log(`📊 Leads atualizados: ${leadsAtualizados}`);
    console.log(`📊 Erros: ${erros}`);

    return Response.json({
      success: true,
      leadsCriados,
      leadsAtualizados,
      totalProcessados: agendamentosValidos.length,
      erros
    });

  } catch (error) {
    console.error('❌ ERRO NA SINCRONIZAÇÃO:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});