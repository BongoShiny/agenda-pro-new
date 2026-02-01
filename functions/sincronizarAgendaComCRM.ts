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

    // Buscar TODOS os agendamentos desde 01/01/2026
    const dataCorte = '2026-01-01';
    let agendamentosCompletos = await base44.asServiceRole.entities.Agendamento.list();
    
    console.log(`📊 Total de agendamentos no banco: ${agendamentosCompletos?.length || 0}`);
    
    // Garantir que é um array
    if (!Array.isArray(agendamentosCompletos)) {
      agendamentosCompletos = [];
    }

    // Filtrar agendamentos válidos
    const agendamentosValidos = agendamentosCompletos.filter(ag => {
      console.log(`🔍 Verificando: ${ag.cliente_nome}, tipo: ${ag.tipo}, tel: ${ag.cliente_telefone}`);
      
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
    
    if (agendamentosValidos.length > 0) {
      console.log('📌 Exemplo de agendamento válido:', JSON.stringify(agendamentosValidos[0], null, 2));
    }

    // Buscar todos os leads existentes
    const leadsExistentes = await base44.asServiceRole.entities.Lead.list();
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

    // Processar cada agendamento válido
    for (const ag of agendamentosValidos) {
      try {
        const telefoneNormalizado = ag.cliente_telefone.replace(/\D/g, '');
        const leadExistente = mapLeadsPorTelefone[telefoneNormalizado];

        // Determinar status: se tem vendedor ou é avulsa = "avulso", senão = "plano_terapeutico"
        let novoStatus = 'plano_terapeutico';
        if (ag.vendedor_id || ag.vendedor_nome || ag.tipo === 'avulsa') {
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