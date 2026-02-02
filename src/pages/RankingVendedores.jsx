import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Users, TrendingUp, Target, Edit2, Save, X, Plus, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function RankingVendedoresPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [metaGrupo, setMetaGrupo] = useState(1350);
  const [metaLeads, setMetaLeads] = useState(16850);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaTemp, setMetaTemp] = useState({ grupo: 1350, leads: 16850 });
  const [mesAno, setMesAno] = useState("2026-02");
  const [rankingAnterior, setRankingAnterior] = useState([]);
  const [top1Anterior, setTop1Anterior] = useState(null);
  const [viewMode, setViewMode] = useState("dia"); // "dia" ou "mes"
  const [diaEspecifico, setDiaEspecifico] = useState(new Date().toISOString().split('T')[0]);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [registroManualOpen, setRegistroManualOpen] = useState(false);
  const [registroManual, setRegistroManual] = useState({
    data: new Date().toISOString().split('T')[0],
    vendedor_id: "",
    unidade_id: "",
    leads: 0,
    vendas_avulso: 0,
    vendas_pacote: 0,
    pacote_8: 0,
    pacote_16: 0,
    pacote_24: 0,
    pacote_48: 0,
    observacoes: ""
  });
  
  const queryClient = useQueryClient();

  // Refs para áudio
  const audioMoneyRef = useRef(null);
  const audioLossRef = useRef(null);
  const audioOvertakeRef = useRef(null);
  const audioVictoryRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  // Inicializar áudios
  useEffect(() => {
    audioMoneyRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2067/2067-preview.mp3');
    audioLossRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3');
    audioOvertakeRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1998/1998-preview.mp3');
    audioVictoryRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
  }, []);

  const { data: agendamentos = [], refetch: refetchAgendamentos } = useQuery({
    queryKey: ['agendamentos-ranking'],
    queryFn: () => base44.entities.Agendamento.list(),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: leads = [], refetch: refetchLeads } = useQuery({
    queryKey: ['leads-ranking'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
    refetchInterval: 30000,
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

  const { data: registrosManuais = [] } = useQuery({
    queryKey: ['registros-manuais'],
    queryFn: () => base44.entities.RegistroManualVendas.list(),
    initialData: [],
    refetchInterval: 30000,
  });

  // Subscrição em tempo real para agendamentos
  useEffect(() => {
    const unsubscribe = base44.entities.Agendamento.subscribe((event) => {
      if (event.type === 'create') {
        // Nova venda - tocar som de dinheiro
        if (audioMoneyRef.current) {
          audioMoneyRef.current.play().catch(() => {});
        }
      } else if (event.type === 'delete') {
        // Venda removida - tocar som de perda
        if (audioLossRef.current) {
          audioLossRef.current.play().catch(() => {});
        }
      }
      refetchAgendamentos();
    });

    return () => unsubscribe();
  }, [refetchAgendamentos]);

  // Subscrição em tempo real para leads
  useEffect(() => {
    const unsubscribe = base44.entities.Lead.subscribe((event) => {
      refetchLeads();
    });

    return () => unsubscribe();
  }, [refetchLeads]);

  // Mutation para criar registro manual
  const createRegistroMutation = useMutation({
    mutationFn: (data) => base44.entities.RegistroManualVendas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-manuais'] });
      setRegistroManualOpen(false);
      setRegistroManual({
        data: new Date().toISOString().split('T')[0],
        vendedor_id: "",
        unidade_id: "",
        leads: 0,
        vendas_avulso: 0,
        vendas_pacote: 0,
        pacote_8: 0,
        pacote_16: 0,
        pacote_24: 0,
        pacote_48: 0,
        observacoes: ""
      });
    },
  });

  // Mutation para deletar registro manual
  const deleteRegistroMutation = useMutation({
    mutationFn: (id) => base44.entities.RegistroManualVendas.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-manuais'] });
    },
  });

  // Filtrar dados por período
  const inicioDia = viewMode === "dia" ? diaEspecifico : null;
  
  const mesFormatado = mesSelecionado.toString().padStart(2, '0');
  const inicioMes = `${anoSelecionado}-${mesFormatado}-01`;
  const fimMes = new Date(anoSelecionado, mesSelecionado, 0).toISOString().split('T')[0];

  // Excluir todo fevereiro de 2026 (considerar apenas a partir de 01/03/2026)
  const dataLimiteFevereiro = "2026-03-01";
  
  const agendamentosFiltrados = agendamentos.filter(ag => {
    // Excluir fevereiro 2026
    if (ag.data < dataLimiteFevereiro) return false;
    
    if (viewMode === "dia") {
      return ag.data === inicioDia && ag.status !== "cancelado" && ag.status !== "bloqueio";
    } else {
      return ag.data >= inicioMes && ag.data <= fimMes && ag.status !== "cancelado" && ag.status !== "bloqueio";
    }
  });

  const leadsFiltrados = leads.filter(lead => {
    const dataLead = lead.created_date ? lead.created_date.split('T')[0] : null;
    if (!dataLead) return false;
    
    // Excluir fevereiro 2026
    if (dataLead < dataLimiteFevereiro) return false;
    
    if (viewMode === "dia") {
      return dataLead === inicioDia;
    } else {
      return dataLead >= inicioMes && dataLead <= fimMes;
    }
  });

  const registrosManuaisFiltrados = registrosManuais.filter(reg => {
    // Excluir fevereiro 2026
    if (reg.data < dataLimiteFevereiro) return false;
    
    if (viewMode === "dia") {
      return reg.data === inicioDia;
    } else {
      return reg.data >= inicioMes && reg.data <= fimMes;
    }
  });

  // Calcular métricas por vendedor (automático + manual)
  const metricsVendedores = vendedores.map(vendedor => {
    const leadsVendedor = leadsFiltrados.filter(l => l.vendedor_id === vendedor.id);
    const agendamentosVendedor = agendamentosFiltrados.filter(ag => ag.vendedor_id === vendedor.id);
    const registrosVendedor = registrosManuaisFiltrados.filter(r => r.vendedor_id === vendedor.id);
    
    // Dados automáticos da agenda
    const vendasAvulsoAuto = agendamentosVendedor.filter(ag => 
      ag.tipo === "avulsa" || ag.tipo === "consulta"
    ).length;
    
    const vendasPacoteAuto = agendamentosVendedor.filter(ag => 
      ag.tipo === "pacote" || ag.cliente_pacote === "Sim"
    ).length;
    
    const pacote8Auto = agendamentosVendedor.filter(ag => ag.quantas_sessoes === 8).length;
    const pacote16Auto = agendamentosVendedor.filter(ag => ag.quantas_sessoes === 16).length;
    const pacote24Auto = agendamentosVendedor.filter(ag => ag.quantas_sessoes === 24).length;
    const pacote48Auto = agendamentosVendedor.filter(ag => ag.quantas_sessoes === 48).length;
    
    // Dados manuais
    const leadsManual = registrosVendedor.reduce((sum, r) => sum + (r.leads || 0), 0);
    const vendasAvulsoManual = registrosVendedor.reduce((sum, r) => sum + (r.vendas_avulso || 0), 0);
    const vendasPacoteManual = registrosVendedor.reduce((sum, r) => sum + (r.vendas_pacote || 0), 0);
    const pacote8Manual = registrosVendedor.reduce((sum, r) => sum + (r.pacote_8 || 0), 0);
    const pacote16Manual = registrosVendedor.reduce((sum, r) => sum + (r.pacote_16 || 0), 0);
    const pacote24Manual = registrosVendedor.reduce((sum, r) => sum + (r.pacote_24 || 0), 0);
    const pacote48Manual = registrosVendedor.reduce((sum, r) => sum + (r.pacote_48 || 0), 0);
    
    // Totais combinados
    const totalLeads = leadsVendedor.length + leadsManual;
    const vendasAvulso = vendasAvulsoAuto + vendasAvulsoManual;
    const vendasPacote = vendasPacoteAuto + vendasPacoteManual;
    const totalVendas = vendasAvulso + vendasPacote;
    
    const convAvulso = totalLeads > 0 ? ((vendasAvulso / totalLeads) * 100).toFixed(1) : "0.0";
    const convPacote = totalLeads > 0 ? ((vendasPacote / totalLeads) * 100).toFixed(1) : "0.0";

    return {
      id: vendedor.id,
      nome: vendedor.nome,
      leads: totalLeads,
      vendasAvulso,
      vendasPacote,
      totalVendas,
      convAvulso: parseFloat(convAvulso),
      convPacote: parseFloat(convPacote),
      pacote8: pacote8Auto + pacote8Manual,
      pacote16: pacote16Auto + pacote16Manual,
      pacote24: pacote24Auto + pacote24Manual,
      pacote48: pacote48Auto + pacote48Manual,
      metaMensal: vendedor.meta_mensal || 100,
    };
  }).sort((a, b) => b.totalVendas - a.totalVendas);

  // Detectar mudanças no ranking
  useEffect(() => {
    if (rankingAnterior.length > 0 && metricsVendedores.length > 0) {
      // Detectar ultrapassagens
      metricsVendedores.forEach((vendedor, index) => {
        const posAnterior = rankingAnterior.findIndex(v => v.id === vendedor.id);
        if (posAnterior > index && posAnterior !== -1) {
          // Ultrapassou alguém
          if (audioOvertakeRef.current) {
            audioOvertakeRef.current.play().catch(() => {});
          }
        }
      });

      // Detectar novo Top 1
      const novoTop1 = metricsVendedores[0]?.id;
      if (novoTop1 && novoTop1 !== top1Anterior && top1Anterior !== null) {
        if (audioVictoryRef.current) {
          audioVictoryRef.current.play().catch(() => {});
        }
      }
      setTop1Anterior(novoTop1);
    }
    
    setRankingAnterior(metricsVendedores);
  }, [metricsVendedores, rankingAnterior, top1Anterior]);

  // Métricas gerais
  const totalLeadsGeral = leadsFiltrados.length;
  const totalVendasAvulso = agendamentosFiltrados.filter(ag => 
    ag.tipo === "avulsa" || ag.tipo === "consulta"
  ).length;
  const totalVendasPacote = agendamentosFiltrados.filter(ag => 
    ag.tipo === "pacote" || ag.cliente_pacote === "Sim"
  ).length;
  const totalVendasGeral = totalVendasAvulso + totalVendasPacote;
  const convAvulsoGeral = totalLeadsGeral > 0 ? ((totalVendasAvulso / totalLeadsGeral) * 100).toFixed(2) : "0.00";
  const convPacoteGeral = totalLeadsGeral > 0 ? ((totalVendasPacote / totalLeadsGeral) * 100).toFixed(2) : "0.00";

  // Pacotes totais
  const pacote8Total = agendamentosFiltrados.filter(ag => ag.quantas_sessoes === 8).length;
  const pacote16Total = agendamentosFiltrados.filter(ag => ag.quantas_sessoes === 16).length;
  const pacote24Total = agendamentosFiltrados.filter(ag => ag.quantas_sessoes === 24).length;
  const pacote48Total = agendamentosFiltrados.filter(ag => ag.quantas_sessoes === 48).length;

  // Progresso das metas
  const progressoGrupo = (totalVendasGeral / metaGrupo) * 100;
  const progressoLeads = (totalLeadsGeral / metaLeads) * 100;

  const salvarMetas = () => {
    setMetaGrupo(metaTemp.grupo);
    setMetaLeads(metaTemp.leads);
    setEditandoMeta(false);
  };

  const salvarRegistroManual = () => {
    const vendedor = vendedores.find(v => v.id === registroManual.vendedor_id);
    const unidade = unidades.find(u => u.id === registroManual.unidade_id);
    
    if (!vendedor) {
      alert("Selecione um vendedor");
      return;
    }

    createRegistroMutation.mutate({
      ...registroManual,
      vendedor_nome: vendedor.nome,
      unidade_nome: unidade?.nome || "",
    });
  };

  const irParaDiaAnterior = () => {
    const data = new Date(diaEspecifico);
    data.setDate(data.getDate() - 1);
    setDiaEspecifico(data.toISOString().split('T')[0]);
  };

  const irParaProximoDia = () => {
    const data = new Date(diaEspecifico);
    data.setDate(data.getDate() + 1);
    setDiaEspecifico(data.toISOString().split('T')[0]);
  };

  const meses = [
    { valor: 1, nome: "Janeiro" },
    { valor: 2, nome: "Fevereiro" },
    { valor: 3, nome: "Março" },
    { valor: 4, nome: "Abril" },
    { valor: 5, nome: "Maio" },
    { valor: 6, nome: "Junho" },
    { valor: 7, nome: "Julho" },
    { valor: 8, nome: "Agosto" },
    { valor: 9, nome: "Setembro" },
    { valor: 10, nome: "Outubro" },
    { valor: 11, nome: "Novembro" },
    { valor: 12, nome: "Dezembro" },
  ];

  const anos = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  const top3 = metricsVendedores.slice(0, 3);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Home")}>
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  Dashboard Closers
                </h1>
                <p className="text-gray-600">Performance da equipe de vendas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle Visão Mensal / Diária */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <Button
                  onClick={() => setViewMode("mes")}
                  className={`rounded-none ${viewMode === "mes" ? "bg-black text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                  variant="ghost"
                >
                  Visão Mensal
                </Button>
                <Button
                  onClick={() => setViewMode("dia")}
                  className={`rounded-none ${viewMode === "dia" ? "bg-black text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                  variant="ghost"
                >
                  Visão Diária
                </Button>
              </div>

              {/* Filtros de Período */}
              {viewMode === "mes" ? (
                <>
                  <Select value={mesSelecionado.toString()} onValueChange={(v) => setMesSelecionado(parseInt(v))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map(m => (
                        <SelectItem key={m.valor} value={m.valor.toString()}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={anoSelecionado.toString()} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {anos.map(a => (
                        <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={irParaDiaAnterior}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <Input
                      type="date"
                      value={diaEspecifico}
                      onChange={(e) => setDiaEspecifico(e.target.value)}
                      className="border-0 w-40 p-0 h-auto focus-visible:ring-0"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={irParaProximoDia}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {isSuperior && (
                <>
                  <Button onClick={() => setRegistroManualOpen(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Registro
                  </Button>
                  <Button onClick={() => setEditandoMeta(true)} variant="outline">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar Metas
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-blue-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  TOTAL DE LEADS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-900">{totalLeadsGeral.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-green-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  VENDAS AVULSO
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-900">{totalVendasAvulso}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-purple-700 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  VENDA EXTRA C/ PACOTE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-900">{totalVendasPacote}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-orange-700 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  TOTAL VENDAS C/ PACOTE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-900">{totalVendasGeral}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-cyan-700">CONV. AVULSO</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-cyan-900">{convAvulsoGeral}%</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-pink-700">CONV. PACOTE</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-pink-900">{convPacoteGeral}%</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Metas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold">Meta do Grupo</h3>
                  <p className="text-sm opacity-90">Objetivo: {metaGrupo} vendas</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{totalVendasGeral}/{metaGrupo}</p>
                  <p className="text-sm">{progressoGrupo.toFixed(1)}% atingido</p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                <div 
                  className="bg-white h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progressoGrupo, 100)}%` }}
                />
              </div>
              <p className="text-sm text-center opacity-90">
                Faltam {Math.max(0, metaGrupo - totalVendasGeral)} vendas para atingir a meta
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold">Meta de Leads</h3>
                  <p className="text-sm opacity-90">Objetivo: {metaLeads.toLocaleString()} leads no mês</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{totalLeadsGeral.toLocaleString()}/{metaLeads.toLocaleString()}</p>
                  <p className="text-sm">{progressoLeads.toFixed(1)}% atingido</p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                <div 
                  className="bg-white h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progressoLeads, 100)}%` }}
                />
              </div>
              <p className="text-sm text-center opacity-90">
                Faltam {Math.max(0, metaLeads - totalLeadsGeral).toLocaleString()} leads para atingir a meta
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tipos de Pacotes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { num: 8, total: pacote8Total, color: "blue" },
            { num: 16, total: pacote16Total, color: "green" },
            { num: 24, total: pacote24Total, color: "orange" },
            { num: 48, total: pacote48Total, color: "purple" },
          ].map(({ num, total, color }) => (
            <Card key={num} className={`bg-gradient-to-br from-${color}-50 to-${color}-100 border-${color}-200`}>
              <CardContent className="p-6 text-center">
                <p className={`text-5xl font-bold text-${color}-600 mb-2`}>{total}</p>
                <p className={`text-sm text-${color}-700`}>Pacote {num}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pódio Top 3 */}
        {top3.length >= 3 && (
          <Card className="mb-6 bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Top 3 - Pódio dos Campeões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-end gap-6">
                {/* 2º Lugar */}
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center mb-2 border-4 border-gray-200">
                    <span className="text-3xl">🥈</span>
                  </div>
                  <div className="bg-gradient-to-br from-gray-200 to-gray-300 p-4 rounded-lg text-center w-32">
                    <p className="font-bold text-gray-800">{top3[1]?.nome}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{top3[1]?.totalVendas}</p>
                    <p className="text-xs text-gray-600">vendas</p>
                  </div>
                </div>

                {/* 1º Lugar */}
                <div className="flex flex-col items-center -mt-8">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center mb-2 border-4 border-yellow-200 shadow-xl">
                    <span className="text-5xl">👑</span>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-200 to-yellow-400 p-6 rounded-lg text-center w-40">
                    <p className="font-bold text-yellow-900 text-lg">{top3[0]?.nome}</p>
                    <p className="text-4xl font-bold text-yellow-900 mt-2">{top3[0]?.totalVendas}</p>
                    <p className="text-sm text-yellow-700">vendas</p>
                  </div>
                </div>

                {/* 3º Lugar */}
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center mb-2 border-4 border-orange-200">
                    <span className="text-3xl">🥉</span>
                  </div>
                  <div className="bg-gradient-to-br from-orange-200 to-orange-300 p-4 rounded-lg text-center w-32">
                    <p className="font-bold text-orange-800">{top3[2]?.nome}</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{top3[2]?.totalVendas}</p>
                    <p className="text-xs text-orange-600">vendas</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registros Manuais do Dia */}
        {isSuperior && registrosManuaisFiltrados.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Registros Manuais - {viewMode === "dia" ? "Hoje" : "Mês"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {registrosManuaisFiltrados.map(reg => {
                  const vendedor = vendedores.find(v => v.id === reg.vendedor_id);
                  return (
                    <div key={reg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-6 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Data</p>
                          <p className="font-medium">{reg.data}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Vendedor</p>
                          <p className="font-medium">{vendedor?.nome || reg.vendedor_nome}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Leads</p>
                          <p className="font-bold text-blue-600">{reg.leads || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Avulso</p>
                          <p className="font-bold text-green-600">{reg.vendas_avulso || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Pacote</p>
                          <p className="font-bold text-purple-600">{reg.vendas_pacote || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Pacotes</p>
                          <div className="flex gap-1">
                            {reg.pacote_8 > 0 && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">{reg.pacote_8}</span>}
                            {reg.pacote_16 > 0 && <span className="text-xs bg-green-100 text-green-800 px-1 rounded">{reg.pacote_16}</span>}
                            {reg.pacote_24 > 0 && <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">{reg.pacote_24}</span>}
                            {reg.pacote_48 > 0 && <span className="text-xs bg-purple-100 text-purple-800 px-1 rounded">{reg.pacote_48}</span>}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("Deseja remover este registro?")) {
                            deleteRegistroMutation.mutate(reg.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards Individuais dos Vendedores */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Métricas por Vendedor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricsVendedores.map((vendedor, index) => {
              const progressoMeta = (vendedor.totalVendas / vendedor.metaMensal) * 100;
              const corCard = index < 3 ? 
                (index === 0 ? "from-yellow-50 to-yellow-100 border-yellow-300" :
                 index === 1 ? "from-gray-50 to-gray-100 border-gray-300" :
                 "from-orange-50 to-orange-100 border-orange-300") :
                "from-white to-gray-50 border-gray-200";
              
              return (
                <Card key={vendedor.id} className={`bg-gradient-to-br ${corCard}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {index < 3 && (
                          <span className="text-2xl">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </span>
                        )}
                        {vendedor.nome}
                      </span>
                      <span className="text-sm text-gray-500">#{index + 1}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">Leads</p>
                        <p className="text-2xl font-bold text-blue-900">{vendedor.leads}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 mb-1">Vendas Avulso</p>
                        <p className="text-2xl font-bold text-green-900">{vendedor.vendasAvulso}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-purple-600 mb-1">Vendas c/ Pacote</p>
                        <p className="text-2xl font-bold text-purple-900">{vendedor.vendasPacote}</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-xs text-orange-600 mb-1">Conversão</p>
                        <p className="text-2xl font-bold text-orange-900">{vendedor.convAvulso}%</p>
                      </div>
                    </div>

                    {/* Meta Mensal */}
                    <div className="bg-white p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-700">Meta Mensal</p>
                        <p className="text-sm font-bold">{vendedor.totalVendas}/{vendedor.metaMensal}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            progressoMeta >= 100 ? 'bg-green-500' : 
                            progressoMeta >= 80 ? 'bg-blue-500' :
                            progressoMeta >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(progressoMeta, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <p className="text-gray-600">{progressoMeta.toFixed(1)}% atingido</p>
                        <p className="text-gray-600">Faltam {Math.max(0, vendedor.metaMensal - vendedor.totalVendas)} vendas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tabela de Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Ranking de Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-3 font-semibold text-gray-700">#</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Vendedor</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Leads</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Vendas Avulso</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Vendas Pacote</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Total Vendas</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Conv. Avulso</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Conv. Pacote</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Tipos de Pacotes</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsVendedores.map((vendedor, index) => (
                    <tr key={vendedor.id} className={`border-b ${index < 3 ? 'bg-yellow-50' : ''}`}>
                      <td className="p-3">
                        {index < 3 ? (
                          <span className="text-2xl">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </span>
                        ) : (
                          <span className="font-medium text-gray-600">{index + 1}</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold">{vendedor.nome}</td>
                      <td className="p-3 text-blue-600 font-bold">{vendedor.leads}</td>
                      <td className="p-3 text-green-600 font-bold">{vendedor.vendasAvulso}</td>
                      <td className="p-3 text-purple-600 font-bold">{vendedor.vendasPacote}</td>
                      <td className="p-3">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                          {vendedor.totalVendas}
                        </span>
                      </td>
                      <td className="p-3 text-orange-600">{vendedor.convAvulso}%</td>
                      <td className="p-3 text-orange-600">{vendedor.convPacote}%</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {vendedor.pacote8 > 0 && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{vendedor.pacote8}</span>
                          )}
                          {vendedor.pacote16 > 0 && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{vendedor.pacote16}</span>
                          )}
                          {vendedor.pacote24 > 0 && (
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">{vendedor.pacote24}</span>
                          )}
                          {vendedor.pacote48 > 0 && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">{vendedor.pacote48}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Editar Metas */}
      <Dialog open={editandoMeta} onOpenChange={setEditandoMeta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Metas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Meta do Grupo (Total de Vendas)
              </label>
              <Input
                type="number"
                value={metaTemp.grupo}
                onChange={(e) => setMetaTemp({ ...metaTemp, grupo: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 1350"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Meta de Leads
              </label>
              <Input
                type="number"
                value={metaTemp.leads}
                onChange={(e) => setMetaTemp({ ...metaTemp, leads: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 16850"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditandoMeta(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={salvarMetas}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Novo Registro Manual */}
      <Dialog open={registroManualOpen} onOpenChange={setRegistroManualOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Registro Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={registroManual.data}
                  onChange={(e) => setRegistroManual({ ...registroManual, data: e.target.value })}
                />
              </div>
              <div>
                <Label>Clínica/Unidade</Label>
                <Select 
                  value={registroManual.unidade_id} 
                  onValueChange={(value) => setRegistroManual({ ...registroManual, unidade_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a clínica" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Vendedor</Label>
              <Select 
                value={registroManual.vendedor_id} 
                onValueChange={(value) => setRegistroManual({ ...registroManual, vendedor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Leads</Label>
                <Input
                  type="number"
                  value={registroManual.leads}
                  onChange={(e) => setRegistroManual({ ...registroManual, leads: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Vendas Avulso</Label>
                <Input
                  type="number"
                  value={registroManual.vendas_avulso}
                  onChange={(e) => setRegistroManual({ ...registroManual, vendas_avulso: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label>Vendas c/ Pacote</Label>
              <Input
                type="number"
                value={registroManual.vendas_pacote}
                onChange={(e) => setRegistroManual({ ...registroManual, vendas_pacote: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <Label className="block mb-2">Tipos de Pacotes</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Pacote 8</Label>
                  <Input
                    type="number"
                    value={registroManual.pacote_8}
                    onChange={(e) => setRegistroManual({ ...registroManual, pacote_8: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Pacote 16</Label>
                  <Input
                    type="number"
                    value={registroManual.pacote_16}
                    onChange={(e) => setRegistroManual({ ...registroManual, pacote_16: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Pacote 24</Label>
                  <Input
                    type="number"
                    value={registroManual.pacote_24}
                    onChange={(e) => setRegistroManual({ ...registroManual, pacote_24: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Pacote 48</Label>
                  <Input
                    type="number"
                    value={registroManual.pacote_48}
                    onChange={(e) => setRegistroManual({ ...registroManual, pacote_48: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setRegistroManualOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={salvarRegistroManual} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                Salvar Registro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}