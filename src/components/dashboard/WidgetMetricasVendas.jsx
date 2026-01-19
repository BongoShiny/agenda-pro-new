import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, TrendingUp, Calendar, Clock, Image as ImageIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [unidadeSelecionada, setUnidadeSelecionada] = useState("todas");
  const [vendedorSelecionado, setVendedorSelecionado] = useState("todos");

  // Filtrar vendas baseado em created_date (data de criação) e que tenham vendedor
  const vendasPeriodo = agendamentos.filter(ag => {
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
    if (!ag.created_date) return false;
    if (!ag.vendedor_id && !ag.vendedor_nome) return false; // Apenas com vendedor
    
    const dataCriacao = ag.created_date.substring(0, 10); // YYYY-MM-DD
    return dataCriacao >= dataInicio && dataCriacao <= dataFim;
  });

  // Obter lista única de unidades e vendedores
  const unidadesUnicas = [...new Set(vendasPeriodo.map(ag => ag.unidade_nome || "Sem Unidade"))];
  const vendedoresUnicos = [...new Set(vendasPeriodo.map(ag => ag.vendedor_nome || "Sem Vendedor"))];

  // Filtrar vendas pela unidade e vendedor selecionados
  const vendasFiltradas = vendasPeriodo.filter(ag => {
    const unidadeMatch = unidadeSelecionada === "todas" || (ag.unidade_nome || "Sem Unidade") === unidadeSelecionada;
    const vendedorMatch = vendedorSelecionado === "todos" || (ag.vendedor_nome || "Sem Vendedor") === vendedorSelecionado;
    return unidadeMatch && vendedorMatch;
  });

  const formatarPeriodo = () => {
    if (dataInicio === dataFim) {
      return format(new Date(dataInicio + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
    }
    return `${format(new Date(dataInicio + 'T12:00:00'), "dd/MM", { locale: ptBR })} - ${format(new Date(dataFim + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}`;
  };

  const totalVendas = vendasFiltradas.length;
  const totalValor = vendasFiltradas.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);

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
      <CardContent>
        {vendasPeriodo.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma venda registrada neste período</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs value={unidadeSelecionada} onValueChange={setUnidadeSelecionada}>
              <TabsList className="mb-2">
                <TabsTrigger value="todas">Todas as Unidades</TabsTrigger>
                {unidadesUnicas.map(unidade => (
                  <TabsTrigger key={unidade} value={unidade}>
                    {unidade}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Tabs value={vendedorSelecionado} onValueChange={setVendedorSelecionado}>
              <TabsList className="mb-4">
                <TabsTrigger value="todos">Todos os Vendedores</TabsTrigger>
                {vendedoresUnicos.map(vendedor => (
                  <TabsTrigger key={vendedor} value={vendedor}>
                    {vendedor}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {unidadeSelecionada === "todas" ? "Todas as Unidades" : unidadeSelecionada}
                  {vendedorSelecionado !== "todos" && <span className="text-blue-600"> - {vendedorSelecionado}</span>}
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {totalVendas} venda{totalVendas !== 1 ? 's' : ''}
                  </span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatarMoeda(totalValor)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora Criação</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Data Agendamento</TableHead>
                      <TableHead>Pacote</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">A Receber</TableHead>
                      <TableHead>Comprovante 1</TableHead>
                      <TableHead>Observações Vendedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasFiltradas
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
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {venda.unidade_nome || "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-blue-600 font-medium">
                                {venda.vendedor_nome || "-"}
                              </span>
                            </TableCell>
                            <TableCell>{venda.profissional_nome}</TableCell>
                            <TableCell>
                              {venda.data ? format(new Date(venda.data + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                            </TableCell>
                            <TableCell>
                              {venda.cliente_pacote === "Sim" ? (
                                <div className="text-xs">
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded block mb-1">
                                    {venda.sessoes_feitas || 0}/{venda.quantas_sessoes || 0}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
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
                            <TableCell>
                              {venda.comprovante_1 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(venda.comprovante_1, '_blank')}
                                  className="h-8"
                                >
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  Ver
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {venda.observacoes_vendedores ? (
                                <div className="flex items-start gap-1">
                                  <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-gray-600 line-clamp-2">
                                    {venda.observacoes_vendedores}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}