import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apenas admin pode gerar relatórios
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { periodo = 'diario', dataInicio, dataFim } = await req.json();

    // Buscar agendamentos no período
    const agendamentos = await base44.entities.Agendamento.list();
    
    // Filtrar agendamentos válidos (com vendedor, sem bloqueios)
    const vendasPeriodo = agendamentos.filter(ag => {
      if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
      if (!ag.created_date) return false;
      if (!ag.vendedor_id && !ag.vendedor_nome) return false;
      
      const dataCriacao = ag.created_date.substring(0, 10);
      return dataCriacao >= dataInicio && dataCriacao <= dataFim;
    });

    // Calcular métricas
    const totalVendas = vendasPeriodo.length;
    const totalValor = vendasPeriodo.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
    const totalRecebido = vendasPeriodo.reduce((sum, ag) => {
      const pago = (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
      return sum + pago;
    }, 0);

    // Agrupar por vendedor
    const vendedoresMestricas = {};
    vendasPeriodo.forEach(ag => {
      const vendedor = ag.vendedor_nome || "Sem Vendedor";
      if (!vendedoresMestricas[vendedor]) {
        vendedoresMestricas[vendedor] = {
          totalVendas: 0,
          totalValor: 0,
          totalRecebido: 0
        };
      }
      vendedoresMestricas[vendedor].totalVendas++;
      vendedoresMestricas[vendedor].totalValor += ag.valor_combinado || 0;
      const pago = (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
      vendedoresMestricas[vendedor].totalRecebido += pago;
    });

    // Agrupar por unidade
    const unidadesMestricas = {};
    vendasPeriodo.forEach(ag => {
      const unidade = ag.unidade_nome || "Sem Unidade";
      if (!unidadesMestricas[unidade]) {
        unidadesMestricas[unidade] = {
          totalVendas: 0,
          totalValor: 0
        };
      }
      unidadesMestricas[unidade].totalVendas++;
      unidadesMestricas[unidade].totalValor += ag.valor_combinado || 0;
    });

    // Preparar prompt para IA
    const prompt = `Você é um analista de vendas experiente. Analise os seguintes dados de vendas e gere um relatório ${periodo} com insights, tendências e áreas de melhoria.

PERÍODO: ${periodo.toUpperCase()}
DATA: ${dataInicio} a ${dataFim}

RESUMO GERAL:
- Total de Vendas: ${totalVendas}
- Valor Total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Total Recebido: R$ ${totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Taxa de Recebimento: ${totalValor > 0 ? ((totalRecebido / totalValor) * 100).toFixed(1) : 0}%

DESEMPENHO POR VENDEDOR:
${Object.entries(vendedoresMestricas).map(([vendedor, metricas]) => 
  `- ${vendedor}: ${metricas.totalVendas} vendas, R$ ${metricas.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Taxa de recebimento: ${metricas.totalValor > 0 ? ((metricas.totalRecebido / metricas.totalValor) * 100).toFixed(1) : 0}%`
).join('\n')}

DESEMPENHO POR UNIDADE:
${Object.entries(unidadesMestricas).map(([unidade, metricas]) => 
  `- ${unidade}: ${metricas.totalVendas} vendas, R$ ${metricas.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
).join('\n')}

Por favor, gere um relatório estruturado com:
1. RESUMO EXECUTIVO (parágrafo curto com os principais números)
2. DESTAQUES (pontos positivos e marcos alcançados)
3. TENDÊNCIAS (padrões observados nos dados)
4. ÁREAS DE MELHORIA (oportunidades de crescimento)
5. RECOMENDAÇÕES (ações sugeridas para o próximo período)

Mantenha o tom profissional, mas acessível. Use dados específicos para sustentar cada ponto.`;

    // Chamar IA para gerar relatório
    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false
    });

    // Salvar relatório gerado
    const relatorio = await base44.entities.RelatorioVendas.create({
      periodo: periodo,
      data_inicio: dataInicio,
      data_fim: dataFim,
      total_vendas: totalVendas,
      total_valor: totalValor,
      total_recebido: totalRecebido,
      taxa_recebimento: totalValor > 0 ? (totalRecebido / totalValor) * 100 : 0,
      metricas_vendedores: JSON.stringify(vendedoresMestricas),
      metricas_unidades: JSON.stringify(unidadesMestricas),
      conteudo_relatorio: resultado,
      gerado_por: user.email,
      gerado_em: new Date().toISOString()
    });

    return Response.json({
      success: true,
      relatorio: relatorio
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});