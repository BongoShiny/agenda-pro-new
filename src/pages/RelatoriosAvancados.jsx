import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Download, BarChart3, PieChart, FileSpreadsheet, FileText } from "lucide-react";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function RelatoriosAvancadosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  // Filtros
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [profissionalFiltro, setProfissionalFiltro] = useState("todos");
  const [servicoFiltro, setServicoFiltro] = useState("todos");
  const [unidadeFiltro, setUnidadeFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        // APENAS ADMINISTRADORES podem acessar Relatórios Avançados
        const isAdmin = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin";
        if (!isAdmin) {
          navigate(createPageUrl("Agenda"));
        }
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();
  }, [navigate]);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-relatorios'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list("nome"),
    initialData: [],
  });

  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  // Filtrar unidades baseado no acesso do usuário - gerentes veem APENAS suas unidades
  const unidades = React.useMemo(() => {
    if (usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin") {
      return todasUnidades;
    }
    const unidadesAcesso = usuarioAtual?.unidades_acesso || [];
    return todasUnidades.filter(u => unidadesAcesso.includes(u.id));
  }, [todasUnidades, usuarioAtual]);

  // Filtrar agendamentos
  let agendamentosFiltrados = agendamentos
    .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
    .filter(ag => {
      const dataAg = ag.data;
      if (dataAg < dataInicio || dataAg > dataFim) return false;
      if (profissionalFiltro !== "todos" && ag.profissional_id !== profissionalFiltro) return false;
      if (servicoFiltro !== "todos" && ag.servico_id !== servicoFiltro) return false;
      if (unidadeFiltro !== "todos" && ag.unidade_id !== unidadeFiltro) return false;
      if (statusFiltro !== "todos" && ag.status !== statusFiltro) return false;
      return true;
    });

  // Filtrar por unidades de acesso para gerentes de unidade
  if (usuarioAtual?.cargo === "gerencia_unidades") {
    const unidadesAcesso = usuarioAtual?.unidades_acesso || [];
    agendamentosFiltrados = agendamentosFiltrados.filter(ag => unidadesAcesso.includes(ag.unidade_id));
  }

  // Dados para gráficos
  const dadosPorProfissional = profissionais.map(prof => ({
    nome: prof.nome,
    total: agendamentosFiltrados.filter(ag => ag.profissional_id === prof.id).length
  })).filter(d => d.total > 0);

  const dadosPorStatus = [
    { nome: "Agendado", valor: agendamentosFiltrados.filter(ag => ag.status === "agendado").length },
    { nome: "Confirmado", valor: agendamentosFiltrados.filter(ag => ag.status === "confirmado").length },
    { nome: "Concluído", valor: agendamentosFiltrados.filter(ag => ag.status === "concluido").length },
    { nome: "Cancelado", valor: agendamentosFiltrados.filter(ag => ag.status === "cancelado").length },
    { nome: "Ausência", valor: agendamentosFiltrados.filter(ag => ag.status === "ausencia").length },
  ].filter(d => d.valor > 0);

  const dadosPorUnidade = unidades.map(unidade => ({
    nome: unidade.nome,
    total: agendamentosFiltrados.filter(ag => ag.unidade_id === unidade.id).length
  })).filter(d => d.total > 0);

  const exportarExcel = () => {
    const dados = agendamentosFiltrados.map(ag => ({
      "Cliente": ag.cliente_nome,
      "Telefone": ag.cliente_telefone || "",
      "Profissional": ag.profissional_nome,
      "Serviço": ag.servico_nome,
      "Unidade": ag.unidade_nome,
      "Data": ag.data,
      "Horário": `${ag.hora_inicio} - ${ag.hora_fim}`,
      "Status": ag.status,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio_avancado_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportarPDF = () => {
    alert("Exportação em PDF estará disponível em breve!");
  };

  const aplicarPreset = (preset) => {
    const hoje = new Date();
    switch (preset) {
      case "mes_atual":
        setDataInicio(format(startOfMonth(hoje), "yyyy-MM-dd"));
        setDataFim(format(endOfMonth(hoje), "yyyy-MM-dd"));
        break;
      case "mes_passado":
        const mesPassado = subMonths(hoje, 1);
        setDataInicio(format(startOfMonth(mesPassado), "yyyy-MM-dd"));
        setDataFim(format(endOfMonth(mesPassado), "yyyy-MM-dd"));
        break;
      case "ultimos_30":
        setDataInicio(format(subMonths(hoje, 1), "yyyy-MM-dd"));
        setDataFim(format(hoje, "yyyy-MM-dd"));
        break;
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Administrador")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Relatórios Avançados</h1>
                <p className="text-sm text-gray-500">{agendamentosFiltrados.length} agendamentos no período</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            <Button onClick={exportarPDF} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros Avançados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => aplicarPreset("mes_atual")} variant="outline" size="sm">
                  Mês Atual
                </Button>
                <Button onClick={() => aplicarPreset("mes_passado")} variant="outline" size="sm">
                  Mês Passado
                </Button>
                <Button onClick={() => aplicarPreset("ultimos_30")} variant="outline" size="sm">
                  Últimos 30 Dias
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Data Fim</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Profissional</label>
                  <Select value={profissionalFiltro} onValueChange={setProfissionalFiltro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {profissionais.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Serviço</label>
                  <Select value={servicoFiltro} onValueChange={setServicoFiltro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {servicos.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Unidade</label>
                  <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {unidades.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                      <SelectItem value="ausencia">Ausência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{agendamentosFiltrados.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {agendamentosFiltrados.filter(ag => ag.status === "concluido").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cancelados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {agendamentosFiltrados.filter(ag => ag.status === "cancelado").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taxa de Conclusão</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {agendamentosFiltrados.length > 0 
                  ? Math.round((agendamentosFiltrados.filter(ag => ag.status === "concluido").length / agendamentosFiltrados.length) * 100)
                  : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos por Profissional</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosPorProfissional}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#3b82f6" name="Agendamentos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={dadosPorStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ nome, valor }) => `${nome}: ${valor}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="valor"
                  >
                    {dadosPorStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ocupação por Unidade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosPorUnidade}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#10b981" name="Agendamentos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo Estatístico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium">Agendados</span>
                  <span className="text-xl font-bold text-blue-600">
                    {agendamentosFiltrados.filter(ag => ag.status === "agendado").length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Confirmados</span>
                  <span className="text-xl font-bold text-green-600">
                    {agendamentosFiltrados.filter(ag => ag.status === "confirmado").length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium">Ausências</span>
                  <span className="text-xl font-bold text-purple-600">
                    {agendamentosFiltrados.filter(ag => ag.status === "ausencia").length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Taxa de Cancelamento</span>
                  <span className="text-xl font-bold text-gray-600">
                    {agendamentosFiltrados.length > 0 
                      ? Math.round((agendamentosFiltrados.filter(ag => ag.status === "cancelado").length / agendamentosFiltrados.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}