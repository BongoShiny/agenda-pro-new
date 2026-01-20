import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.cargo !== 'administrador')) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Data de início: 14/01/2026
    const dataInicio = new Date(2026, 0, 14);
    
    // Buscar todos os agendamentos desde essa data
    const agendamentos = await base44.asServiceRole.entities.Agendamento.list("-data", 2000);
    
    // Filtrar apenas agendamentos com pacote ativo desde 14/01/2026
    const agendamentosFiltrados = agendamentos.filter(ag => {
      const dataAg = new Date(ag.data + 'T00:00:00');
      return dataAg >= dataInicio && 
             ag.cliente_pacote === "Sim" && 
             ag.status !== "cancelado" &&
             ag.cliente_nome;
    });

    console.log(`📊 Agendamentos encontrados: ${agendamentosFiltrados.length}`);

    // Agrupar por cliente_nome para evitar duplicatas
    const clientesUnicos = {};
    agendamentosFiltrados.forEach(ag => {
      if (!clientesUnicos[ag.cliente_nome]) {
        clientesUnicos[ag.cliente_nome] = ag;
      }
    });

    console.log(`👥 Clientes únicos: ${Object.keys(clientesUnicos).length}`);

    // Buscar clientes já existentes no CRM
    const clientesCRM = await base44.asServiceRole.entities.ClienteCRM.list("nome", 2000);
    const nomesCRM = clientesCRM.map(c => c.nome.toLowerCase());

    // Sincronizar cada cliente no CRM
    let criados = 0;
    let jaExistentes = 0;
    const erros = [];

    for (const ag of Object.values(clientesUnicos)) {
      const nomeClienteLower = ag.cliente_nome.toLowerCase();
      
      // Verificar se já existe no CRM
      if (nomesCRM.includes(nomeClienteLower)) {
        jaExistentes++;
        continue;
      }

      try {
        console.log(`✅ Criando cliente: ${ag.cliente_nome}`);
        
        await base44.asServiceRole.entities.ClienteCRM.create({
          nome: ag.cliente_nome,
          telefone: ag.cliente_telefone || "",
          email: "",
          clinica: ag.unidade_nome || "",
          data_primeira_sessao: ag.data,
          vendedor: ag.vendedor_nome || "Não informado",
          canal_venda: "Presencial",
          pacote_nome: ag.servico_nome || "Pacote",
          valor_pacote: ag.valor_combinado || 0,
          forma_pagamento: "Pix",
          sessoes_total: ag.quantas_sessoes || 0,
          sessoes_realizadas: ag.sessoes_feitas || 0,
          status_pacote: "Em Andamento",
          renovacoes: 0,
          ativo: true
        });
        
        criados++;
      } catch (error) {
        console.error(`❌ Erro ao criar ${ag.cliente_nome}:`, error.message);
        erros.push(`${ag.cliente_nome}: ${error.message}`);
      }
    }

    // Registrar ação
    await base44.asServiceRole.entities.LogAcao.create({
      tipo: "criou_cliente",
      usuario_email: user.email,
      descricao: `Sincronização em massa de clientes CRM: ${criados} criados, ${jaExistentes} já existentes`,
      entidade_tipo: "ClienteCRM"
    }).catch(e => console.log("Erro ao registrar log:", e));

    return Response.json({
      sucesso: true,
      mensagem: "Sincronização concluída",
      criados,
      jaExistentes,
      erros: erros.length > 0 ? erros : null
    });
  } catch (error) {
    console.error("❌ Erro na sincronização:", error);
    return Response.json({ 
      sucesso: false,
      erro: error.message 
    }, { status: 500 });
  }
});