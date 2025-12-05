import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, DollarSign, TrendingUp, TrendingDown, Calendar, Edit3, Save, UserPlus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function RelatoriosFinanceirosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState("mes");
  const [unidadeFiltro, setUnidadeFiltro] = useState("todas");
  const [profissionalFiltro, setProfissionalFiltro] = useState("todos");
  const [modoEditor, setModoEditor] = useState(false);
  const [dadosEditados, setDadosEditados] = useState({});
  const [dialogVendedorAberto, setDialogVendedorAberto] = useState(false);
  const [novoVendedor, setNovoVendedor] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    comissao_percentual: 0,
    valor_combinado_total: 0,
    valor_recebido_total: 0,
    a_receber_total: 0,
    ativo: true,
    observacoes: ""
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        const hasAccess = user?.cargo === "administrador" || user?.role === "admin" || user?.cargo === "gerencia_unidades" || user?.cargo === "financeiro";
        if (!hasAccess) {
          navigate(createPageUrl("Agenda"));
        } else {
          // Registrar acesso aos relatórios financeiros
          await base44.entities.LogAcao.create({
            tipo: "acessou_relatorios",
            usuario_email: user.email,
            descricao: `Acessou a página de Relatórios Financeiros`,
            entidade_tipo: "RelatorioFinanceiro"
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

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-financeiro'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-financeiro'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais-financeiro'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => base44.entities.User.list("full_name"),
    initialData: [],
  });

  // Filtrar unidades baseado no acesso do usuário
  const unidadesFiltradas = (usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin")
    ? unidades
    : unidades.filter(u => usuarioAtual?.unidades_acesso?.includes(u.id));

  // Calcular data inicial e final baseado no período
  const calcularPeriodo = () => {
    const hoje = new Date();
    let dataInicio, dataFim;

    switch (periodo) {
      case "dia":
        dataInicio = dataFim = format(hoje, "yyyy-MM-dd");
        break;
      case "semana":
        dataInicio = format(startOfWeek(hoje, { locale: ptBR }), "yyyy-MM-dd");
        dataFim = format(endOfWeek(hoje, { locale: ptBR }), "yyyy-MM-dd");
        break;
      case "mes":
        dataInicio = format(startOfMonth(hoje), "yyyy-MM-dd");
        dataFim = format(endOfMonth(hoje), "yyyy-MM-dd");
        break;
      case "ano":
        dataInicio = format(startOfYear(hoje), "yyyy-MM-dd");
        dataFim = format(endOfYear(hoje), "yyyy-MM-dd");
        break;
      default:
        dataInicio = format(startOfMonth(hoje), "yyyy-MM-dd");
        dataFim = format(endOfMonth(hoje), "yyyy-MM-dd");
    }

    return { dataInicio, dataFim };
  };

  const { dataInicio, dataFim } = calcularPeriodo();

  // Filtrar agendamentos (excluir bloqueios)
  const agendamentosFiltrados = agendamentos
    .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
    .filter(ag => {
      // Filtro de período
      const dataAg = ag.data;
      if (dataAg < dataInicio || dataAg > dataFim) return false;

      // Filtro de unidade
      if (unidadeFiltro !== "todas" && ag.unidade_id !== unidadeFiltro) return false;

      // Filtro de profissional
      if (profissionalFiltro !== "todos" && ag.profissional_id !== profissionalFiltro) return false;

      return true;
    });

  // Calcular totais
  const totalCombinado = agendamentosFiltrados.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
  const totalPago = agendamentosFiltrados.reduce((sum, ag) => sum + (ag.valor_pago || 0), 0);
  const totalAReceber = agendamentosFiltrados.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);

  // Agrupar por profissional
  const faturamentoPorProfissional = agendamentosFiltrados.reduce((acc, ag) => {
    const prof = ag.profissional_nome || "Sem Profissional";
    if (!acc[prof]) {
      acc[prof] = {
        nome: prof,
        totalCombinado: 0,
        totalPago: 0,
        totalAReceber: 0,
        quantidade: 0
      };
    }
    acc[prof].totalCombinado += ag.valor_combinado || 0;
    acc[prof].totalPago += ag.valor_pago || 0;
    acc[prof].totalAReceber += ag.falta_quanto || 0;
    acc[prof].quantidade += 1;
    return acc;
  }, {});

  const listaProfissionais = Object.values(faturamentoPorProfissional).sort((a, b) => b.totalPago - a.totalPago);

  // Agrupar por unidade
  const faturamentoPorUnidade = agendamentosFiltrados.reduce((acc, ag) => {
    const unidade = ag.unidade_nome || "Sem Unidade";
    if (!acc[unidade]) {
      acc[unidade] = {
        nome: unidade,
        totalCombinado: 0,
        totalPago: 0,
        totalAReceber: 0,
        quantidade: 0
      };
    }
    acc[unidade].totalCombinado += ag.valor_combinado || 0;
    acc[unidade].totalPago += ag.valor_pago || 0;
    acc[unidade].totalAReceber += ag.falta_quanto || 0;
    acc[unidade].quantidade += 1;
    return acc;
  }, {});

  const listaUnidades = Object.values(faturamentoPorUnidade).sort((a, b) => b.totalPago - a.totalPago);

  const atualizarAgendamentoMutation = useMutation({
    mutationFn: async ({ id, dados, dadosAntigos }) => {
      const resultado = await base44.entities.Agendamento.update(id, dados);
      
      await base44.entities.LogAcao.create({
        tipo: "editou_dados_relatorio",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Editou dados financeiros no relatório: ${dadosAntigos.cliente_nome}`,
        entidade_tipo: "Agendamento",
        entidade_id: id,
        dados_antigos: JSON.stringify(dadosAntigos),
        dados_novos: JSON.stringify(resultado)
      });
      
      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-financeiro'] });
    },
  });

  const criarVendedorMutation = useMutation({
    mutationFn: async (dados) => {
      const resultado = await base44.entities.Vendedor.create(dados);
      
      await base44.entities.LogAcao.create({
        tipo: "criou_terapeuta",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Criou novo vendedor: ${dados.nome}`,
        entidade_tipo: "Vendedor",
        entidade_id: resultado.id,
        dados_novos: JSON.stringify(resultado)
      });
      
      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      setDialogVendedorAberto(false);
      setNovoVendedor({
        nome: "",
        email: "",
        telefone: "",
        cpf: "",
        comissao_percentual: 0,
        valor_combinado_total: 0,
        valor_recebido_total: 0,
        a_receber_total: 0,
        ativo: true,
        observacoes: ""
      });
    },
  });

  const deletarVendedorMutation = useMutation({
    mutationFn: async (vendedor) => {
      await base44.entities.Vendedor.delete(vendedor.id);
      
      await base44.entities.LogAcao.create({
        tipo: "excluiu_terapeuta",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Excluiu vendedor: ${vendedor.nome}`,
        entidade_tipo: "Vendedor",
        entidade_id: vendedor.id,
        dados_antigos: JSON.stringify(vendedor)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
    },
  });

  const handleAtivarModoEditor = async () => {
    if (!modoEditor) {
      await base44.entities.LogAcao.create({
        tipo: "ativou_modo_editor",
        usuario_email: usuarioAtual?.email,
        descricao: "Ativou o modo editor nos relatórios financeiros",
        entidade_tipo: "RelatorioFinanceiro"
      });
    }
    setModoEditor(!modoEditor);
    setDadosEditados({});
  };

  const handleCampoChange = (agendamentoId, campo, valor) => {
    setDadosEditados(prev => ({
      ...prev,
      [agendamentoId]: {
        ...prev[agendamentoId],
        [campo]: valor ? parseFloat(valor) : null
      }
    }));
  };

  const handleSalvarEdicoes = async () => {
    const idsEditados = Object.keys(dadosEditados);
    
    if (idsEditados.length === 0) {
      alert("Nenhuma alteração foi feita");
      return;
    }

    try {
      for (const id of idsEditados) {
        const agendamento = agendamentos.find(a => a.id === id);
        const dadosNovos = dadosEditados[id];
        
        await atualizarAgendamentoMutation.mutateAsync({
          id,
          dados: dadosNovos,
          dadosAntigos: {
            cliente_nome: agendamento.cliente_nome,
            valor_combinado: agendamento.valor_combinado,
            valor_pago: agendamento.valor_pago,
            falta_quanto: agendamento.falta_quanto
          }
        });
      }
      
      alert(`✅ ${idsEditados.length} registro(s) atualizado(s) com sucesso!`);
      setModoEditor(false);
      setDadosEditados({});
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar alterações: " + error.message);
    }
  };

  const handleCriarVendedor = async () => {
    if (!novoVendedor.nome) {
      alert("Por favor, preencha o nome do vendedor");
      return;
    }

    try {
      await criarVendedorMutation.mutateAsync(novoVendedor);
      alert("✅ Vendedor criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar vendedor:", error);
      alert("Erro ao criar vendedor: " + error.message);
    }
  };

  const handleExcluirVendedor = async (vendedor) => {
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir o vendedor "${vendedor.nome}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmacao) return;

    try {
      await deletarVendedorMutation.mutateAsync(vendedor);
      alert("✅ Vendedor excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir vendedor:", error);
      alert("Erro ao excluir vendedor: " + error.message);
    }
  };

  const exportarCSV = async () => {
    // Registrar exportação no log
    await base44.entities.LogAcao.create({
      tipo: "exportou_planilha",
      usuario_email: usuarioAtual?.email,
      descricao: `Exportou relatório financeiro - Período: ${periodo}, ${agendamentosFiltrados.length} registros`,
      entidade_tipo: "RelatorioFinanceiro",
      dados_novos: JSON.stringify({ 
        periodo, 
        total_registros: agendamentosFiltrados.length, 
        total_pago: totalPago,
        total_a_receber: totalAReceber 
      })
    });

    const headers = ["Data", "Cliente", "Profissional", "Unidade", "Serviço", "Valor Combinado", "Valor Pago", "Falta Quanto", "Status"];
    const linhas = agendamentosFiltrados.map(ag => [
      ag.data ? format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR }) : "",
      ag.cliente_nome || "",
      ag.profissional_nome || "",
      ag.unidade_nome || "",
      ag.servico_nome || "",
      ag.valor_combinado || 0,
      ag.valor_pago || 0,
      ag.falta_quanto || 0,
      ag.status || ""
    ]);

    // Adicionar linha de totais
    linhas.push([
      "",
      "",
      "",
      "",
      "TOTAIS:",
      totalCombinado,
      totalPago,
      totalAReceber,
      ""
    ]);

    const csv = [headers, ...linhas].map(row => row.map(cell => `"${cell}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_financeiro_${periodo}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const periodoLabels = {
    dia: "Hoje",
    semana: "Esta Semana",
    mes: "Este Mês",
    ano: "Este Ano"
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
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatórios Financeiros</h1>
              <p className="text-sm text-gray-500">{periodoLabels[periodo]} - {agendamentosFiltrados.length} agendamentos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setDialogVendedorAberto(true)} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Vendedor
            </Button>
            <Button onClick={exportarCSV} className="bg-emerald-600 hover:bg-emerald-700">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filtros no Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="ano">Este Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Unidade</label>
              <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Unidades</SelectItem>
                  {unidadesFiltradas.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Profissional</label>
              <Select value={profissionalFiltro} onValueChange={setProfissionalFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Profissionais</SelectItem>
                  {profissionais.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Combinado Total</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatarMoeda(totalCombinado)}</div>
              <p className="text-xs text-gray-500 mt-1">{agendamentosFiltrados.length} agendamentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatarMoeda(totalPago)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {totalCombinado > 0 ? `${((totalPago / totalCombinado) * 100).toFixed(1)}%` : "0%"} do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatarMoeda(totalAReceber)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {totalCombinado > 0 ? `${((totalAReceber / totalCombinado) * 100).toFixed(1)}%` : "0%"} pendente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabelas por Profissional e Unidade */}
        <Tabs defaultValue="profissional" className="w-full">
          <TabsList>
            <TabsTrigger value="profissional">Por Profissional</TabsTrigger>
            <TabsTrigger value="unidade">Por Unidade</TabsTrigger>
            <TabsTrigger value="detalhado">Detalhado</TabsTrigger>
            <TabsTrigger value="por-vendedor">Por Vendedor</TabsTrigger>
          </TabsList>

          <TabsContent value="profissional">
            <Card>
              <CardHeader>
                <CardTitle>Atendimentos por Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">Atendimentos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listaProfissionais.map((prof, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{prof.nome}</TableCell>
                        <TableCell className="text-right text-lg font-semibold">{prof.quantidade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unidade">
            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Unidade</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Atendimentos</TableHead>
                      <TableHead className="text-right">Valor Combinado</TableHead>
                      <TableHead className="text-right">Valor Recebido</TableHead>
                      <TableHead className="text-right">A Receber</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listaUnidades.map((unidade, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{unidade.nome}</TableCell>
                        <TableCell className="text-right">{unidade.quantidade}</TableCell>
                        <TableCell className="text-right">{formatarMoeda(unidade.totalCombinado)}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-semibold">
                          {formatarMoeda(unidade.totalPago)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatarMoeda(unidade.totalAReceber)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detalhado">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Detalhamento Completo</CardTitle>
                <div className="flex gap-2">
                  {modoEditor ? (
                    <>
                      <Button onClick={() => { setModoEditor(false); setDadosEditados({}); }} variant="outline">
                        Cancelar
                      </Button>
                      <Button onClick={handleSalvarEdicoes} className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleAtivarModoEditor} variant="outline">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Modo Editor
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Valor Combinado</TableHead>
                        <TableHead className="text-right">Valor Pago</TableHead>
                        <TableHead className="text-right">Falta</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agendamentosFiltrados.map((ag) => {
                        const valorCombinado = dadosEditados[ag.id]?.valor_combinado !== undefined 
                          ? dadosEditados[ag.id].valor_combinado 
                          : ag.valor_combinado;
                        const valorPago = dadosEditados[ag.id]?.valor_pago !== undefined 
                          ? dadosEditados[ag.id].valor_pago 
                          : ag.valor_pago;
                        const faltaQuanto = dadosEditados[ag.id]?.falta_quanto !== undefined 
                          ? dadosEditados[ag.id].falta_quanto 
                          : ag.falta_quanto;
                        const vendedorId = dadosEditados[ag.id]?.vendedor_id !== undefined
                          ? dadosEditados[ag.id].vendedor_id
                          : ag.vendedor_id;
                        
                        return (
                          <TableRow key={ag.id} className={dadosEditados[ag.id] ? "bg-yellow-50" : ""}>
                            <TableCell>
                              {ag.data ? format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                            </TableCell>
                            <TableCell className="font-medium">{ag.cliente_nome}</TableCell>
                            <TableCell>{ag.profissional_nome}</TableCell>
                            <TableCell>
                              {modoEditor ? (
                                <Select 
                                  value={vendedorId || ""} 
                                  onValueChange={(value) => {
                                    const vendedor = vendedores.find(v => v.id === value);
                                    setDadosEditados(prev => ({
                                      ...prev,
                                      [ag.id]: {
                                        ...prev[ag.id],
                                        vendedor_id: value,
                                        vendedor_nome: vendedor?.nome || ""
                                      }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Sem vendedor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={null}>Sem vendedor</SelectItem>
                                    {vendedores.filter(v => v.ativo).map(v => (
                                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm">{ag.vendedor_nome || "-"}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {modoEditor ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={valorCombinado || ""}
                                  onChange={(e) => handleCampoChange(ag.id, "valor_combinado", e.target.value)}
                                  className="w-28 text-right"
                                />
                              ) : (
                                formatarMoeda(valorCombinado)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-semibold">
                              {modoEditor ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={valorPago || ""}
                                  onChange={(e) => handleCampoChange(ag.id, "valor_pago", e.target.value)}
                                  className="w-28 text-right"
                                />
                              ) : (
                                formatarMoeda(valorPago)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              {modoEditor ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={faltaQuanto || ""}
                                  onChange={(e) => handleCampoChange(ag.id, "falta_quanto", e.target.value)}
                                  className="w-28 text-right"
                                />
                              ) : (
                                formatarMoeda(faltaQuanto)
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                                {ag.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {agendamentosFiltrados.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">Nenhum agendamento encontrado</p>
                    <p className="text-sm mt-2">Tente ajustar os filtros para ver os dados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Por Vendedor */}
          <TabsContent value="por-vendedor">
            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Atendimentos</TableHead>
                      <TableHead className="text-right">Valor Combinado</TableHead>
                      <TableHead className="text-right">Valor Recebido</TableHead>
                      <TableHead className="text-right">A Receber</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendedores.filter(v => v.ativo).map(vendedor => {
                      const agendamentosVendedor = agendamentosFiltrados.filter(ag => 
                        ag.vendedor_id === vendedor.id
                      );

                      return (
                        <TableRow key={vendedor.id}>
                          <TableCell className="font-medium">{vendedor.nome}</TableCell>
                          <TableCell className="text-right">{agendamentosVendedor.length}</TableCell>
                          <TableCell className="text-right">{formatarMoeda(vendedor.valor_combinado_total || 0)}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">
                            {formatarMoeda(vendedor.valor_recebido_total || 0)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatarMoeda(vendedor.a_receber_total || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluirVendedor(vendedor)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {vendedores.filter(v => v.ativo).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="font-medium">Nenhum vendedor cadastrado</p>
                    <p className="text-sm mt-2">Crie vendedores para visualizar o relatório</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Criar Vendedor */}
      <Dialog open={dialogVendedorAberto} onOpenChange={setDialogVendedorAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Vendedor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={novoVendedor.nome}
                onChange={(e) => setNovoVendedor(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome completo do vendedor"
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Select value={novoVendedor.email} onValueChange={(value) => setNovoVendedor(prev => ({ ...prev, email: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map(usuario => (
                    <SelectItem key={usuario.id} value={usuario.email}>
                      {usuario.full_name} ({usuario.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={novoVendedor.telefone}
                onChange={(e) => setNovoVendedor(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={novoVendedor.cpf}
                onChange={(e) => setNovoVendedor(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label>Comissão (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={novoVendedor.comissao_percentual}
                onChange={(e) => setNovoVendedor(prev => ({ ...prev, comissao_percentual: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Combinado</Label>
              <Input
                type="number"
                step="0.01"
                value={novoVendedor.valor_combinado_total}
                onChange={(e) => setNovoVendedor(prev => ({ ...prev, valor_combinado_total: parseFloat(e.target.value) || 0 }))}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Recebido</Label>
              <Input
                type="number"
                step="0.01"
                value={novoVendedor.valor_recebido_total}
                onChange={(e) => setNovoVendedor(prev => ({ ...prev, valor_recebido_total: parseFloat(e.target.value) || 0 }))}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>A Receber</Label>
              <Input
                type="number"
                step="0.01"
                value={novoVendedor.a_receber_total}
                onChange={(e) => setNovoVendedor(prev => ({ ...prev, a_receber_total: parseFloat(e.target.value) || 0 }))}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Vendedor Ativo</Label>
              <Switch
                checked={novoVendedor.ativo}
                onCheckedChange={(checked) => setNovoVendedor(prev => ({ ...prev, ativo: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={novoVendedor.observacoes}
                onChange={(e) => setNovoVendedor(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Informações adicionais sobre o vendedor"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogVendedorAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarVendedor} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Vendedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}