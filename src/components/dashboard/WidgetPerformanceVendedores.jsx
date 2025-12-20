import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function WidgetPerformanceVendedores({ agendamentos }) {
  const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd");
  
  const agendamentosMes = agendamentos.filter(ag => {
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
    return ag.data >= inicioMes && ag.vendedor_id;
  });

  const performancePorVendedor = agendamentosMes.reduce((acc, ag) => {
    const vendedor = ag.vendedor_nome || "Sem Vendedor";
    if (!acc[vendedor]) {
      acc[vendedor] = {
        nome: vendedor,
        quantidade: 0,
        totalRecebido: 0,
        totalAReceber: 0
      };
    }
    acc[vendedor].quantidade += 1;
    acc[vendedor].totalRecebido += (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
    acc[vendedor].totalAReceber += (ag.falta_quanto || 0);
    return acc;
  }, {});

  const topVendedores = Object.values(performancePorVendedor)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Performance de Vendedores - Este Mês</CardTitle>
        <TrendingUp className="h-4 w-4 text-purple-600" />
      </CardHeader>
      <CardContent>
        {topVendedores.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum vendedor com vendas este mês</p>
        ) : (
          <div className="space-y-3">
            {topVendedores.map((vendedor, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                  {idx === 0 ? (
                    <Award className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <span className="text-xs font-bold text-purple-700">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{vendedor.nome}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{vendedor.quantidade} venda{vendedor.quantidade !== 1 ? 's' : ''}</span>
                    <span className="text-emerald-600 font-semibold">
                      {formatarMoeda(vendedor.totalRecebido)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <Link to={createPageUrl("RelatoriosFinanceiros")}>
              <Button variant="outline" className="w-full mt-2" size="sm">
                Ver Relatório Completo
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}