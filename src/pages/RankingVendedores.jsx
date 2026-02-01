import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Trophy, TrendingUp, Target, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = ['#EAB308', '#C0C0C0', '#CD7F32', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function RankingVendedoresPage() {
  const [mesAno, setMesAno] = useState("2026-02"); // Fevereiro 2026
  
  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-ranking'],
    queryFn: () => base44.entities.Agendamento.list(),
    initialData: [],
  });

  // Calcular métricas
  const calcularMetricas = () => {
    const vendedoresMap = {};
    let faturamentoTotal = 0;
    let vendasTotais = 0;
    
    agendamentos
      .filter(ag => {
        if (!ag.data_pagamento || !ag.vendedor_id || !ag.vendedor_nome) return false;
        const dataPagamento = ag.data_pagamento.substring(0, 7);
        return dataPagamento === mesAno;
      })
      .forEach(ag => {
        if (!vendedoresMap[ag.vendedor_id]) {
          vendedoresMap[ag.vendedor_id] = {
            nome: ag.vendedor_nome,
            vendas: 0,
            valorTotal: 0
          };
        }
        vendedoresMap[ag.vendedor_id].vendas++;
        vendedoresMap[ag.vendedor_id].valorTotal += (ag.valor_combinado || 0);
        faturamentoTotal += (ag.valor_combinado || 0);
        vendasTotais++;
      });

    const ranking = Object.values(vendedoresMap)
      .sort((a, b) => b.valorTotal - a.valorTotal);

    const ticketMedio = vendasTotais > 0 ? faturamentoTotal / vendasTotais : 0;

    return {
      ranking,
      faturamentoTotal,
      vendasTotais,
      ticketMedio
    };
  };

  const { ranking, faturamentoTotal, vendasTotais, ticketMedio } = calcularMetricas();

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const metaFaturamento = 1279433; // Meta fixa
  const percentualMeta = (faturamentoTotal / metaFaturamento) * 100;

  // Dados para gráfico de pizza
  const dadosGrafico = [
    { name: 'Atingido', value: faturamentoTotal },
    { name: 'Restante', value: Math.max(0, metaFaturamento - faturamentoTotal) }
  ];

  const getPosicaoStyle = (index) => {
    if (index === 0) return { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700', emoji: '🏆' };
    if (index === 1) return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700', emoji: '🥈' };
    if (index === 2) return { bg: 'bg-amber-100', border: 'border-amber-600', text: 'text-amber-700', emoji: '🥉' };
    return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', emoji: '🏅' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Agenda")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🎮 Ranking de Vendedores</h1>
                <p className="text-sm text-gray-500">Fevereiro/2026 - Por data de pagamento</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Faturamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">{formatarValor(faturamentoTotal)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Qtd de Vendas Realizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">{vendasTotais}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-pink-600 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-pink-700">{formatarValor(ticketMedio)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pódio e Gráfico */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pódio */}
          <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Top 3 - Pódio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-center gap-4 h-80">
                {ranking.slice(0, 3).map((vendedor, index) => {
                  const posicao = getPosicaoStyle(index);
                  const alturas = ['h-48', 'h-40', 'h-32'];
                  const ordemVisual = [1, 0, 2]; // 2º, 1º, 3º
                  const indexReal = ordemVisual.indexOf(index);
                  
                  return (
                    <div key={vendedor.nome} className="flex flex-col items-center" style={{ order: indexReal }}>
                      <div className={`${posicao.bg} ${posicao.border} border-4 rounded-2xl p-4 ${alturas[index]} w-32 flex flex-col items-center justify-between shadow-lg hover:scale-105 transition-transform`}>
                        <div className="text-center">
                          <div className="text-4xl mb-2">{posicao.emoji}</div>
                          <div className={`text-xs font-bold ${posicao.text} mb-1`}>{index + 1}º Lugar</div>
                          <div className="font-bold text-sm text-gray-900 truncate w-full">{vendedor.nome}</div>
                        </div>
                        <div className="text-center mt-2">
                          <div className="text-xs text-gray-600">{vendedor.vendas} vendas</div>
                          <div className="text-sm font-bold text-green-600">{formatarValor(vendedor.valorTotal)}</div>
                        </div>
                      </div>
                      {index === 0 && (
                        <div className="mt-2 px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-md">
                          👑 CAMPEÃO
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Gráfico Faturamento x Meta */}
          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-600" />
                Faturamento x Meta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-gray-900">{formatarValor(faturamentoTotal)}</p>
                <p className="text-sm text-gray-600 mt-1">Meta: {formatarValor(metaFaturamento)}</p>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-4 rounded-full transition-all"
                      style={{ width: `${Math.min(100, percentualMeta)}%` }}
                    />
                  </div>
                  <p className="text-2xl font-bold text-green-600 mt-2">{percentualMeta.toFixed(1)}%</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={dadosGrafico}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                  <Tooltip formatter={(value) => formatarValor(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela Completa */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>📊 Tabela Completa - Todos os Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 font-bold text-gray-700">Rank</th>
                    <th className="text-left p-3 font-bold text-gray-700">Vendedor</th>
                    <th className="text-right p-3 font-bold text-gray-700">Faturamento</th>
                    <th className="text-right p-3 font-bold text-gray-700">Meta por Vendedor</th>
                    <th className="text-right p-3 font-bold text-gray-700">Vendas</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((vendedor, index) => {
                    const posicao = getPosicaoStyle(index);
                    const metaPorVendedor = metaFaturamento / ranking.length;
                    
                    return (
                      <tr 
                        key={vendedor.nome}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${index < 3 ? posicao.bg : ''}`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{posicao.emoji}</span>
                            <span className={`font-bold ${posicao.text}`}>{index + 1}</span>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-gray-900">{vendedor.nome}</td>
                        <td className="p-3 text-right font-bold text-green-600">{formatarValor(vendedor.valorTotal)}</td>
                        <td className="p-3 text-right text-gray-600">{formatarValor(metaPorVendedor)}</td>
                        <td className="p-3 text-right font-medium text-blue-600">{vendedor.vendas}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}