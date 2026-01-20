import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function RelatorioVendedorDia({ agendamentos, dataInicio, dataFim }) {
  // Filtrar apenas agendamentos com vendedor no período
  const agendamentosComVendedor = agendamentos.filter(ag => {
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") return false;
    if (!ag.vendedor_id || !ag.vendedor_nome) return false;
    
    const dataAg = ag.data;
    if (dataAg < dataInicio || dataAg > dataFim) return false;
    
    return true;
  });

  // Agrupar por vendedor
  const porVendedor = {};
  agendamentosComVendedor.forEach(ag => {
    const vendedorNome = ag.vendedor_nome || "Sem Vendedor";
    if (!porVendedor[vendedorNome]) {
      porVendedor[vendedorNome] = {
        nome: vendedorNome,
        quantidade: 0,
        totalCombinado: 0,
        totalPago: 0,
        totalAReceber: 0,
        agendamentos: []
      };
    }
    const totalPago = (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
    porVendedor[vendedorNome].quantidade += 1;
    porVendedor[vendedorNome].totalCombinado += ag.valor_combinado || 0;
    porVendedor[vendedorNome].totalPago += totalPago;
    porVendedor[vendedorNome].totalAReceber += ag.falta_quanto || 0;
    porVendedor[vendedorNome].agendamentos.push(ag);
  });

  const listaVendedores = Object.values(porVendedor).sort((a, b) => b.totalPago - a.totalPago);

  // Totais gerais
  const totalQuantidade = Object.values(porVendedor).reduce((sum, v) => sum + v.quantidade, 0);
  const totalCombinado = Object.values(porVendedor).reduce((sum, v) => sum + v.totalCombinado, 0);
  const totalPago = Object.values(porVendedor).reduce((sum, v) => sum + v.totalPago, 0);
  const totalAReceber = Object.values(porVendedor).reduce((sum, v) => sum + v.totalAReceber, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📊 Relatório do Dia por Vendedor</span>
          <span className="text-sm font-normal text-gray-500">
            {dataInicio === dataFim 
              ? format(criarDataPura(dataInicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : `${format(criarDataPura(dataInicio), "dd/MM/yyyy")} - ${format(criarDataPura(dataFim), "dd/MM/yyyy")}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 mb-1">Agendamentos</p>
            <p className="text-2xl font-bold text-blue-700">{totalQuantidade}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <p className="text-xs text-purple-600 mb-1">Valor Combinado</p>
            <p className="text-lg font-bold text-purple-700">{formatarMoeda(totalCombinado)}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
            <p className="text-xs text-emerald-600 mb-1">Total Recebido</p>
            <p className="text-lg font-bold text-emerald-700">{formatarMoeda(totalPago)}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <p className="text-xs text-orange-600 mb-1">A Receber</p>
            <p className="text-lg font-bold text-orange-700">{formatarMoeda(totalAReceber)}</p>
          </div>
        </div>

        {/* Tabela de Vendedores */}
        {listaVendedores.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Vlr. Combinado</TableHead>
                  <TableHead className="text-right">Total Recebido</TableHead>
                  <TableHead className="text-right">A Receber</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listaVendedores.map((vendedor, idx) => {
                  const percentual = totalCombinado > 0 ? ((vendedor.totalPago / totalCombinado) * 100).toFixed(1) : "0";
                  return (
                    <TableRow key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                      <TableCell className="font-medium">{vendedor.nome}</TableCell>
                      <TableCell className="text-right">{vendedor.quantidade}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(vendedor.totalCombinado)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold">{formatarMoeda(vendedor.totalPago)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatarMoeda(vendedor.totalAReceber)}</TableCell>
                      <TableCell className="text-right text-blue-600 font-semibold">{percentual}%</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-yellow-50 font-bold">
                  <TableCell>TOTAIS</TableCell>
                  <TableCell className="text-right">{totalQuantidade}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(totalCombinado)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatarMoeda(totalPago)}</TableCell>
                  <TableCell className="text-right text-orange-700">{formatarMoeda(totalAReceber)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="font-medium">Nenhum agendamento com vendedor neste período</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}