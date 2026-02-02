import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, UserPlus, TrendingUp, Clock, CheckCircle, XCircle, ArrowLeft, LayoutGrid, Columns3, RotateCw, Upload, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { debounce } from "lodash";
import LeadCard from "../components/crm/LeadCard";
import NovoLeadDialog from "../components/crm/NovoLeadDialog";
import DetalhesLeadDialog from "../components/crm/DetalhesLeadDialog";
import KanbanView from "../components/crm/KanbanView";
import ImportarLeadsDialog from "../components/crm/ImportarLeadsDialog";

export default function CRMPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [novoLeadOpen, setNovoLeadOpen] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [importarDialogOpen, setImportarDialogOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroUnidade, setFiltroUnidade] = useState("todas");
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const [filtroRecepcao, setFiltroRecepcao] = useState("todas");
  const [filtroTerapeuta, setFiltroTerapeuta] = useState("todos");
  const [tipoFiltroData, setTipoFiltroData] = useState("entrada"); // entrada, conversao, pagamento
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [modoRemover, setModoRemover] = useState(false);
  const [visualizacao, setVisualizacao] = useState("kanban");
  const [sincronizandoAgendamentos, setSincronizandoAgendamentos] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const LEADS_POR_PAGINA = 50;

  const queryClient = useQueryClient();

  // Debounce da busca para performance
  const debouncedSearch = useCallback(
    debounce((value) => {
      setBuscaDebounced(value);
      setPaginaAtual(1); // Reset página ao buscar
    }, 500),
    []
  );

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  // Construir filtro backend inteligente
  const buildBackendFilter = useCallback(() => {
    const filter = {};
    
    // Filtros baseados no cargo do usuário
    if (isVendedor && vendedorDoUsuario) {
      filter.vendedor_id = vendedorDoUsuario.id;
    }
    if (isRecepcao && recepcionistaDoUsuario) {
      filter.unidade_id = recepcionistaDoUsuario.unidade_id;
    }
    
    // Filtros selecionados pelo usuário
    if (filtroStatus !== "todos") {
      filter.status = filtroStatus;
    }
    if (filtroUnidade !== "todas") {
      filter.unidade_id = filtroUnidade;
    }
    if (filtroVendedor !== "todos") {
      filter.vendedor_id = filtroVendedor;
    }
    
    return filter;
  }, [filtroStatus, filtroUnidade, filtroVendedor, isVendedor, isRecepcao, vendedorDoUsuario, recepcionistaDoUsuario]);

  // Carregar leads com filtro backend e paginação
  const { data: leadsData, refetch: refetchLeads, isFetching } = useQuery({
    queryKey: ['leads', buildBackendFilter(), paginaAtual],
    queryFn: async () => {
      const filter = buildBackendFilter();
      const skip = (paginaAtual - 1) * LEADS_POR_PAGINA;
      
      // Buscar com filtro e paginação
      const results = await base44.entities.Lead.filter(
        filter,
        "-created_date",
        LEADS_POR_PAGINA + 1, // +1 para saber se tem próxima página
        skip
      );
      
      return {
        leads: results.slice(0, LEADS_POR_PAGINA),
        hasMore: results.length > LEADS_POR_PAGINA
      };
    },
    initialData: { leads: [], hasMore: false },
    staleTime: 60000, // Cache por 60 segundos - mais agressivo
    cacheTime: 300000, // 5 minutos no cache
  });

  const leads = leadsData?.leads || [];
  const temMaisLeads = leadsData?.hasMore || false;

  // Subscrição em tempo real otimizada - apenas invalida cache
  useEffect(() => {
    const unsubscribe = base44.entities.Lead.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        // Se o lead selecionado foi deletado, fechar o dialog
        if (event.type === 'delete' && leadSelecionado?.id === event.id) {
          setDetalhesOpen(false);
          setLeadSelecionado(null);
        }
        
        // Invalidar cache de forma inteligente
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      }
    });

    return () => unsubscribe();
  }, [queryClient, leadSelecionado]);

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
    staleTime: 300000, // 5 minutos - dados raramente mudam
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
    staleTime: 300000,
  });

  const { data: recepcionistas = [] } = useQuery({
    queryKey: ['recepcionistas'],
    queryFn: () => base44.entities.Recepcionista.list("nome"),
    initialData: [],
    staleTime: 300000,
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
    staleTime: 300000,
  });

  const createLeadMutation = useMutation({
    mutationFn: (leadData) => base44.entities.Lead.create(leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setNovoLeadOpen(false);
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (leadId) => base44.entities.Lead.delete(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const atualizarLeadMutation = useMutation({
    mutationFn: async ({ id, dados }) => {
      return await base44.entities.Lead.update(id, dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const limparDuplicadosMutation = useMutation({
    mutationFn: async () => {
      const telefonesMap = new Map();
      const idsParaDeletar = [];
      
      // Ordenar por data de criação (mais antigo primeiro) para manter o primeiro
      const leadsOrdenados = [...leads].sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
      
      leadsOrdenados.forEach(lead => {
        const telefoneNormalizado = (lead.telefone || '').replace(/\D/g, '');
        if (telefoneNormalizado.length >= 10) {
          if (telefonesMap.has(telefoneNormalizado)) {
            // É duplicado - adicionar para deletar
            idsParaDeletar.push(lead.id);
          } else {
            // Primeiro lead com este telefone - manter
            telefonesMap.set(telefoneNormalizado, lead.id);
          }
        }
      });
      
      // Deletar todos os duplicados
      await Promise.all(idsParaDeletar.map(id => base44.entities.Lead.delete(id)));
      
      return idsParaDeletar.length;
    },
    onSuccess: (qtdRemovidos) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      alert(`✅ ${qtdRemovidos} lead(s) duplicado(s) removido(s) com sucesso!`);
    },
  });

  // Definir a ordem das transições permitidas
  const statusOrder = ["lead", "avulso", "plano_terapeutico", "renovacao"];

  const handleStatusChange = async (leadId, novoStatus) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead || lead.status === novoStatus) return; // Nenhuma mudança

      const statusAtualIndex = statusOrder.indexOf(lead.status);
      const novoStatusIndex = statusOrder.indexOf(novoStatus);

      // Permitir retrocesso sempre (qualquer um pode voltar para trás)
      if (novoStatusIndex < statusAtualIndex) {
        // Pode retroceder sem restrições
      } else {
        // Avançar requer permissão
        if (isVendedor) {
          // Vendedor: Lead → Avulso/Plano | Avulso → Plano
          const transicaoValida = (
            (lead.status === "lead" && ["avulso", "plano_terapeutico"].includes(novoStatus)) ||
            (lead.status === "avulso" && novoStatus === "plano_terapeutico")
          );
          
          if (!transicaoValida) {
            console.warn("❌ Transição não permitida para vendedor:", lead.status, "→", novoStatus);
            return;
          }
        } else if (isRecepcao) {
          // Recepção: Avulso → Plano/Renovação | Plano → Renovação
          const transicaoValida = (
            (lead.status === "avulso" && ["plano_terapeutico", "renovacao"].includes(novoStatus)) ||
            (lead.status === "plano_terapeutico" && novoStatus === "renovacao")
          );
          
          if (!transicaoValida) {
            console.warn("❌ Transição não permitida para recepção:", lead.status, "→", novoStatus);
            return;
          }
        }
      }

      await atualizarLeadMutation.mutateAsync({
        id: leadId,
        dados: { ...lead, status: novoStatus }
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleNovoLead = (leadData) => {
    createLeadMutation.mutate(leadData);
  };

  const handleAbrirDetalhes = (lead) => {
    setLeadSelecionado(lead);
    setDetalhesOpen(true);
  };

  const handleRemoverLead = async (leadId) => {
    if (window.confirm("Tem certeza que deseja excluir este lead?")) {
      await deleteLeadMutation.mutateAsync(leadId);
    }
  };

  const handleSincronizarAgendamentos = async () => {
    if (window.confirm("🔄 SINCRONIZAR AGENDA COM CRM?\n\nTodos os agendamentos serão organizados no CRM:\n• Avulsos → Status Avulso\n• Planos Terapêuticos → Status Plano\n• Leads serão criados automaticamente\n\nDeseja continuar?")) {
      setSincronizandoAgendamentos(true);
      try {
        const response = await base44.functions.invoke('sincronizarAgendaComCRM', {});
        alert(`✅ SINCRONIZAÇÃO CONCLUÍDA!\n\n📊 Resultados:\n✨ ${response.data.leadsCriados} leads criados\n🔄 ${response.data.leadsAtualizados} leads atualizados\n📦 ${response.data.totalProcessados} agendamentos processados${response.data.erros > 0 ? `\n⚠️ ${response.data.erros} erros` : ''}`);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      } catch (error) {
        alert(`❌ Erro na sincronização: ${error.message}`);
      } finally {
        setSincronizandoAgendamentos(false);
      }
    }
  };

  const isAdmin = user?.role === 'admin';
  const isSuperior = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin" || user?.cargo === "gerencia_unidades";
  const isVendedor = user?.cargo === "vendedor";
  const isRecepcao = user?.cargo === "recepcao";

  // Definir quais colunas o usuário pode ver baseado no cargo
  const colunasVisiveis = (() => {
    if (isAdmin || isSuperior) {
      // Admin vê tudo
      return ["lead", "avulso", "plano_terapeutico", "renovacao"];
    } else if (isVendedor) {
      // Vendedor vê Lead, Avulso e Plano Terapêutico (para acompanhar conversões)
      return ["lead", "avulso", "plano_terapeutico"];
    } else if (isRecepcao) {
      // Recepção vê Avulso, Plano Terapêutico e Renovação
      return ["avulso", "plano_terapeutico", "renovacao"];
    }
    // Default: nada
    return [];
  })();

  // Lazy load de agendamentos - só quando necessário
  const precisaAgendamentos = filtroRecepcao !== "todas" || filtroTerapeuta !== "todos" || tipoFiltroData === "pagamento";
  
  const { data: todosAgendamentos = [] } = useQuery({
    queryKey: ['agendamentos-filtro-crm'],
    queryFn: () => base44.entities.Agendamento.list(),
    initialData: [],
    enabled: precisaAgendamentos, // Só carrega quando precisa
    staleTime: 300000, // 5 minutos de cache
    cacheTime: 600000, // 10 minutos
  });

  // Memoizar telefones duplicados para melhor performance
  const leadsDuplicados = useMemo(() => {
    const duplicados = new Set();
    const telefonesMap = new Map();
    
    leads.forEach(lead => {
      const telefoneNormalizado = (lead.telefone || '').replace(/\D/g, '');
      if (telefoneNormalizado.length >= 10) {
        if (telefonesMap.has(telefoneNormalizado)) {
          duplicados.add(lead.id);
          duplicados.add(telefonesMap.get(telefoneNormalizado));
        } else {
          telefonesMap.set(telefoneNormalizado, lead.id);
        }
      }
    });
    
    return duplicados;
  }, [leads]);

  // Memoizar vendedor e recepcionista do usuário
  const vendedorDoUsuario = useMemo(() => 
    vendedores.find(v => v.nome === user?.full_name || v.email === user?.email),
    [vendedores, user]
  );

  const recepcionistaDoUsuario = useMemo(() => 
    recepcionistas.find(r => r.email === user?.email),
    [recepcionistas, user]
  );

  // Handler para mudança de busca com debounce
  useEffect(() => {
    debouncedSearch(busca);
  }, [busca, debouncedSearch]);

  // Filtrar leads NO FRONTEND (apenas filtros que não podem ir pro backend)
  const leadsFiltrados = useMemo(() => {
    let filtered = leads;

    // Busca por nome/telefone (frontend porque backend não tem LIKE otimizado)
    if (buscaDebounced) {
      filtered = filtered.filter(lead => 
        lead.nome?.toLowerCase().includes(buscaDebounced.toLowerCase()) ||
        lead.telefone?.includes(buscaDebounced)
      );
    }

    // Filtros de cargo já aplicados no backend via buildBackendFilter
    return filtered.filter(lead => {
      // Filtros de cargo já aplicados no backend
    
    // Filtro de Data (baseado no tipo selecionado)
    let matchData = true;
    if (filtroDataInicio || filtroDataFim) {
      let dataParaFiltrar = null;
      
      if (tipoFiltroData === "entrada") {
        dataParaFiltrar = lead.data_entrada || lead.data_primeiro_contato;
      } else if (tipoFiltroData === "conversao") {
        dataParaFiltrar = lead.data_conversao;
      } else if (tipoFiltroData === "pagamento") {
        // Buscar data de pagamento nos agendamentos
        const agendamentosDoLead = todosAgendamentos.filter(ag => 
          ag.cliente_telefone === lead.telefone && ag.data_pagamento
        );
        if (agendamentosDoLead.length > 0) {
          // Usar a data de pagamento mais recente
          dataParaFiltrar = agendamentosDoLead
            .map(ag => ag.data_pagamento)
            .sort()
            .reverse()[0];
        }
      }
      
      if (dataParaFiltrar) {
        if (filtroDataInicio && dataParaFiltrar < filtroDataInicio) matchData = false;
        if (filtroDataFim && dataParaFiltrar > filtroDataFim) matchData = false;
      } else {
        matchData = false;
      }
    }

    // Filtro por Recepção (buscar nos agendamentos)
    let matchRecepcao = true;
    if (filtroRecepcao !== "todas") {
      const agendamentosDoLead = todosAgendamentos.filter(ag => 
        ag.cliente_telefone === lead.telefone
      );
      const temRecepcaoSelecionada = agendamentosDoLead.some(ag => {
        const recepcionistaMatch = recepcionistas.find(r => 
          r.id === filtroRecepcao || r.nome === filtroRecepcao
        );
        return ag.vendedor_nome === recepcionistaMatch?.nome;
      });
      matchRecepcao = temRecepcaoSelecionada;
    }

    // Filtro por Terapeuta (buscar nos agendamentos)
    let matchTerapeuta = true;
    if (filtroTerapeuta !== "todos") {
      const agendamentosDoLead = todosAgendamentos.filter(ag => 
        ag.cliente_telefone === lead.telefone
      );
      const temTerapeutaSelecionado = agendamentosDoLead.some(ag => 
        ag.profissional_id === filtroTerapeuta
      );
      matchTerapeuta = temTerapeutaSelecionado;
    }

      return matchData && matchRecepcao && matchTerapeuta;
    });
  }, [leads, buscaDebounced, filtroDataInicio, filtroDataFim, tipoFiltroData, 
      filtroRecepcao, filtroTerapeuta, todosAgendamentos, recepcionistas]);

  // Estatísticas - buscar do backend com cache
  const { data: stats = { lead: 0, avulso: 0, planoTerapeutico: 0, renovacao: 0 } } = useQuery({
    queryKey: ['leads-stats', buildBackendFilter()],
    queryFn: async () => {
      const filter = buildBackendFilter();
      
      // Buscar contagens em paralelo
      const [leadCount, avulsoCount, planoCount, renovacaoCount] = await Promise.all([
        base44.entities.Lead.filter({ ...filter, status: 'lead' }, null, 0, 0).then(r => r.length),
        base44.entities.Lead.filter({ ...filter, status: 'avulso' }, null, 0, 0).then(r => r.length),
        base44.entities.Lead.filter({ ...filter, status: 'plano_terapeutico' }, null, 0, 0).then(r => r.length),
        base44.entities.Lead.filter({ ...filter, status: 'renovacao' }, null, 0, 0).then(r => r.length),
      ]);

      return {
        lead: leadCount,
        avulso: avulsoCount,
        planoTerapeutico: planoCount,
        renovacao: renovacaoCount,
      };
    },
    staleTime: 60000, // 1 minuto
    cacheTime: 300000, // 5 minutos
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => navigate(createPageUrl("Agenda"))}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                  CRM - Gestão de Leads
                </h1>
                <p className="text-gray-600 mt-1">Gerencie seus leads e conversões</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isSuperior && (
                <Button
                  onClick={() => setNovoLeadOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Novo Lead
                </Button>
              )}
              {isSuperior && (
                <ImportarLeadsDialog 
                  open={false} 
                  onOpenChange={(open) => {
                    if (open) {
                      const btn = document.getElementById("btn-importar-leads");
                      if (btn) btn.click();
                    }
                  }}
                />
              )}
              {isSuperior && (
                <Button
                  id="btn-importar-leads"
                  onClick={() => {
                    const dialog = document.querySelector('[role="dialog"]');
                    if (!dialog) {
                      setImportarDialogOpen(true);
                    }
                  }}
                  variant="outline"
                  className="border-green-500 text-green-700 hover:bg-green-50"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Importar Planilha
                </Button>
              )}
              {isSuperior && leadsDuplicados.size > 0 && (
                <Button 
                  onClick={() => {
                    if (window.confirm(`Deseja remover automaticamente ${leadsDuplicados.size} leads duplicados?\n\nSerão mantidos apenas os leads mais antigos.`)) {
                      limparDuplicadosMutation.mutate();
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={limparDuplicadosMutation.isPending}
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  {limparDuplicadosMutation.isPending ? "Limpando..." : "Limpar Duplicados"}
                </Button>
              )}
              {isSuperior && (
                <Button 
                  onClick={async () => {
                    const leadsParaDeletar = leads.filter(l => l.status === "lead");
                    if (window.confirm(`⚠️ ATENÇÃO! Isso irá deletar ${leadsParaDeletar.length} leads com status "Lead".\n\nEsta ação é IRREVERSÍVEL!\n\nDeseja continuar?`)) {
                      try {
                        for (const lead of leadsParaDeletar) {
                          await base44.entities.Lead.delete(lead.id);
                        }
                        alert(`✅ ${leadsParaDeletar.length} leads foram removidos com sucesso!`);
                        queryClient.invalidateQueries({ queryKey: ['leads'] });
                      } catch (error) {
                        alert(`❌ Erro ao remover leads: ${error.message}`);
                      }
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Limpar Todos Leads
                </Button>
              )}
              {(user?.cargo === "superior" || user?.cargo === "administrador" || user?.role === "admin") && (
                <Button 
                  onClick={handleSincronizarAgendamentos}
                  disabled={sincronizandoAgendamentos}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <RotateCw className={`w-5 h-5 mr-2 ${sincronizandoAgendamentos ? 'animate-spin' : ''}`} />
                  {sincronizandoAgendamentos ? "Sincronizar Agenda" : "Sincronizar Agenda"}
                </Button>
              )}
              {isSuperior && (
                <Button 
                  variant={modoRemover ? "outline" : "destructive"} 
                  className={modoRemover ? "border-red-600 text-red-600 hover:bg-red-50" : "bg-red-600 hover:bg-red-700"}
                  onClick={() => setModoRemover(!modoRemover)}
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  {modoRemover ? "Cancelar" : "Remover Lead"}
                </Button>
              )}
            </div>
          </div>

          {/* Estatísticas */}
          <div className={`grid grid-cols-2 gap-4 ${isRecepcao ? 'md:grid-cols-3' : (isVendedor ? 'md:grid-cols-3' : 'md:grid-cols-4')}`}>
            {!isRecepcao && (
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <UserPlus className="w-5 h-5" />
                  <span className="font-semibold">Lead</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.lead}</p>
              </div>
            )}
            <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-700 mb-1">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Avulso</span>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{stats.avulso}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">Plano Terapêutico</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">{stats.planoTerapeutico}</p>
            </div>
            {!isVendedor && (
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Renovação</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.renovacao}</p>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-gray-700">Filtros</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={visualizacao === "kanban" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisualizacao("kanban")}
              >
                <Columns3 className="w-4 h-4 mr-2" />
                Kanban
              </Button>
              <Button
                variant={visualizacao === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisualizacao("cards")}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Cards
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                }}
                className="pl-10"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {!isRecepcao && <SelectItem value="lead">Lead</SelectItem>}
                <SelectItem value="avulso">Avulso</SelectItem>
                <SelectItem value="plano_terapeutico">Plano Terapêutico</SelectItem>
                {!isVendedor && <SelectItem value="renovacao">Renovação</SelectItem>}
              </SelectContent>
            </Select>
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Filtrar por:</label>
              <Select value={tipoFiltroData} onValueChange={setTipoFiltroData}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Data de Entrada</SelectItem>
                  <SelectItem value="conversao">Data de Conversão</SelectItem>
                  <SelectItem value="pagamento">Data de Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                {tipoFiltroData === "entrada" ? "Dia que o lead entrou (Início)" :
                 tipoFiltroData === "conversao" ? "Data conversão (Início)" :
                 "Data pagamento (Início)"}
              </label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                {tipoFiltroData === "entrada" ? "Dia que o lead entrou (Fim)" :
                 tipoFiltroData === "conversao" ? "Data conversão (Fim)" :
                 "Data pagamento (Fim)"}
              </label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <Select value={filtroRecepcao} onValueChange={setFiltroRecepcao}>
              <SelectTrigger>
                <SelectValue placeholder="Recepção (vendedor)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas Recepções</SelectItem>
                {recepcionistas.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroTerapeuta} onValueChange={setFiltroTerapeuta}>
              <SelectTrigger>
                <SelectValue placeholder="Terapeuta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Terapeutas</SelectItem>
                {profissionais.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div className="flex items-end lg:col-start-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBusca("");
                  setFiltroStatus("todos");
                  setFiltroUnidade("todas");
                  setFiltroVendedor("todos");
                  setFiltroRecepcao("todas");
                  setFiltroTerapeuta("todos");
                  setTipoFiltroData("entrada");
                  setFiltroDataInicio("");
                  setFiltroDataFim("");
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Alerta de Duplicados */}
        {leadsDuplicados.size > 0 && (
          <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-orange-500 text-white rounded-full p-2">
                ⚠️
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-900 mb-1">Leads Duplicados Detectados!</h3>
                <p className="text-orange-700 text-sm">
                  Encontramos {leadsDuplicados.size} leads com telefones duplicados. 
                  Eles estão marcados em laranja. Use o botão "Remover Lead" para excluir duplicatas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Visualização Kanban ou Cards */}
        {visualizacao === "kanban" ? (
          <div className="h-[calc(100vh-450px)] min-h-[600px]">
            <KanbanView
              leads={leadsFiltrados}
              onStatusChange={handleStatusChange}
              onLeadClick={handleAbrirDetalhes}
              colunasVisiveis={colunasVisiveis}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leadsFiltrados.map(lead => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead}
                  onClick={() => !modoRemover && handleAbrirDetalhes(lead)}
                  onClickSessoes={(lead) => {
                    setLeadSelecionado(lead);
                    setDetalhesOpen(true);
                    // Abrir diretamente na aba de sessões
                    setTimeout(() => {
                      const sessoesTab = document.querySelector('[value="sessoes"]');
                      if (sessoesTab) sessoesTab.click();
                    }, 100);
                  }}
                  modoRemover={modoRemover && isSuperior}
                  onRemover={() => handleRemoverLead(lead.id)}
                  isDuplicado={leadsDuplicados.has(lead.id)}
                />
              ))}
            </div>

            {leadsFiltrados.length === 0 && !isFetching && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Nenhum lead encontrado</p>
                <p className="text-gray-400 text-sm mt-2">Clique em "Novo Lead" para começar</p>
              </div>
            )}

            {/* Paginação */}
            {(temMaisLeads || paginaAtual > 1) && (
              <div className="flex items-center justify-center gap-4 mt-6">
                {paginaAtual > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setPaginaAtual(p => p - 1)}
                    disabled={isFetching}
                  >
                    Página Anterior
                  </Button>
                )}
                <span className="text-gray-600">Página {paginaAtual}</span>
                {temMaisLeads && (
                  <Button
                    variant="outline"
                    onClick={() => setPaginaAtual(p => p + 1)}
                    disabled={isFetching}
                  >
                    Próxima Página
                  </Button>
                )}
              </div>
            )}

            {isFetching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-2 text-gray-600">Carregando leads...</span>
              </div>
            )}
          </>
        )}
      </div>

      <NovoLeadDialog
        open={novoLeadOpen}
        onOpenChange={setNovoLeadOpen}
        onSave={handleNovoLead}
        unidades={unidades}
        vendedores={vendedores}
        user={user}
        leadsExistentes={leads}
      />

      {leadSelecionado && leads.find(l => l.id === leadSelecionado.id) && (
        <DetalhesLeadDialog
          open={detalhesOpen}
          onOpenChange={setDetalhesOpen}
          lead={leads.find(l => l.id === leadSelecionado.id)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            setDetalhesOpen(false);
          }}
          />
          )}

          <ImportarLeadsDialog
          open={importarDialogOpen}
          onOpenChange={setImportarDialogOpen}
          />
          </div>
          );
}