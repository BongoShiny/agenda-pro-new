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

    // Buscar TODOS os agendamentos (sem filtro de data) desde 01/01/2026
    const dataCorte = '2026-01-01';
    let agendamentos = await base44.asServiceRole.entities.Agendamento.filter({});
    
    console.log(`📊 Total de agendamentos retornados: ${agendamentos?.length || 0}`);
    
    // Garantir que agendamentos é um array
    if (!Array.isArray(agendamentos)) {
      agendamentos = [];
    }
    
    const agendamentosValidos = agendamentos.filter(ag => {
      // Filtrar por data >= 2026-01-01
      if (ag.data && ag.data < dataCorte) {
        return false;
      }
      
      // Excluir bloqueios e FECHADOS
      if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO" || !ag.cliente_nome) {
        return false;
      }
      
      // Excluir agendamentos sem telefone válido (mínimo 10 dígitos)
      if (!ag.cliente_telefone || ag.cliente_telefone.replace(/\D/g, '').length < 10) {
        return false;
      }
      
      return true;
    });

    console.log(`📊 Total de agendamentos válidos: ${agendamentosValidos.length}`);

    // Buscar todos os leads existentes (indexar por telefone)
    const leadsExistentes = await base44.asServiceRole.entities.Lead.list();
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

    // Processar cada agendamento
    for (const ag of agendamentosValidos) {
      try {
        // Buscar lead existente pelo telefone
        const telefoneNormalizado = ag.cliente_telefone ? ag.cliente_telefone.replace(/\D/g, '') : '';
        const leadExistente = telefoneNormalizado ? mapLeadsPorTelefone[telefoneNormalizado] : null;

        // Determinar status baseado no tipo de agendamento
        // Tipo "avulsa" → Status "avulso"
        // Outros tipos → Status "plano_terapeutico"
        let novoStatus = 'plano_terapeutico';
        if (ag.tipo === 'avulsa') {
          novoStatus = 'avulso';
        }

        if (leadExistente) {
          // Atualizar lead existente
          const atualizacao = {
            status: novoStatus,
            unidade_id: ag.unidade_id || leadExistente.unidade_id || "",
            unidade_nome: ag.unidade_nome || leadExistente.unidade_nome || "",
            vendedor_id: ag.vendedor_id || leadExistente.vendedor_id || "",
            vendedor_nome: ag.vendedor_nome || leadExistente.vendedor_nome || "",
            convertido: true,
            data_conversao: ag.data || leadExistente.data_conversao || new Date().toISOString().split('T')[0],
            valor_negociado: ag.valor_combinado || leadExistente.valor_negociado || 0
          };
          
          // Adicionar terapeuta apenas se existir
          if (ag.profissional_id) {
            atualizacao.terapeuta_id = ag.profissional_id;
            atualizacao.terapeuta_nome = ag.profissional_nome;
          }

          await base44.asServiceRole.entities.Lead.update(leadExistente.id, atualizacao);
          leadsAtualizados++;
        } else {
          const novoLead = {
            nome: ag.cliente_nome,
            telefone: ag.cliente_telefone,
            vendedor_id: ag.vendedor_id || "",
            vendedor_nome: ag.vendedor_nome || "",
            unidade_id: ag.unidade_id || "",
            unidade_nome: ag.unidade_nome || "",
            status: novoStatus,
            origem: "sistema_agendamento",
            temperatura: "quente",
            convertido: true,
            data_entrada: new Date().toISOString(),
            data_conversao: ag.data || new Date().toISOString().split('T')[0],
            valor_negociado: ag.valor_combinado || 0
          };
          
          // Adicionar terapeuta apenas se existir
          if (ag.profissional_id) {
            novoLead.terapeuta_id = ag.profissional_id;
            novoLead.terapeuta_nome = ag.profissional_nome;
          }

          await base44.asServiceRole.entities.Lead.create(novoLead);
          leadsCriados++;
          
          // Adicionar ao mapa para evitar duplicatas no mesmo lote
          mapLeadsPorTelefone[telefoneNormalizado] = novoLead;
        }
      } catch (error) {
        console.error(`❌ Erro ao processar agendamento ${ag.id}:`, error);
        erros++;
      }
    }

    // Registrar log da sincronização
    await base44.asServiceRole.entities.LogAcao.create({
      tipo: "sincronizou_crm",
      usuario_email: user.email,
      descricao: `Sincronização completa Agenda → CRM: ${leadsCriados} leads criados, ${leadsAtualizados} atualizados, ${erros} erros`,
      entidade_tipo: "Lead"
    });

    console.log('✅ SINCRONIZAÇÃO CONCLUÍDA');
    console.log(`📊 Resultados:`);
    console.log(`  - Leads criados: ${leadsCriados}`);
    console.log(`  - Leads atualizados: ${leadsAtualizados}`);
    console.log(`  - Erros: ${erros}`);

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