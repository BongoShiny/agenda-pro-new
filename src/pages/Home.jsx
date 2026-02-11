import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { IPRedirectComponent } from "@/components/IPDetection";
import { format } from "date-fns";
import { 
  LayoutDashboard, 
  Calendar, 
  Settings,
  Eye,
  EyeOff,
  FileText,
  ArrowLeft,
  Edit3
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import WidgetFaturamento from "../components/dashboard/WidgetFaturamento";
import DialogEditarAnotacoes from "../components/DialogEditarAnotacoes";
import WidgetProximosAgendamentos from "../components/dashboard/WidgetProximosAgendamentos";
import WidgetTarefasPendentes from "../components/dashboard/WidgetTarefasPendentes";
import WidgetPerformanceVendedores from "../components/dashboard/WidgetPerformanceVendedores";
import WidgetContasReceber from "../components/dashboard/WidgetContasReceber";
import WidgetMetricasVendas from "../components/dashboard/WidgetMetricasVendas";

export default function HomePage() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modoEditarAnotacoes, setModoEditarAnotacoes] = useState(null);
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
      metricasVendas: true
    };
  });

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        // Verificar se é superior/admin/métricas
        const isSuperior = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin" || user?.cargo === "gerencia_unidades" || user?.cargo === "metricas";
        if (!isSuperior) {
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

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-home'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  const queryClient = useQueryClient();

  const atualizarAgendamentoMutation = useMutation({
    mutationFn: async ({ id, dados }) => {
      const resultado = await base44.entities.Agendamento.update(id, dados);
      
      await base44.entities.LogAcao.create({
        tipo: "editou_dados_relatorio",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Editou dados do agendamento: ${dados.cliente_nome}`,
        entidade_tipo: "Agendamento",
        entidade_id: id,
        dados_novos: JSON.stringify(resultado)
      });
      
      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-dashboard'] });
    },
  });

  const handleSalvarAnotacoes = async (agendamentoId, dadosNovos) => {
    try {
      await atualizarAgendamentoMutation.mutateAsync({
        id: agendamentoId,
        dados: dadosNovos
      });
      setModoEditarAnotacoes(null);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar: " + error.message);
    }
  };

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
           <WidgetMetricasVendas 
             agendamentos={agendamentos} 
             dataInicio={dataInicioVendas} 
             dataFim={dataFimVendas}
             onEditarAnotacoes={(agId) => setModoEditarAnotacoes(agId)}
           />
         )}

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

          {/* Dialog Editar Anotações */}
           <DialogEditarAnotacoes
           aberto={!!modoEditarAnotacoes}
           agendamento={agendamentos.find(a => a.id === modoEditarAnotacoes)}
           vendedores={vendedores}
           onClose={() => setModoEditarAnotacoes(null)}
           onSalvar={(dados) => {
             handleSalvarAnotacoes(modoEditarAnotacoes, dados);
           }}
           usuarioAtual={usuarioAtual}
           />
          </div>
          </div>
          );
          }