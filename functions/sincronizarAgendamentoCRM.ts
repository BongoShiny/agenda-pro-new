import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    console.log('📥 Payload:', JSON.stringify(payload, null, 2));

    // Extrair dados do agendamento
    let agendamento = payload.data;
    
    if (payload.payload_too_large) {
      console.log('📦 Buscando dados grandes...');
      agendamento = await base44.asServiceRole.entities.Agendamento.get(payload.event.entity_id);
    }

    if (!agendamento) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    console.log(`📌 Cliente: ${agendamento.cliente_nome} | Vendedor: ${agendamento.vendedor_id || 'SEM'}`);

    // Ignorar bloqueios
    if (agendamento.status === "bloqueio" || agendamento.tipo === "bloqueio" || agendamento.cliente_nome === "FECHADO") {
      console.log('⏭️ Bloqueio ignorado');
      return Response.json({ message: 'Bloqueio ignorado' });
    }

    // REGRA: COM vendedor = Avulso | SEM vendedor = Plano Terapêutico
    const novoStatus = agendamento.vendedor_id ? 'avulso' : 'plano_terapeutico';
    console.log(`📊 Status: ${novoStatus}`);

    // Buscar lead existente
    const leadsExistentes = await base44.asServiceRole.entities.Lead.filter({
      nome: agendamento.cliente_nome
    });

    let lead = leadsExistentes && leadsExistentes.length > 0 ? leadsExistentes[0] : null;

    // Criar lead se não existir
    if (!lead) {
      console.log(`✨ Criando lead: ${agendamento.cliente_nome}`);
      
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
        data_primeiro_contato: new Date().toISOString(),
        anotacoes_internas: `Auto-sincronizado do agendamento ${agendamento.id}`
      });
    } else if (lead.status !== novoStatus) {
      // Atualizar status do lead existente
      console.log(`🔄 Atualizando: ${lead.status} → ${novoStatus}`);
      
      await base44.asServiceRole.entities.Lead.update(lead.id, {
        status: novoStatus,
        vendedor_id: agendamento.vendedor_id || lead.vendedor_id,
        vendedor_nome: agendamento.vendedor_nome || lead.vendedor_nome
      });
    }

    // Criar interação
    await base44.asServiceRole.entities.InteracaoLead.create({
      lead_id: lead.id,
      lead_nome: lead.nome,
      tipo: 'visita_clinica',
      descricao: `Agendamento: ${agendamento.servico_nome} - ${agendamento.data} - ${agendamento.status}`,
      resultado: 'neutro',
      vendedor_nome: agendamento.vendedor_nome || "Sistema",
      data_interacao: new Date().toISOString()
    });

    console.log(`✅ Sincronizado: Lead ${lead.id}`);

    return Response.json({
      success: true,
      lead_id: lead.id,
      status: novoStatus
    });

  } catch (error) {
    console.error("❌ Erro:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});