import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  Download, 
  Search, 
  FileSpreadsheet,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Edit,
  Eye,
  Save
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RelatoriosClientesPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState({ campo: "data", direcao: "desc" });
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroProfissional, setFiltroProfissional] = useState("todos");
  const [filtroUnidade, setFiltroUnidade] = useState("todos");
  const [filtroServico, setFiltroServico] = useState("todos");
  const [filtroEquipamento, setFiltroEquipamento] = useState("todos");
  const [modoEditor, setModoEditor] = useState(false);
  const [dadosEditados, setDadosEditados] = useState({});
  const [unidadeTab, setUnidadeTab] = useState("todas");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollTopRef = useRef(null);
  const scrollTableRef = useRef(null);

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        const isAdmin = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin" || user?.cargo === "gerencia_unidades";
        if (!isAdmin) {
          navigate(createPageUrl("Agenda"));
        } else {
          // Registrar acesso aos relatórios
          await base44.entities.LogAcao.create({
            tipo: "acessou_relatorios",
            usuario_email: user.email,
            descricao: `Acessou a página de Relatórios/Planilha`,
            entidade_tipo: "Relatorio"
          });
        }
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();
  }, [navigate]);

  // Sincronizar scrolls
  useEffect(() => {
    const scrollTop = document.getElementById('scroll-top');
    const scrollTable = document.getElementById('scroll-table');

    if (!scrollTop || !scrollTable) return;

    const handleTopScroll = () => {
      scrollTable.scrollLeft = scrollTop.scrollLeft;
    };

    const handleTableScroll = () => {
      scrollTop.scrollLeft = scrollTable.scrollLeft;
    };

    scrollTop.addEventListener('scroll', handleTopScroll);
    scrollTable.addEventListener('scroll', handleTableScroll);

    return () => {
      scrollTop.removeEventListener('scroll', handleTopScroll);
      scrollTable.removeEventListener('scroll', handleTableScroll);
    };
  }, []);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-relatorio'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-relatorio'],
    queryFn: () => base44.entities.Cliente.list("nome"),
    initialData: [],
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais-relatorio'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-relatorio'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos-relatorio'],
    queryFn: () => base44.entities.Servico.list("nome"),
    initialData: [],
  });

  const equipamentoOpcoes = [
    "AVULSA",
    "FUNCIONÁRIO", 
    "PACOTE",
    "PACOTE DE OUTRO CLIENTE",
    "PRIMEIRA SESSÃO DO PACOTE",
    "ÚLTIMA SESSÃO DO PACOTE",
    "VOUCHER"
  ];

  // Filtrar agendamentos (excluir bloqueios)
      const agendamentosFiltrados = agendamentos
        .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
        .filter(ag => {
          const matchBusca = !busca || 
            ag.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
            ag.cliente_telefone?.toLowerCase().includes(busca.toLowerCase()) ||
            ag.profissional_nome?.toLowerCase().includes(busca.toLowerCase());
          const matchStatus = filtroStatus === "todos" || ag.status === filtroStatus;
          const matchProfissional = filtroProfissional === "todos" || ag.profissional_id === filtroProfissional;
          const matchUnidade = filtroUnidade === "todos" || ag.unidade_id === filtroUnidade;
          const matchServico = filtroServico === "todos" || ag.servico_id === filtroServico;
          const matchEquipamento = filtroEquipamento === "todos" || ag.equipamento === filtroEquipamento;
          // Filtro por aba de unidade
          const matchUnidadeTab = unidadeTab === "todas" || ag.unidade_id === unidadeTab;
          return matchBusca && matchStatus && matchProfissional && matchUnidade && matchServico && matchEquipamento && matchUnidadeTab;
        })
    .sort((a, b) => {
      let valorA, valorB;
      
      switch (ordenacao.campo) {
        case "cliente":
          valorA = a.cliente_nome?.toLowerCase() || "";
          valorB = b.cliente_nome?.toLowerCase() || "";
          break;
        case "profissional":
          valorA = a.profissional_nome?.toLowerCase() || "";
          valorB = b.profissional_nome?.toLowerCase() || "";
          break;
        case "data":
          valorA = a.data + a.hora_inicio;
          valorB = b.data + b.hora_inicio;
          break;
        case "status":
          valorA = a.status || "";
          valorB = b.status || "";
          break;
        default:
          valorA = a.data;
          valorB = b.data;
      }
      
      if (ordenacao.direcao === "asc") {
        return valorA > valorB ? 1 : -1;
      } else {
        return valorA < valorB ? 1 : -1;
      }
    });

  const toggleOrdenacao = (campo) => {
    if (ordenacao.campo === campo) {
      setOrdenacao({ campo, direcao: ordenacao.direcao === "asc" ? "desc" : "asc" });
    } else {
      setOrdenacao({ campo, direcao: "asc" });
    }
  };

  const statusLabels = {
    agendado: { label: "Agendado", cor: "bg-amber-100 text-amber-800" },
    confirmado: { label: "Confirmado", cor: "bg-emerald-100 text-emerald-800" },
    ausencia: { label: "Ausência", cor: "bg-fuchsia-100 text-fuchsia-800" },
    cancelado: { label: "Cancelado", cor: "bg-red-100 text-red-800" },
    concluido: { label: "Concluído", cor: "bg-blue-100 text-blue-800" },
  };

  const atualizarAgendamentoMutation = useMutation({
    mutationFn: async ({ id, dados }) => {
      return await base44.entities.Agendamento.update(id, dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-relatorio'] });
    },
  });

  const handleEditarCelula = (agendamentoId, campo, valor) => {
    setDadosEditados(prev => ({
      ...prev,
      [agendamentoId]: {
        ...prev[agendamentoId],
        [campo]: valor
      }
    }));
  };

  const salvarAlteracoes = async () => {
    const alteracoes = Object.entries(dadosEditados);
    
    for (const [id, dados] of alteracoes) {
      const agendamentoOriginal = agendamentos.find(a => a.id === id);
      await atualizarAgendamentoMutation.mutateAsync({ id, dados });
      
      // Registrar cada alteração no log
      await base44.entities.LogAcao.create({
        tipo: "editou_dados_relatorio",
        usuario_email: usuarioAtual?.email,
        descricao: `Editou dados no relatório: ${agendamentoOriginal?.cliente_nome || 'Cliente'} - Campos alterados: ${Object.keys(dados).join(', ')}`,
        entidade_tipo: "Agendamento",
        entidade_id: id,
        dados_antigos: JSON.stringify(agendamentoOriginal),
        dados_novos: JSON.stringify(dados)
      });
    }
    
    setDadosEditados({});
    setModoEditor(false);
    alert("✅ Alterações salvas com sucesso!");
  };

  const getValorCelula = (ag, campo) => {
    if (dadosEditados[ag.id]?.[campo] !== undefined) {
      return dadosEditados[ag.id][campo];
    }
    return ag[campo] || "";
  };

  const exportarCSV = async () => {
    // Registrar exportação no log
    await base44.entities.LogAcao.create({
      tipo: "exportou_planilha",
      usuario_email: usuarioAtual?.email,
      descricao: `Exportou planilha CSV com ${agendamentosFiltrados.length} registros`,
      entidade_tipo: "Relatorio",
      dados_novos: JSON.stringify({ total_registros: agendamentosFiltrados.length, filtros: { busca, filtroStatus, filtroProfissional, filtroUnidade, filtroServico, filtroEquipamento } })
    });

    const headers = ["Cliente", "Telefone", "Profissional", "Serviço", "Unidade", "Data", "Horário", "Status", "Equipamento", "Cliente Pacote?", "Quantas Sessões", "Sessões Feitas"];
    const linhas = agendamentosFiltrados.map(ag => [
      getValorCelula(ag, "cliente_nome"),
      getValorCelula(ag, "cliente_telefone"),
      getValorCelula(ag, "profissional_nome"),
      getValorCelula(ag, "servico_nome"),
      getValorCelula(ag, "unidade_nome"),
      ag.data ? format(new Date(ag.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "",
      `${ag.hora_inicio || ""} - ${ag.hora_fim || ""}`,
      statusLabels[ag.status]?.label || ag.status || "",
      getValorCelula(ag, "equipamento"),
      getValorCelula(ag, "cliente_pacote"),
      getValorCelula(ag, "quantas_sessoes"),
      getValorCelula(ag, "sessoes_feitas")
    ]);

    const csv = [headers, ...linhas].map(row => row.map(cell => `"${cell || ""}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_agendamentos_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const SortIcon = ({ campo }) => {
    if (ordenacao.campo !== campo) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return ordenacao.direcao === "asc" ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
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
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatórios de Clientes</h1>
              <p className="text-sm text-gray-500">{agendamentosFiltrados.length} agendamentos encontrados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {modoEditor ? (
              <>
                <Button 
                  onClick={salvarAlteracoes} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={Object.keys(dadosEditados).length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setModoEditor(false);
                    setDadosEditados({});
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Modo Visual
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                onClick={async () => {
                  setModoEditor(true);
                  // Registrar ativação do modo editor
                  await base44.entities.LogAcao.create({
                    tipo: "ativou_modo_editor",
                    usuario_email: usuarioAtual?.email,
                    descricao: `Ativou o modo editor na página de Relatórios`,
                    entidade_tipo: "Relatorio"
                  });
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Modo Editor
              </Button>
            )}
            <Button onClick={exportarCSV} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
                    {/* Tabs por Unidade */}
                    <Tabs value={unidadeTab} onValueChange={setUnidadeTab} className="mb-4">
                      <TabsList className="flex-wrap h-auto">
                        <TabsTrigger value="todas">Todas as Unidades</TabsTrigger>
                        {unidades.map(u => (
                          <TabsTrigger key={u.id} value={u.id}>{u.nome}</TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>

                    {/* Filtros */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar cliente, telefone ou profissional..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="ausencia">Ausência</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroProfissional} onValueChange={setFiltroProfissional}>
              <SelectTrigger>
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os profissionais</SelectItem>
                {profissionais.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
              <SelectTrigger>
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as unidades</SelectItem>
                {unidades.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroServico} onValueChange={setFiltroServico}>
              <SelectTrigger>
                <SelectValue placeholder="Serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os serviços</SelectItem>
                {servicos.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroEquipamento} onValueChange={setFiltroEquipamento}>
              <SelectTrigger>
                <SelectValue placeholder="Equipamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos equipamentos</SelectItem>
                {equipamentoOpcoes.map(eq => (
                  <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela estilo Excel */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Barra de scroll superior */}
          <div className="overflow-x-auto border-b border-gray-200" id="scroll-top">
            <div style={{ width: '1600px', height: '1px' }}></div>
          </div>
          
          <div className="overflow-x-auto" id="scroll-table">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button 
                      onClick={() => toggleOrdenacao("cliente")}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      Cliente <SortIcon campo="cliente" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Telefone</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button 
                      onClick={() => toggleOrdenacao("profissional")}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      Profissional <SortIcon campo="profissional" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Serviço</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Unidade</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button 
                      onClick={() => toggleOrdenacao("data")}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      Data <SortIcon campo="data" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Horário</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button 
                      onClick={() => toggleOrdenacao("status")}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      Status <SortIcon campo="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Equipamento</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente Pacote?</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Quantas Sessões</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Sessões Feitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agendamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                      Nenhum agendamento encontrado
                    </td>
                  </tr>
                ) : (
                  agendamentosFiltrados.map((ag, idx) => (
                    <tr key={ag.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {modoEditor ? (
                          <Input
                            value={getValorCelula(ag, "cliente_nome")}
                            onChange={(e) => handleEditarCelula(ag.id, "cliente_nome", e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : ag.cliente_nome}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {modoEditor ? (
                          <Input
                            value={getValorCelula(ag, "cliente_telefone")}
                            onChange={(e) => handleEditarCelula(ag.id, "cliente_telefone", e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : ag.cliente_telefone || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {modoEditor ? (
                          <Input
                            value={getValorCelula(ag, "profissional_nome")}
                            onChange={(e) => handleEditarCelula(ag.id, "profissional_nome", e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : ag.profissional_nome}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {modoEditor ? (
                          <Input
                            value={getValorCelula(ag, "servico_nome")}
                            onChange={(e) => handleEditarCelula(ag.id, "servico_nome", e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : ag.servico_nome || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {modoEditor ? (
                          <Input
                            value={getValorCelula(ag, "unidade_nome")}
                            onChange={(e) => handleEditarCelula(ag.id, "unidade_nome", e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : ag.unidade_nome}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ag.data ? format(new Date(ag.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ag.hora_inicio} - {ag.hora_fim}</td>
                      <td className="px-4 py-3">
                        {modoEditor ? (
                          <Select 
                            value={getValorCelula(ag, "status") || ag.status} 
                            onValueChange={(value) => handleEditarCelula(ag.id, "status", value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agendado">Agendado</SelectItem>
                              <SelectItem value="confirmado">Confirmado</SelectItem>
                              <SelectItem value="ausencia">Ausência</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                              <SelectItem value="concluido">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[ag.status]?.cor || "bg-gray-100 text-gray-800"}`}>
                            {statusLabels[ag.status]?.label || ag.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {modoEditor ? (
                          <Select 
                            value={getValorCelula(ag, "equipamento") || ""} 
                            onValueChange={(value) => handleEditarCelula(ag.id, "equipamento", value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {equipamentoOpcoes.map(eq => (
                                <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : ag.equipamento || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {modoEditor ? (
                          <Select 
                            value={getValorCelula(ag, "cliente_pacote") || ""} 
                            onValueChange={(value) => handleEditarCelula(ag.id, "cliente_pacote", value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : ag.cliente_pacote || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {modoEditor ? (
                          <Input
                            type="number"
                            value={getValorCelula(ag, "quantas_sessoes") || ""}
                            onChange={(e) => handleEditarCelula(ag.id, "quantas_sessoes", e.target.value ? parseInt(e.target.value) : null)}
                            className="h-8 text-sm w-20"
                            placeholder="-"
                          />
                        ) : ag.quantas_sessoes || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {modoEditor ? (
                          <Input
                            type="number"
                            value={getValorCelula(ag, "sessoes_feitas") || ""}
                            onChange={(e) => handleEditarCelula(ag.id, "sessoes_feitas", e.target.value ? parseInt(e.target.value) : null)}
                            className="h-8 text-sm w-20"
                            placeholder="-"
                          />
                        ) : ag.sessoes_feitas || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}