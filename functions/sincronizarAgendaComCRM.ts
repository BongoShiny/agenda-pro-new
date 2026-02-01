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

    // Buscar todos os agendamentos (exceto bloqueios)
    const agendamentos = await base44.asServiceRole.entities.Agendamento.list();
    const agendamentosValidos = agendamentos.filter(ag => 
      ag.status !== "bloqueio" && 
      ag.tipo !== "bloqueio" && 
      ag.cliente_nome !== "FECHADO" &&
      ag.vendedor_id &&
      ag.cliente_nome
    );

    console.log(`📊 Total de agendamentos válidos: ${agendamentosValidos.length}`);

    // Buscar todos os leads existentes
    const leadsExistentes = await base44.asServiceRole.entities.Lead.list();
    const mapLeads = {};
    leadsExistentes.forEach(lead => {
      const chave = `${lead.nome.toLowerCase()}_${lead.vendedor_id}`;
      mapLeads[chave] = lead;
    });

    let leadsAtualizados = 0;
    let leadsCriados = 0;
    let erros = 0;

    // Processar cada agendamento
    for (const ag of agendamentosValidos) {
      try {
        const chave = `${ag.cliente_nome.toLowerCase()}_${ag.vendedor_id}`;
        const leadExistente = mapLeads[chave];

        // Determinar status baseado no tipo de agendamento
        let novoStatus = 'avulso';
        if (ag.tipo === 'plano_terapeutico') {
          novoStatus = 'plano_terapeutico';
        } else if (ag.tipo === 'renovacao') {
          novoStatus = 'renovacao';
        }

        if (leadExistente) {
          // Atualizar lead existente
          const atualizacao = {
            telefone: ag.cliente_telefone || leadExistente.telefone,
            status: novoStatus,
            convertido: true,
            data_conversao: ag.data || new Date().toISOString().split('T')[0],
            unidade_id: ag.unidade_id || leadExistente.unidade_id,
            unidade_nome: ag.unidade_nome || leadExistente.unidade_nome,
            valor_negociado: ag.valor_combinado || leadExistente.valor_negociado
          };

          await base44.asServiceRole.entities.Lead.update(leadExistente.id, atualizacao);
          leadsAtualizados++;
        } else {
          // Criar novo lead
          const novoLead = {
            nome: ag.cliente_nome,
            telefone: ag.cliente_telefone || "",
            email: "",
            vendedor_id: ag.vendedor_id,
            vendedor_nome: ag.vendedor_nome,
            unidade_id: ag.unidade_id || "",
            unidade_nome: ag.unidade_nome || "",
            status: novoStatus,
            origem: "agenda",
            temperatura: "quente",
            convertido: true,
            data_entrada: ag.data || new Date().toISOString().split('T')[0],
            data_primeiro_contato: ag.data || new Date().toISOString().split('T')[0],
            data_conversao: ag.data || new Date().toISOString().split('T')[0],
            valor_negociado: ag.valor_combinado || 0
          };

          await base44.asServiceRole.entities.Lead.create(novoLead);
          leadsCriados++;
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