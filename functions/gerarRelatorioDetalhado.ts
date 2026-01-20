import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: { dataInicio, dataFim } } = await req.json();

    // Buscar agendamentos do período
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
      status: { $ne: "bloqueio" },
      tipo: { $ne: "bloqueio" }
    }, "-created_date", 500);

    // Filtrar para o período
    const vendasPeriodo = agendamentos.filter(ag => {
      if (!ag.created_date) return false;
      const dataCriacao = ag.created_date.substring(0, 10);
      return dataCriacao >= dataInicio && dataCriacao <= dataFim;
    });

    // Buscar unidades para mapeamento
    const unidades = await base44.asServiceRole.entities.Unidade.list();
    const vendedores = await base44.asServiceRole.entities.Vendedor.list();

    // Agrupar por unidade
    const relatoriosPorUnidade = {};
    
    unidades.forEach(unidade => {
      relatoriosPorUnidade[unidade.id] = {
        unidade_nome: unidade.nome,
        unidade_id: unidade.id,
        vendas_mulheres: 0,
        vendas_homens: 0,
        por_vendedor: {},
        total_leads: 0,
        total_vendas: 0,
        total_planos: 0
      };
    });

    // Processar vendas
    vendasPeriodo.forEach(ag => {
      const unidadeId = ag.unidade_id;
      if (!relatoriosPorUnidade[unidadeId]) {
        relatoriosPorUnidade[unidadeId] = {
          unidade_nome: ag.unidade_nome || "Sem Unidade",
          unidade_id: unidadeId,
          vendas_mulheres: 0,
          vendas_homens: 0,
          por_vendedor: {},
          total_leads: 0,
          total_vendas: 0,
          total_planos: 0
        };
      }

      const vendedor = ag.vendedor_nome || "Sem Vendedor";
      if (!relatoriosPorUnidade[unidadeId].por_vendedor[vendedor]) {
        relatoriosPorUnidade[unidadeId].por_vendedor[vendedor] = 0;
      }

      relatoriosPorUnidade[unidadeId].por_vendedor[vendedor]++;
      relatoriosPorUnidade[unidadeId].total_vendas++;

      if (ag.tipo === "pacote" || ag.tipo === "primeira_sessao_pacote") {
        relatoriosPorUnidade[unidadeId].total_planos++;
      }
    });

    // Formatar relatórios por unidade
    const relatoriosFormatados = Object.values(relatoriosPorUnidade).map(rel => {
      const dataBr = format(new Date(dataInicio + "T12:00:00"), "dd/MM");
      const diaSemana = format(new Date(dataInicio + "T12:00:00"), "EEEE", { locale: {} }).toUpperCase();
      
      const vendedoresOrdenados = Object.entries(rel.por_vendedor)
        .sort((a, b) => b[1] - a[1])
        .map(([nome, count]) => `${nome}: ${count}`);

      const conversao = rel.total_leads > 0 ? ((rel.total_vendas / rel.total_leads) * 100).toFixed(1) : "0";

      return {
        unidade_nome: rel.unidade_nome,
        data_inicio: dataInicio,
        data_fim: dataFim,
        titulo: `RESUMO DO DIA - ${dataBr} - ${diaSemana} - ${rel.unidade_nome}`,
        vendas_mulheres: rel.vendas_mulheres,
        vendas_homens: rel.vendas_homens,
        por_vendedor: rel.por_vendedor,
        vendedores_texto: vendedoresOrdenados.join('\n'),
        total_vendas: rel.total_vendas,
        total_planos: rel.total_planos,
        total_leads: rel.total_leads,
        taxa_conversao: conversao,
        conteudo_formatado: `📗VENDAS ${rel.unidade_nome.toUpperCase()}: 
🔴Mulheres: ${rel.vendas_mulheres}
🔵Homens: ${rel.vendas_homens}
__

TOTAL ${rel.unidade_nome.toUpperCase()}

👤 TOTAL VENDAS - ${rel.unidade_nome.toUpperCase()}:

${vendedoresOrdenados.join('\n')}

Total de Vendas: ${rel.total_vendas}
Planos: ${rel.total_planos}
Total de leads: ${rel.total_leads}
% de conversão: ${conversao}%`
      };
    });

    return Response.json({
      success: true,
      relatorios: relatoriosFormatados,
      periodo: { data_inicio: dataInicio, data_fim: dataFim }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});