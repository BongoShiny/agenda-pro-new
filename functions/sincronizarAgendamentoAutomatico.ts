import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Pegar o payload da automação
    const payload = await req.json();
    console.log('📥 Payload recebido:', payload);

    // Se o payload for muito grande, buscar os dados
    let agendamento = payload.data;
    if (payload.payload_too_large) {
      console.log('📦 Payload grande, buscando dados...');
      agendamento = await base44.asServiceRole.entities.Agendamento.get(payload.event.entity_id);
    }

    if (!agendamento) {
      console.log('⚠️ Agendamento não encontrado');
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    console.log(`\n📌 Processando agendamento: ${agendamento.cliente_nome} | Tipo: ${agendamento.tipo}`);

    // Ignorar bloqueios
    if (agendamento.status === "bloqueio" || agendamento.tipo === "bloqueio" || agendamento.cliente_nome === "FECHADO") {
      console.log('⏭️ Ignorando bloqueio');
      return Response.json({ message: 'Bloqueio ignorado' });
    }

    // Determinar status baseado na presença de vendedor
    // COM vendedor → Avulso | SEM vendedor → Plano Terapêutico
    const novoStatus = agendamento.vendedor_id ? 'avulso' : 'plano_terapeutico';
    const vendedorId = agendamento.vendedor_id || 'sem_vendedor';
    
    console.log(`📊 Status definido: ${novoStatus} (${agendamento.vendedor_id ? 'COM' : 'SEM'} vendedor)`);

    // Buscar leads existentes do cliente
    const leadsExistentes = await base44.asServiceRole.entities.Lead.filter({
      nome: agendamento.cliente_nome
    });

    let lead = leadsExistentes[0];

    // Se não existe lead, criar novo
    if (!lead) {
      console.log(`✨ Criando novo lead para ${agendamento.cliente_nome}`);
      
      lead = await base44.asServiceRole.entities.Lead.create({
        nome: agendamento.cliente_nome,
        telefone: agendamento.cliente_telefone || "",
        email: "",
        sexo: "Outro",
        unidade_id: agendamento.unidade_id || "",
        unidade_nome: agendamento.unidade_nome || "",
        vendedor_id: agendamento.vendedor_id || "",
        vendedor_nome: agendamento.vendedor_nome || "Sistema",
        status: novoStatus,
        origem: "sistema_agendamento",
        interesse: agendamento.servico_nome || "",
        temperatura: "morno",
        data_primeiro_contato: agendamento.data,
        anotacoes_internas: `Sincronizado automaticamente do agendamento ${agendamento.id}`
      });
      
      console.log(`✅ Lead ${lead.id} criado`);
    }

    // Sempre atualizar status baseado na regra: COM vendedor = Avulso, SEM vendedor = Plano Terapêutico
    if (lead.status !== novoStatus) {
      console.log(`🔄 Atualizando lead ${lead.id}: ${lead.status} → ${novoStatus}`);
      
      await base44.asServiceRole.entities.Lead.update(lead.id, {
        status: novoStatus,
        vendedor_id: agendamento.vendedor_id || lead.vendedor_id,
        vendedor_nome: agendamento.vendedor_nome || lead.vendedor_nome,
        data_proxima_acao: agendamento.data_proxima_acao || agendamento.data
      });
    }

    // Criar interação do lead
    await base44.asServiceRole.entities.InteracaoLead.create({
      lead_id: lead.id,
      lead_nome: lead.nome,
      tipo: 'visita_clinica',
      descricao: `Agendamento: ${agendamento.servico_nome} | Data: ${agendamento.data} | Status: ${agendamento.status}`,
      resultado: 'neutro',
      vendedor_nome: agendamento.vendedor_nome,
      data_interacao: new Date().toISOString(),
      proxima_acao: `Acompanhar resultado do atendimento`
    });

    console.log(`✅ Lead ${lead.id} sincronizado com sucesso`);

    return Response.json({
      success: true,
      lead_id: lead.id,
      lead_status: novoStatus || lead.status,
      mensagem: `Lead ${lead.nome} sincronizado com sucesso`
    });

  } catch (error) {
    console.error("❌ Erro na função:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});