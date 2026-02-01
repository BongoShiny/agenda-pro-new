import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, UserPlus, TrendingUp, Clock, CheckCircle, XCircle, ArrowLeft, LayoutGrid, Columns3, RotateCw, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [modoRemover, setModoRemover] = useState(false);
  const [visualizacao, setVisualizacao] = useState("kanban");
  const [sincronizandoAgendamentos, setSincronizandoAgendamentos] = useState(false);

  const queryClient = useQueryClient();

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

  const { data: leads = [], refetch: refetchLeads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list("-created_date"),
    initialData: [],
    refetchInterval: 2000, // Atualizar a cada 2 segundos
  });

  // Subscrição em tempo real para sincronizar com outros usuários
  useEffect(() => {
    console.log('🔔 Ativando subscrição em tempo real para leads');
    
    const unsubscribe = base44.entities.Lead.subscribe((event) => {
      console.log(`🔔 EVENTO TEMPO REAL: ${event.type} - ID: ${event.id}`);
      
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        console.log('✅ Lead atualizado em tempo real:', event.data);
        
        // Se o lead selecionado foi deletado, fechar o dialog
        if (event.type === 'delete' && leadSelecionado?.id === event.id) {
          setDetalhesOpen(false);
          setLeadSelecionado(null);
        }
        
        // Forçar atualização imediata
        refetchLeads();
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      }
    });

    return () => {
      console.log('🔕 Desativando subscrição de leads');
      unsubscribe();
    };
  }, [refetchLeads, queryClient, leadSelecionado]);

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  const { data: recepcionistas = [] } = useQuery({
    queryKey: ['recepcionistas'],
    queryFn: () => base44.entities.Recepcionista.list("nome"),
    initialData: [],
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
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

  // Buscar recepcionista do usuário logado (se for recepção)
  const recepcionistaDoUsuario = recepcionistas.find(r => 
    r.email === user?.email
  );

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

  // Detectar leads duplicados (mesmo telefone)
  const leadsDuplicados = new Set();
  const telefonesMap = new Map();
  
  leads.forEach(lead => {
    const telefoneNormalizado = (lead.telefone || '').replace(/\D/g, '');
    if (telefoneNormalizado.length >= 10) {
      if (telefonesMap.has(telefoneNormalizado)) {
        leadsDuplicados.add(lead.id);
        leadsDuplicados.add(telefonesMap.get(telefoneNormalizado));
      } else {
        telefonesMap.set(telefoneNormalizado, lead.id);
      }
    }
  });

  // Buscar o vendedor do usuário logado
  const vendedorDoUsuario = vendedores.find(v => 
    v.nome === user?.full_name || v.email === user?.email
  );

  // Filtrar leads baseado no cargo
  const leadsFiltrados = leads.filter(lead => {
    // VENDEDOR: vê seus próprios leads + avulso + plano terapêutico (que ele criou)
    if (isVendedor) {
      // Deve ser do vendedor
      if (lead.vendedor_id !== vendedorDoUsuario?.id) {
        return false;
      }
      // Pode ver: lead, avulso, plano_terapeutico (para acompanhar conversões)
      if (!["lead", "avulso", "plano_terapeutico"].includes(lead.status)) {
        return false;
      }
    }
    
    // RECEPÇÃO: vê avulso, plano_terapeutico e renovacao (apenas da sua unidade)
    if (isRecepcao) {
      // Se não encontrou recepcionista vinculada, não mostrar nada
      if (!recepcionistaDoUsuario) {
        return false;
      }
      
      // Deve ser da unidade da recepcionista
      if (lead.unidade_id !== recepcionistaDoUsuario.unidade_id) {
        return false;
      }
      
      // Pode ver: avulso, plano_terapeutico, renovacao
      if (!["avulso", "plano_terapeutico", "renovacao"].includes(lead.status)) {
        return false;
      }
    }
    
    // Admin/gerência vê tudo (já filtrado pelos outros filtros)

    const matchBusca = lead.nome?.toLowerCase().includes(busca.toLowerCase()) ||
                       lead.telefone?.includes(busca);
    const matchStatus = filtroStatus === "todos" || lead.status === filtroStatus;
    const matchUnidade = filtroUnidade === "todas" || lead.unidade_id === filtroUnidade;
    const matchVendedor = filtroVendedor === "todos" || lead.vendedor_id === filtroVendedor;
    
    // Filtro de Data de Entrada
    let matchData = true;
    if (filtroDataInicio || filtroDataFim) {
      const dataLead = lead.data_entrada || lead.data_primeiro_contato;
      if (dataLead) {
        if (filtroDataInicio && dataLead < filtroDataInicio) matchData = false;
        if (filtroDataFim && dataLead > filtroDataFim) matchData = false;
      } else {
        matchData = false;
      }
    }

    return matchBusca && matchStatus && matchUnidade && matchVendedor && matchData;
  });

  // Estatísticas (filtradas por usuário)
  const leadsDoUsuario = isVendedor 
    ? leads.filter(l => l.vendedor_id === vendedorDoUsuario?.id)
    : leads;

  const stats = {
    lead: leadsDoUsuario.filter(l => l.status === "lead").length,
    avulso: leadsDoUsuario.filter(l => l.status === "avulso").length,
    planoTerapeutico: leadsDoUsuario.filter(l => l.status === "plano_terapeutico").length,
    renovacao: leadsDoUsuario.filter(l => l.status === "renovacao").length,
  };

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
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Dia que o lead entrou (Início)</label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Dia que o lead entrou (Fim)</label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBusca("");
                  setFiltroStatus("todos");
                  setFiltroUnidade("todas");
                  setFiltroVendedor("todos");
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

            {leadsFiltrados.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Nenhum lead encontrado</p>
                <p className="text-gray-400 text-sm mt-2">Clique em "Novo Lead" para começar</p>
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