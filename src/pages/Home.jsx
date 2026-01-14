import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { 
  LayoutDashboard, 
  Calendar, 
  Settings,
  Eye,
  EyeOff,
  FileText,
  ArrowLeft
} from "lucide-react";

import WidgetFaturamento from "../components/dashboard/WidgetFaturamento";
import WidgetProximosAgendamentos from "../components/dashboard/WidgetProximosAgendamentos";
import WidgetTarefasPendentes from "../components/dashboard/WidgetTarefasPendentes";
import WidgetPerformanceVendedores from "../components/dashboard/WidgetPerformanceVendedores";
import WidgetContasReceber from "../components/dashboard/WidgetContasReceber";
import WidgetMetricasVendas from "../components/dashboard/WidgetMetricasVendas";

export default function HomePage() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  
  // Período para Métricas de Vendas (separado do faturamento)
  const [dataInicioVendas, setDataInicioVendas] = useState(hoje);
  const [dataFimVendas, setDataFimVendas] = useState(hoje);
  
  // Estado de widgets visíveis (salvo no localStorage)
  const [widgetsVisiveis, setWidgetsVisiveis] = useState(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    return saved ? JSON.parse(saved) : {
      faturamento: true,
      proximosAgendamentos: true,
      tarefasPendentes: true,
      performanceVendedores: true,
      contasReceber: true,
      metricasVendas: true
    };
  });

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        // APENAS ADMINISTRADORES podem acessar o Dashboard de Análises
        const isAdmin = user?.cargo === "administrador" || user?.role === "admin";
        if (!isAdmin) {
          navigate(createPageUrl("Agenda"));
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();
  }, [navigate]);

  // Salvar preferências de widgets
  const toggleWidget = (widget) => {
    const novosWidgets = { ...widgetsVisiveis, [widget]: !widgetsVisiveis[widget] };
    setWidgetsVisiveis(novosWidgets);
    localStorage.setItem('dashboard_widgets', JSON.stringify(novosWidgets));
  };

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-dashboard'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades-dashboard'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  // Filtrar agendamentos por unidades de acesso para gerentes de unidade
  const agendamentosFiltrados = usuarioAtual?.cargo === "gerencia_unidades"
    ? agendamentos.filter(ag => {
        const unidadesAcesso = usuarioAtual?.unidades_acesso || [];
        return unidadesAcesso.includes(ag.unidade_id);
      })
    : agendamentos;

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin";
  const isGerencia = usuarioAtual?.cargo === "gerencia_unidades";

  const widgets = [
    { id: 'faturamento', label: 'Faturamento', component: WidgetFaturamento },
    { id: 'proximosAgendamentos', label: 'Próximos Agendamentos', component: WidgetProximosAgendamentos },
    { id: 'tarefasPendentes', label: 'Tarefas Pendentes', component: WidgetTarefasPendentes },
    { id: 'performanceVendedores', label: 'Performance de Vendedores', component: WidgetPerformanceVendedores },
    { id: 'contasReceber', label: 'Contas a Receber', component: WidgetContasReceber },
    { id: 'metricasVendas', label: 'Métricas de Vendas', component: WidgetMetricasVendas }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Administrador")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Análises</h1>
                <p className="text-sm text-gray-500">Visão geral e métricas do sistema</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link to={createPageUrl("Agenda")}>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Ir para Agenda
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Controles de Widgets */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Personalizar Widgets:</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {widgets.map(widget => (
                  <Button
                    key={widget.id}
                    variant={widgetsVisiveis[widget.id] ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWidget(widget.id)}
                    className="gap-2"
                  >
                    {widgetsVisiveis[widget.id] ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                    {widget.label}
                  </Button>
                ))}
              </div>

              {widgetsVisiveis.faturamento && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Período Faturamento:</span>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600">De:</Label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600">Até:</Label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>
              )}
              
              {widgetsVisiveis.metricasVendas && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Período Métricas de Vendas:</span>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600">De:</Label>
                    <Input
                      type="date"
                      value={dataInicioVendas}
                      onChange={(e) => setDataInicioVendas(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600">Até:</Label>
                    <Input
                      type="date"
                      value={dataFimVendas}
                      onChange={(e) => setDataFimVendas(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Métricas de Vendas - Topo */}
        {widgetsVisiveis.metricasVendas && (
          <WidgetMetricasVendas agendamentos={agendamentosFiltrados} dataInicio={dataInicioVendas} dataFim={dataFimVendas} />
        )}

        {/* Grid de Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgetsVisiveis.faturamento && (
            <WidgetFaturamento agendamentos={agendamentosFiltrados} dataInicio={dataInicio} dataFim={dataFim} />
          )}
          
          {widgetsVisiveis.proximosAgendamentos && (
            <WidgetProximosAgendamentos agendamentos={agendamentosFiltrados} />
          )}
          
          {widgetsVisiveis.tarefasPendentes && (
            <WidgetTarefasPendentes agendamentos={agendamentosFiltrados} />
          )}
          
          {widgetsVisiveis.performanceVendedores && (
            <WidgetPerformanceVendedores agendamentos={agendamentosFiltrados} />
          )}
          
          {widgetsVisiveis.contasReceber && (
            <WidgetContasReceber agendamentos={agendamentosFiltrados} />
          )}
        </div>

        {/* Atalhos Rápidos */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-sm font-medium text-gray-700">Atalhos Rápidos</h3>
              <div className="flex flex-wrap gap-2">
                <Link to={createPageUrl("Agenda")}>
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Agenda
                  </Button>
                </Link>
                <Link to={createPageUrl("RelatoriosFinanceiros")}>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Relatórios Financeiros
                  </Button>
                </Link>
                {(isAdmin || isGerencia) && (
                  <>
                    <Link to={createPageUrl("RelatoriosClientes")}>
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Relatórios de Clientes
                      </Button>
                    </Link>
                    <Link to={createPageUrl("HistoricoAgendamentos")}>
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Histórico
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}