import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, TrendingUp, Users, Clock, Target, FileText, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RelatoriosCRMPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const [filtroUnidade, setFiltroUnidade] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [periodoRapido, setPeriodoRapido] = useState("mes_atual");

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  // Aplicar período rápido
  useEffect(() => {
    const hoje = new Date();
    let inicio, fim;

    switch (periodoRapido) {
      case "mes_atual":
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        break;
      case "ano_atual":
        inicio = startOfYear(hoje);
        fim = endOfYear(hoje);
        break;
      case "ultimos_30":
        inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - 30);
        fim = hoje;
        break;
      case "ultimos_90":
        inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - 90);
        fim = hoje;
        break;
      default:
        return;
    }

    setDataInicio(format(inicio, "yyyy-MM-dd"));
    setDataFim(format(fim, "yyyy-MM-dd"));
  }, [periodoRapido]);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list("-created_date"),
    initialData: [],
  });

  const { data: interacoes = [] } = useQuery({
    queryKey: ['interacoes'],
    queryFn: () => base44.entities.InteracaoLead.list("-data_interacao"),
    initialData: [],
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  // Filtrar leads
  const leadsFiltrados = leads.filter(lead => {
    const dataLead = new Date(lead.created_date);
    const matchData = (!dataInicio || dataLead >= new Date(dataInicio)) && 
                      (!dataFim || dataLead <= new Date(dataFim));
    const matchVendedor = filtroVendedor === "todos" || lead.vendedor_id === filtroVendedor;
    const matchUnidade = filtroUnidade === "todas" || lead.unidade_id === filtroUnidade;
    const matchStatus = filtroStatus === "todos" || lead.status === filtroStatus;

    return matchData && matchVendedor && matchUnidade && matchStatus;
  });

  // Métricas gerais
  const totalLeads = leadsFiltrados.filter(l => l.status === "lead").length;
  const totalGeralRegistros = leadsFiltrados.length;
  const leadsConvertidos = leadsFiltrados.filter(l => l.convertido === true);
  const leadsFechados = leadsConvertidos.length;
  const leadsPerdidos = leadsFiltrados.filter(l => l.motivo_perda).length;
  const taxaConversao = totalGeralRegistros > 0 ? ((leadsFechados / totalGeralRegistros) * 100).toFixed(1) : 0;

  // Tempo médio de conversão para avulso ou plano terapêutico
  const leadsAvulsoOuPlano = leadsFiltrados.filter(l => 
    (l.status === "avulso" || l.status === "plano_terapeutico") && 
    l.data_entrada && 
    l.data_conversao
  );
  const tempoMedioAvulsoPlano = leadsAvulsoOuPlano.length > 0
    ? Math.round(
        leadsAvulsoOuPlano.reduce((acc, lead) => {
          const inicio = new Date(lead.data_entrada);
          const fim = new Date(lead.data_conversao);
          const dias = differenceInDays(fim, inicio);
          return acc + dias;
        }, 0) / leadsAvulsoOuPlano.length
      )
    : 0;

  // Percentual de renovações
  const totalRenovacoes = leadsFiltrados.filter(l => l.status === "renovacao").length;
  const percentualRenovacao = totalGeralRegistros > 0 ? ((totalRenovacoes / totalGeralRegistros) * 100).toFixed(1) : 0;

  // Taxa de conversão do dia (leads criados HOJE vs conversões HOJE - ignora filtros de período)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const leadsDoDia = leads.filter(l => {
    const dataLead = new Date(l.created_date);
    dataLead.setHours(0, 0, 0, 0);
    return dataLead.getTime() === hoje.getTime();
  });
  
  const conversoesDoDia = leads.filter(l => {
    if (!l.data_conversao) return false;
    const dataConv = new Date(l.data_conversao);
    dataConv.setHours(0, 0, 0, 0);
    return dataConv.getTime() === hoje.getTime();
  });
  
  const taxaConversaoDia = leadsDoDia.length > 0 
    ? ((conversoesDoDia.length / leadsDoDia.length) * 100).toFixed(1) 
    : 0;

  // Tempo médio de conversão (legado - mantido para compatibilidade)
  const leadsComDatas = leadsConvertidos.filter(l => l.data_conversao && l.data_primeiro_contato);
  const tempoMedioConversao = leadsComDatas.length > 0
    ? Math.round(
        leadsComDatas.reduce((acc, lead) => {
          const inicio = new Date(lead.data_primeiro_contato);
          const fim = new Date(lead.data_conversao);
          const dias = differenceInDays(fim, inicio);
          return acc + dias;
        }, 0) / leadsComDatas.length
      )
    : 0;

  // Dados para gráfico de status
  const dadosStatus = [
    { name: "Lead", value: leadsFiltrados.filter(l => l.status === "lead").length, color: "#10B981" },
    { name: "Avulso", value: leadsFiltrados.filter(l => l.status === "avulso").length, color: "#EAB308" },
    { name: "Plano Terapêutico", value: leadsFiltrados.filter(l => l.status === "plano_terapeutico").length, color: "#F59E0B" },
    { name: "Renovação", value: leadsFiltrados.filter(l => l.status === "renovacao").length, color: "#3B82F6" },
  ].filter(d => d.value > 0);

  // Dados para gráfico de vendedores
  const dadosVendedores = vendedores.map(v => {
    const leadsVendedor = leadsFiltrados.filter(l => l.vendedor_id === v.id);
    const convertidos = leadsVendedor.filter(l => l.convertido === true).length;
    const total = leadsVendedor.length;
    const taxa = total > 0 ? ((convertidos / total) * 100).toFixed(1) : 0;

    return {
      nome: v.nome,
      total: total,
      convertidos: convertidos,
      taxa: parseFloat(taxa),
    };
  }).filter(d => d.total > 0).sort((a, b) => b.taxa - a.taxa);

  // Dados para gráfico de origem
  const origens = ["instagram", "facebook", "google", "indicacao", "whatsapp", "telefone", "presencial", "outro"];
  const dadosOrigem = origens.map(origem => ({
    name: origem.charAt(0).toUpperCase() + origem.slice(1),
    value: leadsFiltrados.filter(l => l.origem === origem).length,
  })).filter(d => d.value > 0);

  // Dados para gráfico temporal
  const dadosTemporais = leadsFiltrados.reduce((acc, lead) => {
    const mes = format(new Date(lead.created_date), "MM/yyyy");
    const existing = acc.find(item => item.mes === mes);
    if (existing) {
      existing.total++;
      if (lead.convertido === true) existing.convertidos++;
      if (lead.motivo_perda) existing.perdidos++;
    } else {
      acc.push({
        mes,
        total: 1,
        convertidos: lead.convertido === true ? 1 : 0,
        perdidos: lead.motivo_perda ? 1 : 0,
      });
    }
    return acc;
  }, []).sort((a, b) => {
    const [mesA, anoA] = a.mes.split("/");
    const [mesB, anoB] = b.mes.split("/");
    return new Date(anoA, mesA - 1) - new Date(anoB, mesB - 1);
  });

  // Exportar CSV
  const exportarCSV = () => {
    const headers = [
      "Nome",
      "Telefone",
      "Email",
      "Status",
      "Origem",
      "Temperatura",
      "Vendedor",
      "Unidade",
      "Data Criação",
      "Data Conversão",
      "Tentativas Contato",
    ];

    const rows = leadsFiltrados.map(lead => [
      lead.nome,
      lead.telefone,
      lead.email || "",
      lead.status,
      lead.origem || "",
      lead.temperatura,
      lead.vendedor_nome,
      lead.unidade_nome,
      format(new Date(lead.created_date), "dd/MM/yyyy"),
      lead.data_conversao ? format(new Date(lead.data_conversao), "dd/MM/yyyy") : "",
      lead.tentativas_contato || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_crm_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  // Exportar PDF (via print)
  const exportarPDF = () => {
    window.print();
  };

  const isSuperior = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin";

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/Administrador")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                  Relatórios CRM
                </h1>
                <p className="text-gray-600 mt-1">Análise detalhada de leads e conversões</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportarCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" onClick={exportarPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Select value={periodoRapido} onValueChange={setPeriodoRapido}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes_atual">Mês Atual</SelectItem>
                <SelectItem value="ano_atual">Ano Atual</SelectItem>
                <SelectItem value="ultimos_30">Últimos 30 dias</SelectItem>
                <SelectItem value="ultimos_90">Últimos 90 dias</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <div>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setPeriodoRapido("personalizado");
                }}
                placeholder="Data Início"
              />
            </div>

            <div>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setPeriodoRapido("personalizado");
                }}
                placeholder="Data Fim"
              />
            </div>

            <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
              <SelectTrigger>
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Unidades</SelectItem>
                {unidades.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isSuperior && (
              <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Vendedores</SelectItem>
                  {vendedores.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="avulso">Avulso</SelectItem>
                <SelectItem value="plano_terapeutico">Plano Terapêutico</SelectItem>
                <SelectItem value="renovacao">Renovação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total de Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{totalLeads}</p>
              <p className="text-sm text-gray-500 mt-1">status: lead</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{taxaConversao}%</p>
              <p className="text-sm text-gray-500 mt-1">{leadsFechados} convertidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{tempoMedioConversao}</p>
              <p className="text-sm text-gray-500 mt-1">
                {leadsComDatas.length > 0 
                  ? `dias até conversão (${leadsComDatas.length} lead${leadsComDatas.length > 1 ? 's' : ''})`
                  : 'dias até conversão'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Taxa de Perda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {totalLeads > 0 ? ((leadsPerdidos / totalLeads) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-gray-500 mt-1">{leadsPerdidos} perdidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Novas Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Tempo Médio Avulso/Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-900">{tempoMedioAvulsoPlano}</p>
              <p className="text-sm text-purple-700 mt-1">
                dias até virar avulso/plano ({leadsAvulsoOuPlano.length} leads)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-indigo-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Taxa de Renovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-900">{percentualRenovacao}%</p>
              <p className="text-sm text-indigo-700 mt-1">
                {totalRenovacoes} renovações do total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-cyan-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Conversão Leads do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-cyan-900">{taxaConversaoDia}%</p>
              <p className="text-sm text-cyan-700 mt-1">
                {conversoesDoDia.length} conversões de {leadsDoDia.length} leads hoje
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Status */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Origem */}
          <Card>
            <CardHeader>
              <CardTitle>Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosOrigem}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Performance de Vendedores */}
        {isSuperior && dadosVendedores.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Performance dos Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosVendedores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total de Leads" fill="#3B82F6" />
                  <Bar dataKey="convertidos" name="Leads Convertidos" fill="#22C55E" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráfico Temporal */}
        {dadosTemporais.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Evolução Temporal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosTemporais}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="Total" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="convertidos" name="Convertidos" stroke="#22C55E" strokeWidth={2} />
                  <Line type="monotone" dataKey="perdidos" name="Perdidos" stroke="#EF4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}