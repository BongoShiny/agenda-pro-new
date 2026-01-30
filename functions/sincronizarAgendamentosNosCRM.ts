import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log(`🔄 Iniciando sincronização de TODOS os agendamentos`);

    // Buscar todos os agendamentos do banco
    const todosAgendamentos = await base44.entities.Agendamento.list("-created_date");
    
    const agendamentosParaSincronizar = todosAgendamentos.filter(ag => {
      // Ignorar bloqueios
      if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") {
        return false;
      }
      
      return true;
    });

    console.log(`📊 Total de agendamentos para sincronizar: ${agendamentosParaSincronizar.length}`);

    let sincronizados = 0;
    let erros = 0;
    const detalhes = [];

    for (const ag of agendamentosParaSincronizar) {
      try {
        // Pular se não tiver vendedor
        if (!ag.vendedor_id) {
          console.log(`⏭️ Pulando agendamento ${ag.id}: sem vendedor`);
          continue;
        }

        console.log(`\n📌 Processando agendamento: ${ag.cliente_nome} | Tipo: ${ag.tipo}`);

        // Buscar leads existentes do cliente com esse vendedor
        const leadsExistentes = await base44.entities.Lead.filter({
          vendedor_id: ag.vendedor_id,
          nome: ag.cliente_nome
        });

        let lead = leadsExistentes[0];

        // Se não existe lead, criar novo
        if (!lead) {
          console.log(`✨ Criando novo lead para ${ag.cliente_nome}`);
          
          lead = await base44.entities.Lead.create({
            nome: ag.cliente_nome,
            telefone: ag.cliente_telefone || "",
            email: "",
            sexo: "Outro",
            unidade_id: ag.unidade_id || "",
            unidade_nome: ag.unidade_nome || "",
            vendedor_id: ag.vendedor_id,
            vendedor_nome: ag.vendedor_nome || "",
            status: "lead",
            origem: "sistema_agendamento",
            interesse: ag.servico_nome || "",
            temperatura: "morno",
            data_primeiro_contato: ag.data,
            anotacoes_internas: `Sincronizado automaticamente do agendamento ${ag.id}`
          });
        }

        // Determinar novo status baseado no tipo do agendamento
        let novoStatus = null;

        if (ag.tipo === 'avulso' || ag.tipo === 'avulsa') {
          novoStatus = 'avulso';
        } else if (ag.tipo === 'plano_terapeutico' || ag.tipo === 'pacote') {
          novoStatus = 'plano_terapeutico';
        }

        // Atualizar status se necessário
        if (novoStatus && lead.status !== novoStatus) {
          console.log(`🔄 Atualizando lead ${lead.id}: ${lead.status} → ${novoStatus}`);
          
          await base44.entities.Lead.update(lead.id, {
            status: novoStatus,
            data_primeiro_contato: ag.data,
            data_proxima_acao: ag.data_proxima_acao || ag.data
          });
        }

        // Criar interação do lead
        await base44.entities.InteracaoLead.create({
          lead_id: lead.id,
          lead_nome: lead.nome,
          tipo: 'visita_clinica',
          descricao: `Agendamento: ${ag.servico_nome} | Data: ${ag.data} | Status: ${ag.status}`,
          resultado: 'neutro',
          vendedor_nome: ag.vendedor_nome,
          data_interacao: new Date().toISOString(),
          proxima_acao: `Acompanhar resultado do atendimento`
        });

        sincronizados++;
        detalhes.push({
          agendamento_id: ag.id,
          cliente: ag.cliente_nome,
          lead_id: lead.id,
          status_lead: novoStatus || lead.status,
          tipo: ag.tipo
        });

        console.log(`✅ Lead ${lead.id} sincronizado com sucesso`);

      } catch (error) {
        erros++;
        console.error(`❌ Erro ao sincronizar agendamento ${ag.id}:`, error);
        detalhes.push({
          agendamento_id: ag.id,
          cliente: ag.cliente_nome,
          erro: error.message
        });
      }
    }

    const resultado = {
      total_agendamentos: agendamentosParaSincronizar.length,
      sincronizados,
      erros,
      detalhes,
      mensagem: `✅ Sincronização concluída: ${sincronizados} leads atualizados/criados, ${erros} erros`
    };

    console.log(`\n🎉 RESULTADO FINAL:`, resultado);

    return Response.json(resultado);

  } catch (error) {
    console.error("❌ Erro na função:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});