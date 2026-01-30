import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, UserPlus, TrendingUp, Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LeadCard from "../components/crm/LeadCard";
import NovoLeadDialog from "../components/crm/NovoLeadDialog";
import DetalhesLeadDialog from "../components/crm/DetalhesLeadDialog";

export default function CRMPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [novoLeadOpen, setNovoLeadOpen] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroUnidade, setFiltroUnidade] = useState("todas");
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const [modoRemover, setModoRemover] = useState(false);

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

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list("-created_date"),
    initialData: [],
  });

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

  const isAdmin = user?.role === 'admin';
  const isSuperior = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin" || user?.cargo === "gerencia_unidades";

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

  // Filtrar leads
  const leadsFiltrados = leads.filter(lead => {
    // Vendedor só vê seus próprios leads
    if (!isSuperior && lead.vendedor_id !== user?.id) {
      return false;
    }

    const matchBusca = lead.nome?.toLowerCase().includes(busca.toLowerCase()) ||
                       lead.telefone?.includes(busca);
    const matchStatus = filtroStatus === "todos" || lead.status === filtroStatus;
    const matchUnidade = filtroUnidade === "todas" || lead.unidade_id === filtroUnidade;
    const matchVendedor = filtroVendedor === "todos" || lead.vendedor_id === filtroVendedor;

    return matchBusca && matchStatus && matchUnidade && matchVendedor;
  });

  // Estatísticas
  const stats = {
    novos: leads.filter(l => l.status === "novo").length,
    emContato: leads.filter(l => l.status === "em_contato").length,
    negociacao: leads.filter(l => l.status === "negociacao").length,
    fechados: leads.filter(l => l.status === "fechado").length,
    perdidos: leads.filter(l => l.status === "perdido").length,
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
              <Button onClick={() => setNovoLeadOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-5 h-5 mr-2" />
                Novo Lead
              </Button>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-700 mb-1">
                <UserPlus className="w-5 h-5" />
                <span className="font-semibold">Novos</span>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{stats.novos}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Em Contato</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.emContato}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="flex items-center gap-2 text-purple-700 mb-1">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">Negociação</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.negociacao}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Fechados</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.fechados}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">Perdidos</span>
              </div>
              <p className="text-2xl font-bold text-red-900">{stats.perdidos}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-700">Filtros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="em_contato">Em Contato</SelectItem>
                <SelectItem value="negociacao">Negociação</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
                <SelectItem value="perdido">Perdido</SelectItem>
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
            {isAdmin && (
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

        {/* Cards de Leads */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leadsFiltrados.map(lead => (
            <LeadCard 
              key={lead.id} 
              lead={lead}
              onClick={() => !modoRemover && handleAbrirDetalhes(lead)}
              modoRemover={modoRemover}
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

      {leadSelecionado && (
        <DetalhesLeadDialog
          open={detalhesOpen}
          onOpenChange={setDetalhesOpen}
          lead={leadSelecionado}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            setDetalhesOpen(false);
          }}
        />
      )}
    </div>
  );
}