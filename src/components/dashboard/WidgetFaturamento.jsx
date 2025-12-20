import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function WidgetFaturamento({ agendamentos, periodo = "dia" }) {
  const hoje = new Date();
  let dataInicio;

  switch (periodo) {
    case "semana":
      dataInicio = format(startOfWeek(hoje, { locale: ptBR }), "yyyy-MM-dd");
      break;
    case "mes":
      dataInicio = format(startOfMonth(hoje), "yyyy-MM-dd");
      break;
    default: // dia
      dataInicio = format(startOfDay(hoje), "yyyy-MM-dd");
  }

  const agendamentosPeriodo = agendamentos.filter(ag => {
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
    return ag.data >= dataInicio;
  });

  const totalCombinado = agendamentosPeriodo.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
  const totalPago = agendamentosPeriodo.reduce((sum, ag) => 
    sum + (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0), 0
  );
  const totalAReceber = agendamentosPeriodo.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);

  const periodoLabel = {
    dia: "Hoje",
    semana: "Esta Semana",
    mes: "Este Mês"
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Faturamento - {periodoLabel[periodo]}</CardTitle>
        <DollarSign className="h-4 w-4 text-emerald-600" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">Valor Combinado</p>
            <p className="text-xl font-bold text-blue-600">{formatarMoeda(totalCombinado)}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                Recebido
              </p>
              <p className="text-lg font-semibold text-emerald-600">{formatarMoeda(totalPago)}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-orange-600" />
                A Receber
              </p>
              <p className="text-lg font-semibold text-orange-600">{formatarMoeda(totalAReceber)}</p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">
              {agendamentosPeriodo.length} agendamento{agendamentosPeriodo.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}