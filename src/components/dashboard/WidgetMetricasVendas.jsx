import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, TrendingUp, Calendar, Clock, Image as ImageIcon, FileText, ExternalLink, Edit3, Save, Search, Download, BarChart3, Filter } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const formatarDataHoraBrasilia = (dataISO) => {
  if (!dataISO) return { data: '-', hora: '-' };
  
  const date = new Date(dataISO);
  // Subtrair 6 horas (em milissegundos)
  const dateAjustada = new Date(date.getTime() - (6 * 60 * 60 * 1000));
  const data = dateAjustada.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const hora = dateAjustada.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  
  return { data, hora };
};

const formatarDataPagamento = (dataString) => {
  if (!dataString || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
    return "-";
  }
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
};

export default function WidgetMetricasVendas({ agendamentos, dataInicio, dataFim }) {
  const [unidadeSelecionada, setUnidadeSelecionada] = useState("todas");
  const [vendedorSelecionado, setVendedorSelecionado] = useState("todos");
  const [imagemDialog, setImagemDialog] = useState(null);
  const [observacoesDialog, setObservacoesDialog] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [anotacoes, setAnotacoes] = useState({});
  const [notificacaoDialog, setNotificacaoDialog] = useState(null);
  const [mensagemNotificacao, setMensagemNotificacao] = useState("");
  const [emailSelecionado, setEmailSelecionado] = useState("");
  const [filtroAvancado, setFiltroAvancado] = useState(false);
  const [dataInicioCustom, setDataInicioCustom] = useState("");
  const [dataFimCustom, setDataFimCustom] = useState("");
  const [visualizacaoGrafico, setVisualizacaoGrafico] = useState("dia"); // dia, semana, mes
  const [mostrarGraficos, setMostrarGraficos] = useState(true);
  const queryClient = useQueryClient();

  const atualizarAgendamentoMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.Agendamento.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-dashboard'] });
    },
  });

  const criarAlertaMutation = useMutation({
    mutationFn: ({ vendedorEmail, agendamentoId, mensagem }) =>
      base44.entities.Alerta.create({
        usuario_email: vendedorEmail,
        titulo: "Erro em Agendamento",
        mensagem: mensagem,
        tipo: "error",
        agendamento_id: agendamentoId,
        lido: false,
        enviado_por: "sistema"
      }),
    onSuccess: () => {
      setNotificacaoDialog(null);
      setMensagemNotificacao("");
      alert("✅ Notificação enviada ao vendedor!");
    },
  });

  // Buscar todos os vendedores cadastrados
  const { data: vendedores = [], isLoading: carregandoVendedores } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  // Aguardar carregamento dos dados essenciais
  if (!agendamentos || carregandoVendedores) {
    return (
      <Card className="col-span-full">
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Carregando métricas de vendas...</div>
        </CardContent>
      </Card>
    );
  }

  // Definir filtros de data antes de usar
  const dataInicioFiltro = dataInicioCustom || dataInicio;
  const dataFimFiltro = dataFimCustom || dataFim;

  // Filtrar APENAS vendas com data_pagamento preenchida
  const vendasPeriodo = agendamentos.filter(ag => {
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
    if (!ag.data_pagamento) return false; // OBRIGATÓRIO: data de pagamento preenchida
    
    return ag.data_pagamento >= dataInicioFiltro && ag.data_pagamento <= dataFimFiltro;
  });

  // Obter lista única de unidades
  const unidadesUnicas = [...new Set(vendasPeriodo.map(ag => ag.unidade_nome || "Sem Unidade"))];
  
  // Usar todos os vendedores cadastrados (não apenas os que têm vendas no período)
  const vendedoresUnicos = vendedores.map(v => v.nome).sort();

  // Filtrar vendas pela unidade e vendedor selecionados
  const vendasFiltradas = vendasPeriodo.filter(ag => {
    const unidadeMatch = unidadeSelecionada === "todas" || (ag.unidade_nome || "Sem Unidade") === unidadeSelecionada;
    const vendedorMatch = vendedorSelecionado === "todos" || (ag.vendedor_nome || "Sem Vendedor") === vendedorSelecionado;
    return unidadeMatch && vendedorMatch;
  });

  const formatarPeriodo = () => {
    if (!dataInicioFiltro || !dataFimFiltro) return "Período não definido";
    if (dataInicioFiltro === dataFimFiltro) {
      return format(new Date(dataInicioFiltro + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
    }
    return `${format(new Date(dataInicioFiltro + 'T12:00:00'), "dd/MM", { locale: ptBR })} - ${format(new Date(dataFimFiltro + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}`;
  };

  const totalVendas = vendasFiltradas.length;
  const totalValor = vendasFiltradas.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);

  // Preparar dados para gráficos
  const prepararDadosGrafico = () => {
    if (vendasFiltradas.length === 0 || !dataInicioFiltro || !dataFimFiltro) return [];

    const inicio = new Date(dataInicioFiltro + 'T12:00:00');
    const fim = new Date(dataFimFiltro + 'T12:00:00');

    if (visualizacaoGrafico === "dia") {
      const dias = eachDayOfInterval({ start: inicio, end: fim });
      return dias.map(dia => {
        const dataStr = format(dia, 'yyyy-MM-dd');
        const vendasDia = vendasFiltradas.filter(v => v.data_pagamento === dataStr);
        return {
          data: format(dia, 'dd/MM', { locale: ptBR }),
          vendas: vendasDia.length,
          valor: vendasDia.reduce((sum, v) => sum + (v.valor_combinado || 0), 0)
        };
      });
    } else if (visualizacaoGrafico === "semana") {
      const semanas = eachWeekOfInterval({ start: inicio, end: fim }, { locale: ptBR });
      return semanas.map(semana => {
        const inicioSemana = startOfWeek(semana, { locale: ptBR });
        const fimSemana = endOfWeek(semana, { locale: ptBR });
        const vendasSemana = vendasFiltradas.filter(v => {
          const dataPagamento = new Date(v.data_pagamento + 'T12:00:00');
          return dataPagamento >= inicioSemana && dataPagamento <= fimSemana;
        });
        return {
          data: `Sem ${format(inicioSemana, 'dd/MM')}`,
          vendas: vendasSemana.length,
          valor: vendasSemana.reduce((sum, v) => sum + (v.valor_combinado || 0), 0)
        };
      });
    } else {
      const meses = eachMonthOfInterval({ start: inicio, end: fim });
      return meses.map(mes => {
        const inicioMes = startOfMonth(mes);
        const fimMes = endOfMonth(mes);
        const vendasMes = vendasFiltradas.filter(v => {
          const dataPagamento = new Date(v.data_pagamento + 'T12:00:00');
          return dataPagamento >= inicioMes && dataPagamento <= fimMes;
        });
        return {
          data: format(mes, 'MMM/yyyy', { locale: ptBR }),
          vendas: vendasMes.length,
          valor: vendasMes.reduce((sum, v) => sum + (v.valor_combinado || 0), 0)
        };
      });
    }
  };

  const dadosGrafico = prepararDadosGrafico();

  const exportarCSV = () => {
    const headers = [
      "Data/Hora Criação",
      "Cliente",
      "Telefone",
      "Unidade",
      "Vendedor",
      "Profissional",
      "Data Agendamento",
      "Data Pagamento",
      "Pacote",
      "Forma Pagamento",
      "Valor",
      "Pago",
      "A Receber",
      "Observações",
      "Observações Vendedor",
      "Anotações"
    ];

    const rows = vendasFiltradas.map(v => {
      const totalPago = (v.sinal || 0) + (v.recebimento_2 || 0) + (v.final_pagamento || 0);
      const dataHora = formatarDataHoraBrasilia(v.created_date);
      return [
        `${dataHora.data} ${dataHora.hora}`,
        v.cliente_nome || "",
        v.cliente_telefone || "",
        v.unidade_nome || "",
        v.vendedor_nome || "",
        v.profissional_nome || "",
        v.data ? format(new Date(v.data + 'T12:00:00'), "dd/MM/yyyy") : "",
        formatarDataPagamento(v.data_pagamento),
        v.cliente_pacote === "Sim" ? `${v.sessoes_feitas || 0}/${v.quantas_sessoes || 0}` : "",
        v.forma_pagamento === "pago_na_clinica" ? "Pago na Clínica" :
        v.forma_pagamento === "pix" ? "PIX" :
        v.forma_pagamento === "link_pagamento" ? "Link de Pagamento" : "",
        (v.valor_combinado || 0).toFixed(2),
        totalPago.toFixed(2),
        (v.falta_quanto || 0).toFixed(2),
        v.observacoes || "",
        v.observacoes_vendedores || "",
        v.anotacao_venda || ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metricas-vendas-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarPDF = async () => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(18);
    doc.text("Relatório de Métricas de Vendas", 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Período: ${formatarPeriodo()}`, 14, 30);
    doc.text(`Total de Vendas: ${totalVendas}`, 14, 38);
    doc.text(`Valor Total: ${formatarMoeda(totalValor)}`, 14, 46);

    const tableData = vendasFiltradas.map(v => {
      const totalPago = (v.sinal || 0) + (v.recebimento_2 || 0) + (v.final_pagamento || 0);
      const dataHora = formatarDataHoraBrasilia(v.created_date);
      return [
        `${dataHora.data} ${dataHora.hora}`,
        v.cliente_nome || "",
        v.vendedor_nome || "",
        formatarDataPagamento(v.data_pagamento),
        formatarMoeda(v.valor_combinado || 0),
        formatarMoeda(totalPago),
        formatarMoeda(v.falta_quanto || 0)
      ];
    });

    doc.autoTable({
      startY: 55,
      head: [["Data/Hora", "Cliente", "Vendedor", "Data Pagto", "Valor", "Pago", "A Receber"]],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`metricas-vendas-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`);
  };

  const handleSalvarAnotacoes = async () => {
    const idsEditados = Object.keys(anotacoes);
    if (idsEditados.length === 0) {
      alert("Nenhuma anotação foi modificada");
      return;
    }

    try {
      for (const id of idsEditados) {
        await atualizarAgendamentoMutation.mutateAsync({
          id,
          dados: { anotacao_venda: anotacoes[id] }
        });
      }
      alert(`✅ ${idsEditados.length} anotação(ões) salva(s) com sucesso!`);
      setModoEdicao(false);
      setAnotacoes({});
    } catch (error) {
      alert("Erro ao salvar anotações: " + error.message);
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg font-semibold">Métricas de Vendas - {formatarPeriodo()}</CardTitle>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total de Vendas</p>
            <p className="text-2xl font-bold text-blue-600">{totalVendas}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Valor Total</p>
            <p className="text-2xl font-bold text-emerald-600">{formatarMoeda(totalValor)}</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-emerald-50">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportarCSV}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportarPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setMostrarGraficos(!mostrarGraficos)}
              variant="outline"
              size="sm"
              className="bg-blue-50"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {mostrarGraficos ? "Ocultar" : "Mostrar"} Gráficos
            </Button>
          </div>
          <div className="flex gap-2">
            {modoEdicao ? (
              <>
                <Button onClick={() => { setModoEdicao(false); setAnotacoes({}); }} variant="outline" size="sm">
                  Cancelar
                </Button>
                <Button onClick={handleSalvarAnotacoes} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Anotações
                </Button>
              </>
            ) : (
              <Button onClick={() => setModoEdicao(true)} variant="outline" size="sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Editar Anotações
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {vendasPeriodo.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma venda registrada neste período</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filtros Avançados */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros de Data
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltroAvancado(!filtroAvancado)}
                >
                  {filtroAvancado ? "Ocultar" : "Mostrar"} Filtros
                </Button>
              </div>
              
              {filtroAvancado && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Data Início</label>
                    <input
                      type="date"
                      value={dataInicioCustom}
                      onChange={(e) => setDataInicioCustom(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Data Fim</label>
                    <input
                      type="date"
                      value={dataFimCustom}
                      onChange={(e) => setDataFimCustom(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDataInicioCustom("");
                        setDataFimCustom("");
                      }}
                      className="w-full"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Gráficos Interativos */}
            {mostrarGraficos && dadosGrafico.length > 0 && (
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Tendências de Vendas
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant={visualizacaoGrafico === "dia" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVisualizacaoGrafico("dia")}
                    >
                      Por Dia
                    </Button>
                    <Button
                      variant={visualizacaoGrafico === "semana" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVisualizacaoGrafico("semana")}
                    >
                      Por Semana
                    </Button>
                    <Button
                      variant={visualizacaoGrafico === "mes" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVisualizacaoGrafico("mes")}
                    >
                      Por Mês
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Gráfico de Quantidade de Vendas */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Quantidade de Vendas</h5>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" style={{ fontSize: '12px' }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="vendas" stroke="#3B82F6" strokeWidth={2} name="Vendas" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Gráfico de Valor Total */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Valor Total (R$)</h5>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" style={{ fontSize: '12px' }} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatarMoeda(value)} />
                        <Legend />
                        <Bar dataKey="valor" fill="#10B981" name="Valor" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            <Tabs value={unidadeSelecionada} onValueChange={setUnidadeSelecionada}>
              <TabsList className="mb-2">
                <TabsTrigger value="todas">Todas as Unidades</TabsTrigger>
                {unidadesUnicas.map(unidade => (
                  <TabsTrigger key={unidade} value={unidade}>
                    {unidade}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-600" />
                Pesquisar Vendedor:
              </label>
              <Select value={vendedorSelecionado} onValueChange={setVendedorSelecionado}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Vendedores</SelectItem>
                  {vendedoresUnicos.map(vendedor => (
                    <SelectItem key={vendedor} value={vendedor}>
                      {vendedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {unidadeSelecionada === "todas" ? "Todas as Unidades" : unidadeSelecionada}
                  {vendedorSelecionado !== "todos" && <span className="text-blue-600"> - {vendedorSelecionado}</span>}
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {totalVendas} venda{totalVendas !== 1 ? 's' : ''}
                  </span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatarMoeda(totalValor)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora Criação</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Data Agendamento</TableHead>
                      <TableHead>Data do Pagamento</TableHead>
                      <TableHead>Pacote</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">A Receber</TableHead>
                      <TableHead>Comprovante 1</TableHead>
                       <TableHead>Observações</TableHead>
                       <TableHead>Observações Vendedor</TableHead>
                       <TableHead className="min-w-[200px]">Anotações</TableHead>
                       <TableHead>Notificar Vendedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasFiltradas
                      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                      .map((venda) => {
                        const totalPago = (venda.sinal || 0) + (venda.recebimento_2 || 0) + (venda.final_pagamento || 0);
                        return (
                          <TableRow key={venda.id}>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {formatarDataHoraBrasilia(venda.created_date).data}
                                <Clock className="w-3 h-3 text-gray-400 ml-1" />
                                {formatarDataHoraBrasilia(venda.created_date).hora}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{venda.cliente_nome}</TableCell>
                             <TableCell className="text-sm">{venda.cliente_telefone || "-"}</TableCell>
                             <TableCell>
                               <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                 {venda.unidade_nome || "-"}
                               </span>
                             </TableCell>
                             <TableCell>
                               <span className="text-blue-600 font-medium">
                                 {venda.vendedor_nome || "-"}
                               </span>
                             </TableCell>
                             <TableCell>{venda.profissional_nome}</TableCell>
                             <TableCell>
                               {venda.data ? format(new Date(venda.data + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                             </TableCell>
                             <TableCell>
                               {formatarDataPagamento(venda.data_pagamento)}
                             </TableCell>
                            <TableCell>
                              {venda.cliente_pacote === "Sim" ? (
                                <div className="text-xs">
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded block mb-1">
                                    {venda.sessoes_feitas || 0}/{venda.quantas_sessoes || 0}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-gray-600">
                                {venda.forma_pagamento === "pago_na_clinica" ? "💳 Pago na Clínica" :
                                 venda.forma_pagamento === "pix" ? "📱 PIX" :
                                 venda.forma_pagamento === "link_pagamento" ? "🔗 Link de Pagamento" :
                                 "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatarMoeda(venda.valor_combinado)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600">
                              {formatarMoeda(totalPago)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              {formatarMoeda(venda.falta_quanto)}
                            </TableCell>
                            <TableCell>
                              {venda.comprovante_1 ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                    >
                                      <ImageIcon className="w-3 h-3 mr-1" />
                                      Ver
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => setImagemDialog(venda.comprovante_1)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Visualizar aqui
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => window.open(venda.comprovante_1, '_blank')}>
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Abrir em nova guia
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs">
                               {venda.observacoes ? (
                                 <button
                                   onClick={() => setObservacoesDialog({
                                     cliente: venda.cliente_nome,
                                     tipo: "Observações",
                                     texto: venda.observacoes
                                   })}
                                   className="flex items-start gap-1 hover:bg-gray-50 p-1 rounded transition-colors cursor-pointer text-left w-full"
                                 >
                                   <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                   <span className="text-xs text-gray-600 line-clamp-2">
                                     {venda.observacoes}
                                   </span>
                                 </button>
                               ) : (
                                 <span className="text-gray-400 text-xs">-</span>
                               )}
                            </TableCell>
                            <TableCell className="max-w-xs">
                               {venda.observacoes_vendedores ? (
                                 <button
                                   onClick={() => setObservacoesDialog({
                                     cliente: venda.cliente_nome,
                                     tipo: "Observações do Vendedor",
                                     texto: venda.observacoes_vendedores
                                   })}
                                   className="flex items-start gap-1 hover:bg-gray-50 p-1 rounded transition-colors cursor-pointer text-left w-full"
                                 >
                                   <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                   <span className="text-xs text-gray-600 line-clamp-2">
                                     {venda.observacoes_vendedores}
                                   </span>
                                 </button>
                               ) : (
                                 <span className="text-gray-400 text-xs">-</span>
                               )}
                            </TableCell>
                            <TableCell>
                               {modoEdicao ? (
                                 <Textarea
                                   value={anotacoes[venda.id] !== undefined ? anotacoes[venda.id] : (venda.anotacao_venda || "")}
                                   onChange={(e) => setAnotacoes(prev => ({ ...prev, [venda.id]: e.target.value }))}
                                   placeholder="Adicionar anotação..."
                                   className="text-xs min-h-[60px]"
                                   rows={2}
                                 />
                               ) : (
                                 <span className="text-xs text-gray-600">
                                   {venda.anotacao_venda || "-"}
                                 </span>
                               )}
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => setNotificacaoDialog({
                                  vendedorEmail: venda.vendedor_nome,
                                  agendamentoId: venda.id,
                                  cliente: venda.cliente_nome
                                })}
                                variant="outline"
                                size="sm"
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-600"
                              >
                                ⚠️ Notificar
                              </Button>
                            </TableCell>
                            </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!imagemDialog} onOpenChange={() => setImagemDialog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comprovante de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center bg-gray-100 rounded-lg p-4">
            <img 
              src={imagemDialog} 
              alt="Comprovante" 
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!observacoesDialog} onOpenChange={() => setObservacoesDialog(null)}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>{observacoesDialog?.tipo} - {observacoesDialog?.cliente}</DialogTitle>
           </DialogHeader>
           <div className="bg-gray-50 rounded-lg p-4">
             <p className="text-sm text-gray-700 whitespace-pre-wrap">
               {observacoesDialog?.texto}
             </p>
           </div>
         </DialogContent>
       </Dialog>

       <Dialog open={!!notificacaoDialog} onOpenChange={(open) => {
         if (!open) {
           setNotificacaoDialog(null);
           setMensagemNotificacao("");
           setEmailSelecionado("");
         }
       }}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>📢 Notificar Vendedor - {notificacaoDialog?.cliente}</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <label className="text-sm font-medium block mb-2">Selecionar Email</label>
               <Select value={emailSelecionado} onValueChange={setEmailSelecionado}>
                 <SelectTrigger className="w-full">
                   <SelectValue placeholder="Escolha o email do vendedor para notificar" />
                 </SelectTrigger>
                 <SelectContent>
                   {vendedores.map(v => (
                     <SelectItem key={v.id} value={v.email || v.nome}>
                       {v.nome} {v.email ? `(${v.email})` : ""}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <label className="text-sm font-medium block mb-2">Mensagem de Erro</label>
               <Textarea
                 value={mensagemNotificacao}
                 onChange={(e) => setMensagemNotificacao(e.target.value)}
                 placeholder="Descreva o que está faltando ou o erro encontrado..."
                 className="min-h-[120px]"
               />
             </div>
             <div className="flex justify-end gap-2">
               <Button
                 variant="outline"
                 onClick={() => {
                   setNotificacaoDialog(null);
                   setMensagemNotificacao("");
                   setEmailSelecionado("");
                 }}
               >
                 Cancelar
               </Button>
               <Button
                 onClick={() => {
                   if (!emailSelecionado.trim()) {
                     alert("Por favor, selecione um email!");
                     return;
                   }
                   if (!mensagemNotificacao.trim()) {
                     alert("Por favor, descreva o erro!");
                     return;
                   }
                   criarAlertaMutation.mutate({
                     vendedorEmail: emailSelecionado,
                     agendamentoId: notificacaoDialog.agendamentoId,
                     mensagem: mensagemNotificacao
                   });
                 }}
                 className="bg-red-600 hover:bg-red-700"
               >
                 Enviar Notificação
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
      </Card>
      );
      }