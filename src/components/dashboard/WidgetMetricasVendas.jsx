import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, TrendingUp, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function WidgetMetricasVendas({ agendamentos, dataInicio, dataFim }) {
  // Filtrar vendas baseado em created_date (data de criação)
  const vendasPeriodo = agendamentos.filter(ag => {
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
    if (!ag.created_date) return false;
    
    const dataCriacao = ag.created_date.substring(0, 10); // YYYY-MM-DD
    return dataCriacao >= dataInicio && dataCriacao <= dataFim;
  });

  // Agrupar vendas por unidade
  const vendasPorUnidade = {};
  vendasPeriodo.forEach(ag => {
    const unidade = ag.unidade_nome || "Sem Unidade";
    if (!vendasPorUnidade[unidade]) {
      vendasPorUnidade[unidade] = {
        vendas: [],
        total: 0
      };
    }
    vendasPorUnidade[unidade].vendas.push(ag);
    vendasPorUnidade[unidade].total += ag.valor_combinado || 0;
  });

  const formatarPeriodo = () => {
    if (dataInicio === dataFim) {
      return format(new Date(dataInicio + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
    }
    return `${format(new Date(dataInicio + 'T12:00:00'), "dd/MM", { locale: ptBR })} - ${format(new Date(dataFim + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}`;
  };

  const totalVendas = vendasPeriodo.length;
  const totalValor = vendasPeriodo.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg font-semibold">Métricas de Vendas - {formatarPeriodo()}</CardTitle>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total de Vendas</p>
            <p className="text-2xl font-bold text-blue-600">{totalVendas}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Valor Total</p>
            <p className="text-2xl font-bold text-emerald-600">{formatarMoeda(totalValor)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(vendasPorUnidade).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma venda registrada neste período</p>
          </div>
        ) : (
          Object.entries(vendasPorUnidade).map(([unidade, dados]) => (
            <div key={unidade} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{unidade}</h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {dados.vendas.length} venda{dados.vendas.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatarMoeda(dados.total)}
                  </span>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora Criação</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Data Agendamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">A Receber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.vendas
                    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                    .map((venda) => {
                      const totalPago = (venda.sinal || 0) + (venda.recebimento_2 || 0) + (venda.final_pagamento || 0);
                      return (
                        <TableRow key={venda.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {format(new Date(venda.created_date), "dd/MM/yyyy", { locale: ptBR })}
                              <Clock className="w-3 h-3 text-gray-400 ml-1" />
                              {format(new Date(venda.created_date), "HH:mm", { locale: ptBR })}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{venda.cliente_nome}</TableCell>
                          <TableCell>
                            <span className="text-blue-600 font-medium">
                              {venda.vendedor_nome || "-"}
                            </span>
                          </TableCell>
                          <TableCell>{venda.profissional_nome}</TableCell>
                          <TableCell>
                            {venda.data ? format(new Date(venda.data + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatarMoeda(venda.valor_combinado)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {formatarMoeda(totalPago)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatarMoeda(venda.falta_quanto)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}