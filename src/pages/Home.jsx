import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  Settings,
  Eye,
  EyeOff,
  FileText
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import WidgetFaturamento from "../components/dashboard/WidgetFaturamento";
import WidgetProximosAgendamentos from "../components/dashboard/WidgetProximosAgendamentos";
import WidgetTarefasPendentes from "../components/dashboard/WidgetTarefasPendentes";
import WidgetPerformanceVendedores from "../components/dashboard/WidgetPerformanceVendedores";
import WidgetContasReceber from "../components/dashboard/WidgetContasReceber";

export default function HomePage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [periodoFaturamento, setPeriodoFaturamento] = useState("dia");
  
  // Estado de widgets visíveis (salvo no localStorage)
  const [widgetsVisiveis, setWidgetsVisiveis] = useState(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    return saved ? JSON.parse(saved) : {
      faturamento: true,
      proximosAgendamentos: true,
      tarefasPendentes: true,
      performanceVendedores: true,
      contasReceber: true
    };
  });

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();
  }, []);

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

  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin";
  const isGerencia = usuarioAtual?.cargo === "gerencia_unidades";

  const widgets = [
    { id: 'faturamento', label: 'Faturamento', component: WidgetFaturamento },
    { id: 'proximosAgendamentos', label: 'Próximos Agendamentos', component: WidgetProximosAgendamentos },
    { id: 'tarefasPendentes', label: 'Tarefas Pendentes', component: WidgetTarefasPendentes },
    { id: 'performanceVendedores', label: 'Performance de Vendedores', component: WidgetPerformanceVendedores },
    { id: 'contasReceber', label: 'Contas a Receber', component: WidgetContasReceber }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Bem-vindo, {usuarioAtual?.full_name}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link to={createPageUrl("Agenda")}>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Ir para Agenda
              </Button>
            </Link>
            {(isAdmin || isGerencia) && (
              <Link to={createPageUrl("Administrador")}>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Administração
                </Button>
              </Link>
            )}
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Período do Faturamento:</span>
                  <Select value={periodoFaturamento} onValueChange={setPeriodoFaturamento}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dia">Hoje</SelectItem>
                      <SelectItem value="semana">Esta Semana</SelectItem>
                      <SelectItem value="mes">Este Mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grid de Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgetsVisiveis.faturamento && (
            <WidgetFaturamento agendamentos={agendamentos} periodo={periodoFaturamento} />
          )}
          
          {widgetsVisiveis.proximosAgendamentos && (
            <WidgetProximosAgendamentos agendamentos={agendamentos} />
          )}
          
          {widgetsVisiveis.tarefasPendentes && (
            <WidgetTarefasPendentes agendamentos={agendamentos} />
          )}
          
          {widgetsVisiveis.performanceVendedores && (
            <WidgetPerformanceVendedores agendamentos={agendamentos} />
          )}
          
          {widgetsVisiveis.contasReceber && (
            <WidgetContasReceber agendamentos={agendamentos} />
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