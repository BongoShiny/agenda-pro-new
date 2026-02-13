import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, Award, Calendar, Filter, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";

export default function AnaliseVendasPage() {
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [unidadeFiltro, setUnidadeFiltro] = useState("todas");
  const [vendedorFiltro, setVendedorFiltro] = useState("todos");

  const { data: usuarioAtual } = useQuery({
    queryKey: ['usuario-atual'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-vendas'],
    queryFn: () => base44.entities.Agendamento.list("-data_conversao"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-vendas'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-vendas'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  // Verificar acesso
  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin";
  const unidadesFiltradas = isAdmin ? unidades : unidades.filter(u => usuarioAtual?.unidades_acesso?.includes(u.id));

  // Filtrar vendas no período
  const vendasFiltradas = useMemo(() => {
    return agendamentos.filter(ag => {
      if (!ag.data_conversao || !ag.conversao_converteu) return false;
      if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") return false;
      if (ag.vendedor_nome?.toLowerCase() === "ponto" || !ag.vendedor_nome || ag.vendedor_nome === "-") return false;

      const dataConv = ag.data_conversao.substring(0, 10);
      if (dataConv < dataInicio || dataConv > dataFim) return false;

      if (unidadeFiltro !== "todas" && ag.unidade_id !== unidadeFiltro) return false;
      if (vendedorFiltro !== "todos" && ag.vendedor_id !== vendedorFiltro) return false;

      return true;
    });
  }, [agendamentos, dataInicio, dataFim, unidadeFiltro, vendedorFiltro]);

  // Calcular KPIs
  const totalVendas = vendasFiltradas.length;
  const valorTotal = vendasFiltradas.reduce((acc, ag) => acc + (ag.valor_combinado || 0), 0);
  const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
  const totalFechou = vendasFiltradas.filter(ag => ag.conversao_tipo === "fechou" || !ag.conversao_tipo).length;
  const totalRenovou = vendasFiltradas.filter(ag => ag.conversao_tipo === "renovou").length;

  // Ranking de Vendedores
  const rankingVendedores = useMemo(() => {
    const vendedoresMap = {};
    
    vendasFiltradas.forEach(ag => {
      const vendedorNome = ag.vendedor_nome || "Sem Vendedor";
      const vendedorId = ag.vendedor_id || "sem_id";
      
      if (!vendedoresMap[vendedorId]) {
        vendedoresMap[vendedorId] = {
          nome: vendedorNome,
          totalVendas: 0,
          valorTotal: 0,
          fechou: 0,
          renovou: 0
        };
      }
      
      vendedoresMap[vendedorId].totalVendas++;
      vendedoresMap[vendedorId].valorTotal += ag.valor_combinado || 0;
      
      if (ag.conversao_tipo === "fechou" || !ag.conversao_tipo) {
        vendedoresMap[vendedorId].fechou++;
      } else if (ag.conversao_tipo === "renovou") {
        vendedoresMap[vendedorId].renovou++;
      }
    });
    
    return Object.values(vendedoresMap)
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 10);
  }, [vendasFiltradas]);

  // Ranking de Unidades
  const rankingUnidades = useMemo(() => {
    const unidadesMap = {};
    
    vendasFiltradas.forEach(ag => {
      const unidadeNome = ag.unidade_nome || "Sem Unidade";
      const unidadeId = ag.unidade_id || "sem_id";
      
      if (!unidadesMap[unidadeId]) {
        unidadesMap[unidadeId] = {
          nome: unidadeNome,
          totalVendas: 0,
          valorTotal: 0
        };
      }
      
      unidadesMap[unidadeId].totalVendas++;
      unidadesMap[unidadeId].valorTotal += ag.valor_combinado || 0;
    });
    
    return Object.values(unidadesMap)
      .sort((a, b) => b.valorTotal - a.valorTotal);
  }, [vendasFiltradas]);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const exportarCSV = () => {
    const headers = ["Data", "Hora", "Cliente", "Telefone", "Unidade", "Vendedor", "Profissional", "Tipo", "Valor"];
    const rows = vendasFiltradas.map(ag => [
      ag.data_conversao?.substring(0, 10) || "",
      ag.hora_inicio || "",
      ag.cliente_nome || "",
      ag.cliente_telefone || "",
      ag.unidade_nome || "",
      ag.vendedor_nome || "",
      ag.conversao_profissional_nome || ag.profissional_nome || "",
      ag.conversao_tipo === "renovou" ? "Renovou" : "Fechou",
      ag.valor_combinado || 0
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vendas_${dataInicio}_${dataFim}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Administrador")}>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Análise de Vendas</h1>
                  <p className="text-sm text-gray-500">Métricas e performance de vendas</p>
                </div>
              </div>
            </div>
            <Button onClick={exportarCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filtros */}
        <Card className="shadow-lg border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Filter className="w-5 h-5" />
              Filtros de Período
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Início
                </Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Fim
                </Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Unidades</SelectItem>
                    {unidadesFiltradas.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={vendedorFiltro} onValueChange={setVendedorFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Vendedores</SelectItem>
                    {vendedores.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setDataInicio(hoje);
                    setDataFim(hoje);
                    setUnidadeFiltro("todas");
                    setVendedorFiltro("todos");
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 mb-1">TOTAL DE VENDAS</p>
                  <p className="text-3xl font-bold text-blue-900">{totalVendas}</p>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">VALOR TOTAL</p>
                  <p className="text-2xl font-bold text-green-900">{formatarMoeda(valorTotal)}</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 mb-1">TICKET MÉDIO</p>
                  <p className="text-2xl font-bold text-purple-900">{formatarMoeda(ticketMedio)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 mb-1">FECHOU PLANO</p>
                  <p className="text-3xl font-bold text-emerald-900">{totalFechou}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-sky-600 mb-1">RENOVOU PLANO</p>
                  <p className="text-3xl font-bold text-sky-900">{totalRenovou}</p>
                </div>
                <div className="w-12 h-12 bg-sky-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking Vendedores */}
          <Card className="shadow-lg border-blue-100">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Award className="w-5 h-5" />
                🏆 Ranking de Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {rankingVendedores.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhuma venda no período</p>
                ) : (
                  rankingVendedores.map((vendedor, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                        idx === 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300' :
                        idx === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300' :
                        idx === 2 ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300' :
                        'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-gray-400 text-gray-900' :
                            idx === 2 ? 'bg-orange-400 text-orange-900' :
                            'bg-blue-100 text-blue-900'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{vendedor.nome}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-xs text-gray-600">
                                {vendedor.totalVendas} vendas
                              </p>
                              {vendedor.fechou > 0 && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                                  {vendedor.fechou} fechou
                                </span>
                              )}
                              {vendedor.renovou > 0 && (
                                <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded">
                                  {vendedor.renovou} renovou
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            {formatarMoeda(vendedor.valorTotal)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Média: {formatarMoeda(vendedor.valorTotal / vendedor.totalVendas)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ranking Unidades */}
          <Card className="shadow-lg border-purple-100">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <TrendingUp className="w-5 h-5" />
                📍 Ranking de Unidades
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {rankingUnidades.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhuma venda no período</p>
                ) : (
                  rankingUnidades.map((unidade, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                        idx === 0 ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300' :
                        'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-900 text-lg">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{unidade.nome}</p>
                            <p className="text-xs text-gray-600">{unidade.totalVendas} vendas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            {formatarMoeda(unidade.valorTotal)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Média: {formatarMoeda(unidade.valorTotal / unidade.totalVendas)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela Detalhada */}
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-900">
                <ShoppingCart className="w-5 h-5" />
                Detalhamento de Vendas ({vendasFiltradas.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-3 font-semibold text-gray-700">Data/Hora</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Cliente</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Telefone</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Unidade</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Vendedor</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Profissional</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Tipo</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-500">
                        Nenhuma venda encontrada no período selecionado
                      </td>
                    </tr>
                  ) : (
                    vendasFiltradas.map((ag) => (
                      <tr key={ag.id} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                        <td className="p-3">
                          <div className="text-gray-900">{ag.data_conversao?.substring(0, 10)}</div>
                          <div className="text-xs text-gray-500">{ag.hora_inicio}</div>
                        </td>
                        <td className="p-3 font-medium text-gray-900">{ag.cliente_nome}</td>
                        <td className="p-3 text-gray-600">{ag.cliente_telefone}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {ag.unidade_nome}
                          </span>
                        </td>
                        <td className="p-3 text-gray-900">{ag.vendedor_nome || "-"}</td>
                        <td className="p-3 text-gray-600">{ag.conversao_profissional_nome || ag.profissional_nome}</td>
                        <td className="p-3">
                          {ag.conversao_tipo === "renovou" ? (
                            <span className="px-2 py-1 bg-sky-100 text-sky-800 rounded text-xs">Renovou</span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs">Fechou</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-green-600">
                          {formatarMoeda(ag.valor_combinado || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}