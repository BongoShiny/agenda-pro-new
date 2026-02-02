import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, DollarSign, TrendingUp, TrendingDown, Calendar, Edit3, Save, UserPlus, Trash2, FileImage, Eye, FileText, BarChart3, Package, Clock, ExternalLink, Image as ImageIcon, CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

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
  const [dataPersonalizada, setDataPersonalizada] = useState(null);
  const [unidadeFiltro, setUnidadeFiltro] = useState("todas");
  const [profissionalFiltro, setProfissionalFiltro] = useState("todos");
  const [tipoDataFiltro, setTipoDataFiltro] = useState("data_pagamento"); // "data_conversao" ou "data_pagamento"
  const [modoEditor, setModoEditor] = useState(false);
  const [dialogExportarPDF, setDialogExportarPDF] = useState(false);
  const [mesSelecionadoPDF, setMesSelecionadoPDF] = useState("");
  const [tipoRelatorioPDF, setTipoRelatorioPDF] = useState("financeiro");
  const [dadosEditados, setDadosEditados] = useState({});
  const [dialogVendedorAberto, setDialogVendedorAberto] = useState(false);
  const [pesquisaDetalhado, setPesquisaDetalhado] = useState("");
  const [comprovanteVisualizacao, setComprovanteVisualizacao] = useState(null);
  const [mesAnoAnalise, setMesAnoAnalise] = useState(format(new Date(), "yyyy-MM"));
  const [vendedorFiltroAnalise, setVendedorFiltroAnalise] = useState("todos");
  const [imagemDialogAnalise, setImagemDialogAnalise] = useState(null);
  const [observacoesDialogAnalise, setObservacoesDialogAnalise] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("dashboard");
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
        
        const isAdmin = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin";
        const hasAccess = isAdmin || user?.cargo === "gerencia_unidades" || user?.cargo === "financeiro";
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

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-terapeutas'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  // Filtrar unidades baseado no acesso do usuário
  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin";
  const unidadesFiltradas = isAdmin ? unidades : unidades.filter(u => usuarioAtual?.unidades_acesso?.includes(u.id));

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
      case "personalizado":
        if (dataPersonalizada) {
          dataInicio = dataFim = format(new Date(dataPersonalizada), "yyyy-MM-dd");
        } else {
          dataInicio = dataFim = format(hoje, "yyyy-MM-dd");
        }
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
      // Filtro de período baseado no tipo de data selecionado
      let dataParaFiltro;
      if (tipoDataFiltro === "data_conversao") {
        dataParaFiltro = ag.data_conversao;
      } else {
        dataParaFiltro = ag.data_pagamento;
      }
      
      // Se não houver data do tipo selecionado, não incluir
      if (!dataParaFiltro) return false;
      
      if (dataParaFiltro < dataInicio || dataParaFiltro > dataFim) return false;

      // Filtro de unidade
      if (unidadeFiltro !== "todas" && ag.unidade_id !== unidadeFiltro) return false;

      // Filtro de profissional
      if (profissionalFiltro !== "todos" && ag.profissional_id !== profissionalFiltro) return false;

      return true;
    });

  // Calcular totais com os novos campos
  const totalCombinado = agendamentosFiltrados.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
  const totalSinal = agendamentosFiltrados.reduce((sum, ag) => sum + (ag.sinal || 0), 0);
  const totalRecebimento2 = agendamentosFiltrados.reduce((sum, ag) => sum + (ag.recebimento_2 || 0), 0);
  const totalFinalPagamento = agendamentosFiltrados.reduce((sum, ag) => sum + (ag.final_pagamento || 0), 0);
  const totalPago = totalSinal + totalRecebimento2 + totalFinalPagamento;
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
    const totalPagoAg = (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
    acc[prof].totalCombinado += ag.valor_combinado || 0;
    acc[prof].totalPago += totalPagoAg;
    acc[prof].totalAReceber += ag.falta_quanto || 0;
    acc[prof].quantidade += 1;
    return acc;
  }, {});

  const listaProfissionais = Object.values(faturamentoPorProfissional).sort((a, b) => b.totalPago - a.totalPago);

  // Calcular totais para o mês específico quando em análise mensal
  const agendamentosMesSelecionado = React.useMemo(() => {
    if (abaAtiva !== "analise-mensal") return null;
    return agendamentos
      .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
      .filter(ag => {
        if (!ag.data_pagamento) return false;
        return ag.data_pagamento.substring(0, 7) === mesAnoAnalise;
      });
  }, [abaAtiva, mesAnoAnalise, agendamentos]);

  // Usar totais do mês se em análise mensal, senão usar período global
  const totalCombinadoDisplay = agendamentosMesSelecionado 
    ? agendamentosMesSelecionado.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0)
    : totalCombinado;
  const totalSinalDisplay = agendamentosMesSelecionado 
    ? agendamentosMesSelecionado.reduce((sum, ag) => sum + (ag.sinal || 0), 0)
    : totalSinal;
  const totalRecebimento2Display = agendamentosMesSelecionado 
    ? agendamentosMesSelecionado.reduce((sum, ag) => sum + (ag.recebimento_2 || 0), 0)
    : totalRecebimento2;
  const totalFinalPagamentoDisplay = agendamentosMesSelecionado 
    ? agendamentosMesSelecionado.reduce((sum, ag) => sum + (ag.final_pagamento || 0), 0)
    : totalFinalPagamento;
  const totalPagoDisplay = totalSinalDisplay + totalRecebimento2Display + totalFinalPagamentoDisplay;
  const totalAReceberDisplay = agendamentosMesSelecionado 
    ? agendamentosMesSelecionado.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0)
    : totalAReceber;

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
    const totalPagoAg = (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
    acc[unidade].totalCombinado += ag.valor_combinado || 0;
    acc[unidade].totalPago += totalPagoAg;
    acc[unidade].totalAReceber += ag.falta_quanto || 0;
    acc[unidade].quantidade += 1;
    return acc;
  }, {});

  const listaUnidades = Object.values(faturamentoPorUnidade).sort((a, b) => b.totalPago - a.totalPago);

  // Gerar lista de meses disponíveis
  const mesesDisponiveis = React.useMemo(() => {
    const meses = new Set();
    agendamentos
      .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
      .forEach(ag => {
        if (ag.data) {
          const mesAno = format(criarDataPura(ag.data), "yyyy-MM", { locale: ptBR });
          meses.add(mesAno);
        }
      });
    return Array.from(meses).sort().reverse();
  }, [agendamentos]);

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
        tipo: "criou_vendedor",
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
        tipo: "excluiu_vendedor",
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
    setDadosEditados(prev => {
      const novosValores = {
        ...prev[agendamentoId],
        [campo]: campo === 'anotacao_venda' ? valor : (valor ? parseFloat(valor) : null)
      };
      
      // Recalcular falta_quanto automaticamente
      const sinal = parseFloat(novosValores.sinal !== undefined ? novosValores.sinal : prev[agendamentoId]?.sinal) || 0;
      const recebimento2 = parseFloat(novosValores.recebimento_2 !== undefined ? novosValores.recebimento_2 : prev[agendamentoId]?.recebimento_2) || 0;
      const finalPagamento = parseFloat(novosValores.final_pagamento !== undefined ? novosValores.final_pagamento : prev[agendamentoId]?.final_pagamento) || 0;
      const valorCombinado = parseFloat(novosValores.valor_combinado !== undefined ? novosValores.valor_combinado : prev[agendamentoId]?.valor_combinado) || 0;
      
      const totalPago = sinal + recebimento2 + finalPagamento;
      novosValores.falta_quanto = valorCombinado - totalPago;
      
      return {
        ...prev,
        [agendamentoId]: novosValores
      };
    });
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
            sinal: agendamento.sinal,
            recebimento_2: agendamento.recebimento_2,
            final_pagamento: agendamento.final_pagamento,
            falta_quanto: agendamento.falta_quanto,
            anotacao_venda: agendamento.anotacao_venda
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

  const exportarPDF = async () => {
    if (!mesSelecionadoPDF) {
      alert("Por favor, selecione um mês para o relatório");
      return;
    }

    const [ano, mes] = mesSelecionadoPDF.split('-');

    if (tipoRelatorioPDF === "financeiro") {
      await exportarPDFFinanceiro(ano, mes);
    } else if (tipoRelatorioPDF === "vendedor") {
      await exportarPDFVendedor(ano, mes);
    }
  };

  const exportarPDFFinanceiro = async (ano, mes) => {
    // Filtrar agendamentos do mês selecionado
    const agendamentosMes = agendamentos
      .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
      .filter(ag => {
        if (!ag.data) return false;
        const dataAg = ag.data.substring(0, 7); // YYYY-MM
        return dataAg === mesSelecionadoPDF;
      });

    // Calcular totais do mês com novos campos
    const totalCombinadoMes = agendamentosMes.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
    const totalSinalMes = agendamentosMes.reduce((sum, ag) => sum + (ag.sinal || 0), 0);
    const totalRecebimento2Mes = agendamentosMes.reduce((sum, ag) => sum + (ag.recebimento_2 || 0), 0);
    const totalFinalPagamentoMes = agendamentosMes.reduce((sum, ag) => sum + (ag.final_pagamento || 0), 0);
    const totalPagoMes = totalSinalMes + totalRecebimento2Mes + totalFinalPagamentoMes;
    const totalAReceberMes = agendamentosMes.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);

    // Agrupar por profissional
    const faturamentoPorProfMes = agendamentosMes.reduce((acc, ag) => {
      const prof = ag.profissional_nome || "Sem Profissional";
      if (!acc[prof]) {
        acc[prof] = { nome: prof, totalCombinado: 0, totalPago: 0, totalAReceber: 0, quantidade: 0 };
      }
      const totalPagoAg = (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
      acc[prof].totalCombinado += ag.valor_combinado || 0;
      acc[prof].totalPago += totalPagoAg;
      acc[prof].totalAReceber += ag.falta_quanto || 0;
      acc[prof].quantidade += 1;
      return acc;
    }, {});

    const listaProfMes = Object.values(faturamentoPorProfMes).sort((a, b) => b.quantidade - a.quantidade);

    await base44.entities.LogAcao.create({
      tipo: "gerou_relatorio_pdf",
      usuario_email: usuarioAtual?.email,
      descricao: `Gerou relatório financeiro em PDF - Mês: ${format(new Date(ano, mes - 1), "MMMM/yyyy", { locale: ptBR })}, ${agendamentosMes.length} registros`,
      entidade_tipo: "RelatorioFinanceiro"
    });

    const printWindow = window.open('', '_blank');
    const mesNome = format(new Date(ano, mes - 1), "MMMM 'de' yyyy", { locale: ptBR });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Financeiro - ${mesNome}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { color: #059669; margin-bottom: 5px; }
            h2 { color: #374151; margin-top: 25px; margin-bottom: 10px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; font-size: 11px; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .summary { display: flex; gap: 15px; margin: 15px 0; }
            .summary-card { flex: 1; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; text-align: center; }
            .total { font-weight: bold; background-color: #f9fafb; }
            .text-right { text-align: right; }
            .highlight { background-color: #fef3c7; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Relatório Financeiro Detalhado</h1>
          <p><strong>Período:</strong> ${mesNome}</p>
          <p><strong>Data de Emissão:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          
          <div class="summary">
            <div class="summary-card">
              <p style="margin: 0; color: #6b7280; font-size: 11px;">Valor Combinado Total</p>
              <h2 style="margin: 8px 0 0 0; color: #3b82f6; font-size: 20px;">${formatarMoeda(totalCombinadoMes)}</h2>
            </div>
            <div class="summary-card">
              <p style="margin: 0; color: #6b7280; font-size: 11px;">Total Recebido</p>
              <h2 style="margin: 8px 0 0 0; color: #10b981; font-size: 20px;">${formatarMoeda(totalPagoMes)}</h2>
            </div>
            <div class="summary-card">
              <p style="margin: 0; color: #6b7280; font-size: 11px;">Total a Receber</p>
              <h2 style="margin: 8px 0 0 0; color: #f97316; font-size: 20px;">${formatarMoeda(totalAReceberMes)}</h2>
            </div>
          </div>

          <h2>📋 Detalhamento Completo dos Agendamentos</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Número</th>
                <th>Cliente</th>
                <th>Profissional</th>
                <th>Unidade</th>
                <th>Serviço</th>
                <th>Vendedor</th>
                <th class="text-right">Vlr. Combinado</th>
                <th class="text-right">Sinal</th>
                <th class="text-right">Recebimento 2</th>
                <th class="text-right">Final</th>
                <th class="text-right">Total Pago</th>
                <th class="text-right">Falta</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${agendamentosMes.map(ag => `
                <tr>
                  <td>${ag.data ? format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}</td>
                  <td>${ag.cliente_telefone || "-"}</td>
                  <td>${ag.cliente_nome || "-"}</td>
                  <td>${ag.profissional_nome || "-"}</td>
                  <td>${ag.unidade_nome || "-"}</td>
                  <td>${ag.servico_nome || "-"}</td>
                   <td>${ag.vendedor_nome || "-"}</td>
                   <td>${ag.data_pagamento ? format(criarDataPura(ag.data_pagamento), "dd/MM/yyyy", { locale: ptBR }) : "-"}</td>
                   <td class="text-right">${formatarMoeda(ag.valor_combinado)}</td>
                  <td class="text-right" style="color: #10b981;">${formatarMoeda(ag.sinal)}</td>
                  <td class="text-right" style="color: #10b981;">${formatarMoeda(ag.recebimento_2)}</td>
                  <td class="text-right" style="color: #10b981;">${formatarMoeda(ag.final_pagamento)}</td>
                  <td class="text-right" style="color: #10b981; font-weight: 600;">${formatarMoeda((ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0))}</td>
                  <td class="text-right" style="color: #f97316;">${formatarMoeda(ag.falta_quanto)}</td>
                  <td>${ag.status || "-"}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td colspan="7"><strong>TOTAIS GERAIS</strong></td>
                <td class="text-right"><strong>${formatarMoeda(totalCombinadoMes)}</strong></td>
                <td class="text-right"><strong>${formatarMoeda(totalSinalMes)}</strong></td>
                <td class="text-right"><strong>${formatarMoeda(totalRecebimento2Mes)}</strong></td>
                <td class="text-right"><strong>${formatarMoeda(totalFinalPagamentoMes)}</strong></td>
                <td class="text-right"><strong>${formatarMoeda(totalPagoMes)}</strong></td>
                <td class="text-right"><strong>${formatarMoeda(totalAReceberMes)}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <h2>👨‍⚕️ Atendimentos por Terapeuta</h2>
          <table>
            <thead>
              <tr>
                <th>Terapeuta</th>
                <th class="text-right">Quantidade de Atendimentos</th>
              </tr>
            </thead>
            <tbody>
              ${listaProfMes.map(prof => `
                <tr>
                  <td><strong>${prof.nome}</strong></td>
                  <td class="text-right highlight"><strong>${prof.quantidade}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #d1d5db; text-align: center; color: #6b7280;">
            <p style="margin: 5px 0;">Relatório gerado automaticamente pelo sistema</p>
            <p style="margin: 5px 0; font-size: 10px;">Total de ${agendamentosMes.length} agendamentos no período</p>
          </div>

          <button onclick="window.print()" style="margin-top: 30px; padding: 12px 24px; background: #059669; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🖨️ Imprimir / Salvar como PDF
          </button>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setDialogExportarPDF(false);
  };

  const exportarPDFVendedor = async (ano, mes) => {
    // Filtrar agendamentos do mês selecionado baseado na DATA DE PAGAMENTO
    const agendamentosMesVendedor = agendamentos
      .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
      .filter(ag => ag.vendedor_id && ag.vendedor_nome) // Apenas com vendedor
      .filter(ag => {
        if (!ag.data_pagamento) return false;
        const dataPagamento = ag.data_pagamento.substring(0, 7); // YYYY-MM
        return dataPagamento === mesSelecionadoPDF;
      });

    // Agrupar por vendedor
    const agendamentosPorVendedor = {};
    agendamentosMesVendedor.forEach(ag => {
      const vendedorId = ag.vendedor_id;
      if (!agendamentosPorVendedor[vendedorId]) {
        agendamentosPorVendedor[vendedorId] = {
          nome: ag.vendedor_nome,
          agendamentos: []
        };
      }
      agendamentosPorVendedor[vendedorId].agendamentos.push(ag);
    });

    const listaVendedores = Object.values(agendamentosPorVendedor);

    await base44.entities.LogAcao.create({
      tipo: "gerou_relatorio_pdf",
      usuario_email: usuarioAtual?.email,
      descricao: `Gerou relatório de vendedores em PDF - Mês: ${format(new Date(ano, mes - 1), "MMMM/yyyy", { locale: ptBR })}, ${agendamentosMesVendedor.length} registros`,
      entidade_tipo: "RelatorioFinanceiro"
    });

    const printWindow = window.open('', '_blank');
    const mesNome = format(new Date(ano, mes - 1), "MMMM 'de' yyyy", { locale: ptBR });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Vendedores - ${mesNome}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { color: #3b82f6; margin-bottom: 5px; }
            h2 { color: #374151; margin-top: 25px; margin-bottom: 10px; font-size: 16px; }
            h3 { color: #6b7280; margin-top: 20px; margin-bottom: 8px; font-size: 14px; background-color: #f3f4f6; padding: 8px; border-left: 4px solid #3b82f6; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; font-size: 11px; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .total { font-weight: bold; background-color: #fef3c7; }
            .text-right { text-align: right; }
            .summary-box { background-color: #eff6ff; border: 2px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .page-break { page-break-before: always; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>📊 Relatório Detalhado por Vendedor</h1>
          <p><strong>Período:</strong> ${mesNome}</p>
          <p><strong>Data de Emissão:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          <p><strong>Total de Agendamentos com Vendedor:</strong> ${agendamentosMesVendedor.length}</p>

          ${listaVendedores.map((vendedor, idx) => {
            const totalCombinado = vendedor.agendamentos.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
            const totalPago = vendedor.agendamentos.reduce((sum, ag) => sum + (ag.valor_pago || 0), 0);
            const totalAReceber = vendedor.agendamentos.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);

            return `
              <div class="${idx > 0 ? 'page-break' : ''}">
                <h3>👤 ${vendedor.nome}</h3>
                
                <div class="summary-box">
                  <p style="margin: 5px 0;"><strong>Total de Vendas:</strong> ${vendedor.agendamentos.length} agendamentos</p>
                  <p style="margin: 5px 0;"><strong>Valor Total Combinado:</strong> ${formatarMoeda(totalCombinado)}</p>
                  <p style="margin: 5px 0;"><strong>Valor Total Recebido:</strong> <span style="color: #10b981;">${formatarMoeda(totalPago)}</span></p>
                  <p style="margin: 5px 0;"><strong>Valor Total a Receber:</strong> <span style="color: #f97316;">${formatarMoeda(totalAReceber)}</span></p>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Data Pgto.</th>
                      <th>Número</th>
                      <th>Cliente</th>
                      <th>Profissional</th>
                      <th class="text-right">Vlr. Combinado</th>
                      <th class="text-right">Sinal</th>
                      <th class="text-right">Receb. 2</th>
                      <th class="text-right">Final</th>
                      <th class="text-right">Total Pago</th>
                      <th class="text-right">Falta</th>
                      <th>Status</th>
                      <th>Data Agend.</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vendedor.agendamentos
                      .sort((a, b) => new Date(b.data_pagamento || 0) - new Date(a.data_pagamento || 0))
                      .map(ag => `
                        <tr>
                          <td>${ag.data_pagamento ? format(criarDataPura(ag.data_pagamento), "dd/MM/yyyy", { locale: ptBR }) : "-"}</td>
                          <td>${ag.cliente_telefone || "-"}</td>
                          <td>${ag.cliente_nome || "-"}</td>
                          <td>${ag.profissional_nome || "-"}</td>
                          <td class="text-right">${formatarMoeda(ag.valor_combinado)}</td>
                          <td class="text-right" style="color: #10b981;">${formatarMoeda(ag.sinal)}</td>
                          <td class="text-right" style="color: #10b981;">${formatarMoeda(ag.recebimento_2)}</td>
                          <td class="text-right" style="color: #10b981;">${formatarMoeda(ag.final_pagamento)}</td>
                          <td class="text-right" style="color: #10b981; font-weight: 600;">${formatarMoeda((ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0))}</td>
                          <td class="text-right" style="color: #f97316;">${formatarMoeda(ag.falta_quanto)}</td>
                          <td>${ag.status || "-"}</td>
                          <td>${ag.data ? format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}</td>
                        </tr>
                    `).join('')}
                    <tr class="total">
                      <td colspan="4"><strong>TOTAL - ${vendedor.nome}</strong></td>
                      <td class="text-right"><strong>${formatarMoeda(totalCombinado)}</strong></td>
                      <td class="text-right"><strong>${formatarMoeda(totalSinal)}</strong></td>
                      <td class="text-right"><strong>${formatarMoeda(totalRecebimento2)}</strong></td>
                      <td class="text-right"><strong>${formatarMoeda(totalFinalPagamento)}</strong></td>
                      <td class="text-right"><strong>${formatarMoeda(totalPago)}</strong></td>
                      <td class="text-right"><strong>${formatarMoeda(totalAReceber)}</strong></td>
                      <td colspan="2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}

          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #d1d5db; text-align: center; color: #6b7280;">
            <p style="margin: 5px 0;">Relatório gerado automaticamente pelo sistema</p>
            <p style="margin: 5px 0; font-size: 10px;">Total de ${agendamentosMesVendedor.length} agendamentos com vendedor no período</p>
          </div>

          <button onclick="window.print()" style="margin-top: 30px; padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
            🖨️ Imprimir / Salvar como PDF
          </button>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setDialogExportarPDF(false);
  };

  const exportarCSV = async () => {
    // Registrar exportação no log
    await base44.entities.LogAcao.create({
      tipo: "gerou_relatorio_csv",
      usuario_email: usuarioAtual?.email,
      descricao: `Gerou relatório financeiro CSV - Período: ${periodo}, ${agendamentosFiltrados.length} registros`,
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
    ano: "Este Ano",
    personalizado: "Personalizado"
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
              <p className="text-sm text-gray-500">
                {periodoLabels[periodo]} - {agendamentosFiltrados.length} agendamentos
                {tipoDataFiltro === "data_pagamento" ? " (por data de pagamento)" : " (por data de conversão)"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button onClick={() => setDialogVendedorAberto(true)} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Vendedor
              </Button>
            )}
            <Button onClick={() => setDialogExportarPDF(true)} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
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
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Data</label>
              <Select value={tipoDataFiltro} onValueChange={setTipoDataFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data_pagamento">📅 Data de Pagamento</SelectItem>
                  <SelectItem value="data_conversao">✅ Data de Conversão</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {tipoDataFiltro === "data_pagamento" ? "Filtrando por data de pagamento" : "Filtrando por data de conversão"}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={periodo} onValueChange={(value) => {
                setPeriodo(value);
                if (value !== "personalizado") setDataPersonalizada(null);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="ano">Este Ano</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {periodo === "personalizado" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-2">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {dataPersonalizada ? format(new Date(dataPersonalizada), "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataPersonalizada ? new Date(dataPersonalizada) : undefined}
                      onSelect={(date) => setDataPersonalizada(date)}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {periodo === "dia" && `📅 ${format(new Date(), "dd 'de' MMMM", { locale: ptBR })}`}
                {periodo === "semana" && `📅 ${format(startOfWeek(new Date(), { locale: ptBR }), "dd/MM")} - ${format(endOfWeek(new Date(), { locale: ptBR }), "dd/MM")}`}
                {periodo === "mes" && `📅 ${format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}`}
                {periodo === "ano" && `📅 ${format(new Date(), "yyyy")}`}
                {periodo === "personalizado" && dataPersonalizada && `📅 ${format(new Date(dataPersonalizada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
              </p>
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
               <div className="text-2xl font-bold text-blue-600">{formatarMoeda(totalCombinadoDisplay)}</div>
               <p className="text-xs text-gray-500 mt-1">{agendamentosMesSelecionado ? agendamentosMesSelecionado.length : agendamentosFiltrados.length} agendamentos</p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
               <TrendingUp className="h-4 w-4 text-emerald-600" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-emerald-600">{formatarMoeda(totalPagoDisplay)}</div>
               <p className="text-xs text-gray-500 mt-1">
                 {totalCombinadoDisplay > 0 ? `${((totalPagoDisplay / totalCombinadoDisplay) * 100).toFixed(1)}%` : "0%"} do total
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
               <TrendingDown className="h-4 w-4 text-orange-600" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-orange-600">{formatarMoeda(totalAReceberDisplay)}</div>
               <p className="text-xs text-gray-500 mt-1">
                 {totalCombinadoDisplay > 0 ? `${((totalAReceberDisplay / totalCombinadoDisplay) * 100).toFixed(1)}%` : "0%"} pendente
               </p>
             </CardContent>
           </Card>
         </div>

        {/* Tabelas por Profissional e Unidade */}
         <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
           <TabsList>
             <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
             <TabsTrigger value="analise-dia">📅 Análise do Dia</TabsTrigger>
             <TabsTrigger value="profissional">Por Profissional</TabsTrigger>
             <TabsTrigger value="unidade">Por Unidade</TabsTrigger>
             <TabsTrigger value="analise-mensal">Análise Mensal</TabsTrigger>
             <TabsTrigger value="detalhado">Detalhado</TabsTrigger>
             <TabsTrigger value="por-vendedor">Por Vendedor</TabsTrigger>
             <TabsTrigger value="terapeuta-recepcao">🤝 Terapeuta x Recepção</TabsTrigger>
           </TabsList>

          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* KPIs Principais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700">💰 Faturamento Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-900">{formatarMoeda(totalCombinado)}</div>
                    <p className="text-xs text-blue-600 mt-1">{agendamentosFiltrados.length} agendamentos</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-emerald-200 bg-emerald-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-700">✅ Total Recebido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-900">{formatarMoeda(totalPago)}</div>
                    <p className="text-xs text-emerald-600 mt-1">
                      {totalCombinado > 0 ? `${((totalPago / totalCombinado) * 100).toFixed(1)}%` : "0%"} do total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-700">⏳ A Receber</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-900">{formatarMoeda(totalAReceber)}</div>
                    <p className="text-xs text-orange-600 mt-1">
                      {totalCombinado > 0 ? `${((totalAReceber / totalCombinado) * 100).toFixed(1)}%` : "0%"} pendente
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-purple-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700">📈 Taxa de Conversão</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-900">
                      {totalCombinado > 0 ? `${((totalPago / totalCombinado) * 100).toFixed(1)}%` : "0%"}
                    </div>
                    <p className="text-xs text-purple-600 mt-1">Recebido vs Combinado</p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos Principais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Performance por Profissional */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      Performance por Profissional
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={listaProfissionais.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="nome" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          fontSize={11}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => formatarMoeda(value)}
                          contentStyle={{ fontSize: '12px' }}
                        />
                        <Legend />
                        <Bar dataKey="totalPago" fill="#10b981" name="Recebido" />
                        <Bar dataKey="totalAReceber" fill="#f97316" name="A Receber" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Gráfico de Pizza - Distribuição por Unidade */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-600" />
                      Distribuição por Unidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={listaUnidades}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ nome, totalPago }) => `${nome}: ${formatarMoeda(totalPago)}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="totalPago"
                        >
                          {listaUnidades.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatarMoeda(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de Tendência ao Longo do Tempo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Tendência de Faturamento nos Últimos Meses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Agrupar agendamentos por mês dos últimos 6 meses
                    const hoje = new Date();
                    const dadosPorMes = [];
                    
                    for (let i = 5; i >= 0; i--) {
                      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                      const mesAno = format(mes, "yyyy-MM");
                      
                      const agendamentosMes = agendamentos
                        .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
                        .filter(ag => ag.data && ag.data.substring(0, 7) === mesAno);
                      
                      const totalCombinadoMes = agendamentosMes.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
                      const totalPagoMes = agendamentosMes.reduce((sum, ag) => 
                        sum + (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0), 0
                      );
                      const totalAReceberMes = agendamentosMes.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);
                      
                      dadosPorMes.push({
                        mes: format(mes, "MMM/yy", { locale: ptBR }),
                        combinado: totalCombinadoMes,
                        recebido: totalPagoMes,
                        aReceber: totalAReceberMes
                      });
                    }
                    
                    return (
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={dadosPorMes}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mes" />
                          <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                          <Tooltip 
                            formatter={(value) => formatarMoeda(value)}
                            contentStyle={{ fontSize: '12px' }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="combinado" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            name="Valor Combinado"
                            dot={{ r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="recebido" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            name="Recebido"
                            dot={{ r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="aReceber" 
                            stroke="#f97316" 
                            strokeWidth={2}
                            name="A Receber"
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Tabela Resumida de Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle>🏆 Top 5 Profissionais do Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Profissional</TableHead>
                        <TableHead className="text-right">Atendimentos</TableHead>
                        <TableHead className="text-right">Total Recebido</TableHead>
                        <TableHead className="text-right">Ticket Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listaProfissionais.slice(0, 5).map((prof, idx) => {
                        const ticketMedio = prof.quantidade > 0 ? prof.totalPago / prof.quantidade : 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-bold text-lg">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`}
                            </TableCell>
                            <TableCell className="font-medium">{prof.nome}</TableCell>
                            <TableCell className="text-right">{prof.quantidade}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-semibold">
                              {formatarMoeda(prof.totalPago)}
                            </TableCell>
                            <TableCell className="text-right text-blue-600">
                              {formatarMoeda(ticketMedio)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

           <TabsContent value="analise-dia">
             <Card>
               <CardHeader>
                 <CardTitle>📅 Análise do Dia - {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} (por Data de Pagamento)</CardTitle>
               </CardHeader>
               <CardContent>
                 {(() => {
                   const hoje = format(new Date(), "yyyy-MM-dd");
                   const agendamentosHoje = agendamentos
                     .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
                     .filter(ag => ag.data_pagamento === hoje);

                   const totalCombinadoHoje = agendamentosHoje.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
                   const totalSinalHoje = agendamentosHoje.reduce((sum, ag) => sum + (ag.sinal || 0), 0);
                   const totalRecebimento2Hoje = agendamentosHoje.reduce((sum, ag) => sum + (ag.recebimento_2 || 0), 0);
                   const totalFinalPagamentoHoje = agendamentosHoje.reduce((sum, ag) => sum + (ag.final_pagamento || 0), 0);
                   const totalPagoHoje = totalSinalHoje + totalRecebimento2Hoje + totalFinalPagamentoHoje;
                   const totalAReceberHoje = agendamentosHoje.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);

                   // Formas de pagamento do dia
                   const formasPagamentoHoje = {
                     pix: 0,
                     link_pagamento: 0,
                     pago_na_clinica: 0
                   };
                   agendamentosHoje.forEach(ag => {
                     const forma = ag.forma_pagamento || "pago_na_clinica";
                     const totalPagoAg = (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
                     if (formasPagamentoHoje[forma] !== undefined) {
                       formasPagamentoHoje[forma] += totalPagoAg;
                     }
                   });

                   return (
                     <div className="space-y-6">
                       <div className="grid grid-cols-4 gap-4">
                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                           <p className="text-sm text-blue-600 mb-1">Agendamentos</p>
                           <p className="text-3xl font-bold text-blue-700">{agendamentosHoje.length}</p>
                         </div>
                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                           <p className="text-sm text-blue-600 mb-1">Valor Combinado</p>
                           <p className="text-2xl font-bold text-blue-700">{formatarMoeda(totalCombinadoHoje)}</p>
                         </div>
                         <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                           <p className="text-sm text-emerald-600 mb-1">Total Recebido</p>
                           <p className="text-2xl font-bold text-emerald-700">{formatarMoeda(totalPagoHoje)}</p>
                         </div>
                         <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                           <p className="text-sm text-orange-600 mb-1">A Receber</p>
                           <p className="text-2xl font-bold text-orange-700">{formatarMoeda(totalAReceberHoje)}</p>
                         </div>
                       </div>

                       {/* Formas de Pagamento do Dia */}
                       <div className="bg-white rounded-lg border border-gray-200 p-4">
                         <h3 className="font-semibold text-lg mb-4">💳 Formas de Pagamento</h3>
                         <div className="grid grid-cols-3 gap-4">
                           <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                             <p className="text-sm text-blue-600 mb-2">📱 PIX</p>
                             <p className="text-2xl font-bold text-blue-700">{formatarMoeda(formasPagamentoHoje.pix)}</p>
                           </div>
                           <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
                             <p className="text-sm text-purple-600 mb-2">🔗 Link de Pagamento</p>
                             <p className="text-2xl font-bold text-purple-700">{formatarMoeda(formasPagamentoHoje.link_pagamento)}</p>
                           </div>
                           <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-center">
                             <p className="text-sm text-amber-600 mb-2">💳 Pago na Clínica</p>
                             <p className="text-2xl font-bold text-amber-700">{formatarMoeda(formasPagamentoHoje.pago_na_clinica)}</p>
                           </div>
                         </div>
                       </div>

                       {/* Tabela de Agendamentos do Dia */}
                       <div>
                         <h3 className="font-semibold text-lg mb-4">Agendamentos de Hoje</h3>
                         {agendamentosHoje.length > 0 ? (
                           <Table>
                             <TableHeader>
                               <TableRow>
                                 <TableHead>Horário</TableHead>
                                 <TableHead>Cliente</TableHead>
                                 <TableHead>Profissional</TableHead>
                                 <TableHead>Unidade</TableHead>
                                 <TableHead>Vendedor</TableHead>
                                 <TableHead>Data do Pagamento</TableHead>
                                 <TableHead className="text-right">Vlr. Combinado</TableHead>
                                 <TableHead className="text-right">Total Pago</TableHead>
                                 <TableHead className="text-right">A Receber</TableHead>
                                 <TableHead>Forma Pagamento</TableHead>
                                 <TableHead>Comprovante</TableHead>
                                 <TableHead>Observações</TableHead>
                                 <TableHead>Obs. Vendedor</TableHead>
                                 <TableHead>Anotações</TableHead>
                               </TableRow>
                             </TableHeader>
                             <TableBody>
                               {agendamentosHoje.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)).map(ag => {
                                 const totalPagoAg = (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
                                 const formaLabel = {
                                   pix: "📱 PIX",
                                   link_pagamento: "🔗 Link",
                                   pago_na_clinica: "💳 Clínica"
                                 }[ag.forma_pagamento] || "-";

                                 return (
                                   <TableRow key={ag.id}>
                                     <TableCell className="font-medium">{ag.hora_inicio} - {ag.hora_fim}</TableCell>
                                     <TableCell>{ag.cliente_nome}</TableCell>
                                     <TableCell>{ag.profissional_nome}</TableCell>
                                     <TableCell>{ag.unidade_nome}</TableCell>
                                     <TableCell>{ag.vendedor_nome || "-"}</TableCell>
                                     <TableCell>{ag.data_pagamento ? format(criarDataPura(ag.data_pagamento), "dd/MM/yyyy", { locale: ptBR }) : "-"}</TableCell>
                                     <TableCell className="text-right">{formatarMoeda(ag.valor_combinado)}</TableCell>
                                     <TableCell className="text-right text-emerald-600 font-semibold">{formatarMoeda(totalPagoAg)}</TableCell>
                                     <TableCell className="text-right text-orange-600">{formatarMoeda(ag.falta_quanto)}</TableCell>
                                     <TableCell>{formaLabel}</TableCell>
                                     <TableCell>
                                       <div className="flex gap-1 flex-wrap">
                                         {[1, 2, 3, 4, 5].map(num => {
                                           const comprovante = ag[`comprovante_${num}`];
                                           if (!comprovante) return null;
                                           return (
                                             <Button
                                               key={num}
                                               variant="ghost"
                                               size="sm"
                                               onClick={() => setComprovanteVisualizacao(comprovante)}
                                               className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                                             >
                                               <Eye className="w-3 h-3 mr-1" />
                                               {num}
                                             </Button>
                                           );
                                         })}
                                         {!ag.comprovante_1 && !ag.comprovante_2 && !ag.comprovante_3 && !ag.comprovante_4 && !ag.comprovante_5 && (
                                           <span className="text-xs text-gray-400">-</span>
                                         )}
                                       </div>
                                     </TableCell>
                                     <TableCell className="max-w-xs">
                                       {ag.observacoes ? (
                                         <button
                                           onClick={() => setObservacoesDialogAnalise({
                                             cliente: ag.cliente_nome,
                                             texto: ag.observacoes
                                           })}
                                           className="flex items-start gap-1 hover:bg-gray-50 p-1 rounded transition-colors cursor-pointer text-left w-full"
                                         >
                                           <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                           <span className="text-xs text-gray-600 line-clamp-2">
                                             {ag.observacoes}
                                           </span>
                                         </button>
                                       ) : (
                                         <span className="text-gray-400 text-xs">-</span>
                                       )}
                                     </TableCell>
                                     <TableCell className="max-w-xs">
                                       {ag.observacoes_vendedores ? (
                                         <button
                                           onClick={() => setObservacoesDialogAnalise({
                                             cliente: ag.cliente_nome,
                                             texto: ag.observacoes_vendedores
                                           })}
                                           className="flex items-start gap-1 hover:bg-gray-50 p-1 rounded transition-colors cursor-pointer text-left w-full"
                                         >
                                           <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                           <span className="text-xs text-gray-600 line-clamp-2">
                                             {ag.observacoes_vendedores}
                                           </span>
                                         </button>
                                       ) : (
                                         <span className="text-gray-400 text-xs">-</span>
                                       )}
                                     </TableCell>
                                     <TableCell className="max-w-xs">
                                       {ag.anotacao_venda ? (
                                         <span className="text-xs text-gray-600 line-clamp-2">
                                           {ag.anotacao_venda}
                                         </span>
                                       ) : (
                                         <span className="text-gray-400 text-xs">-</span>
                                       )}
                                     </TableCell>
                                   </TableRow>
                                 );
                               })}
                             </TableBody>
                           </Table>
                         ) : (
                           <div className="text-center py-12 text-gray-500">
                             <p className="font-medium">Nenhum agendamento para hoje</p>
                           </div>
                         )}
                       </div>
                     </div>
                   );
                 })()}
               </CardContent>
             </Card>
           </TabsContent>

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

          <TabsContent value="analise-mensal">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>📊 Análise Mês a Mês (por Data de Pagamento)</CardTitle>
                  <Input
                    type="month"
                    value={mesAnoAnalise}
                    onChange={(e) => setMesAnoAnalise(e.target.value)}
                    className="w-48"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const todosAgendamentosMes = agendamentos
                    .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
                    .filter(ag => {
                      if (!ag.data_pagamento) return false;
                      return ag.data_pagamento.substring(0, 7) === mesAnoAnalise;
                    })
                    .filter(ag => ag.vendedor_id && ag.vendedor_nome);

                  const vendedoresUnicos = [...new Set(todosAgendamentosMes.map(ag => ag.vendedor_nome))].filter(Boolean);

                  const agendamentosMesAnalise = todosAgendamentosMes.filter(ag => {
                    if (vendedorFiltroAnalise === "todos") return true;
                    return ag.vendedor_nome === vendedorFiltroAnalise;
                  });

                  const totalCombinadoMes = agendamentosMesAnalise.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
                  const totalSinalMes = agendamentosMesAnalise.reduce((sum, ag) => sum + (ag.sinal || 0), 0);
                  const totalRecebimento2Mes = agendamentosMesAnalise.reduce((sum, ag) => sum + (ag.recebimento_2 || 0), 0);
                  const totalFinalPagamentoMes = agendamentosMesAnalise.reduce((sum, ag) => sum + (ag.final_pagamento || 0), 0);
                  const totalPagoMes = totalSinalMes + totalRecebimento2Mes + totalFinalPagamentoMes;
                  const totalAReceberMes = agendamentosMesAnalise.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);

                  // Calcular totais por forma de pagamento
                  const formasPagamento = {
                    pix: 0,
                    link_pagamento: 0,
                    pago_na_clinica: 0
                  };
                  agendamentosMesAnalise.forEach(ag => {
                    const forma = ag.forma_pagamento || "pago_na_clinica";
                    const totalPagoAg = (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
                    if (formasPagamento[forma] !== undefined) {
                      formasPagamento[forma] += totalPagoAg;
                    }
                  });

                  // Agrupar por vendedor
                  const porVendedor = {};
                  agendamentosMesAnalise.forEach(ag => {
                    const vendedorNome = ag.vendedor_nome || "Sem Vendedor";
                    if (!porVendedor[vendedorNome]) {
                      porVendedor[vendedorNome] = {
                        quantidade: 0,
                        totalCombinado: 0,
                        totalSinal: 0,
                        totalRecebimento2: 0,
                        totalFinalPagamento: 0,
                        totalPago: 0,
                        totalAReceber: 0
                      };
                    }
                    porVendedor[vendedorNome].quantidade += 1;
                    porVendedor[vendedorNome].totalCombinado += ag.valor_combinado || 0;
                    porVendedor[vendedorNome].totalSinal += ag.sinal || 0;
                    porVendedor[vendedorNome].totalRecebimento2 += ag.recebimento_2 || 0;
                    porVendedor[vendedorNome].totalFinalPagamento += ag.final_pagamento || 0;
                    porVendedor[vendedorNome].totalPago += (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0);
                    porVendedor[vendedorNome].totalAReceber += ag.falta_quanto || 0;
                  });

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-600 mb-1">Valor Combinado</p>
                          <p className="text-2xl font-bold text-blue-700">{formatarMoeda(totalCombinadoMes)}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-green-600 mb-1">Sinal Recebido</p>
                          <p className="text-2xl font-bold text-green-700">{formatarMoeda(totalSinalMes)}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                          <p className="text-sm text-emerald-600 mb-1">Total Pago</p>
                          <p className="text-2xl font-bold text-emerald-700">{formatarMoeda(totalPagoMes)}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <p className="text-sm text-orange-600 mb-1">A Receber</p>
                          <p className="text-2xl font-bold text-orange-700">{formatarMoeda(totalAReceberMes)}</p>
                        </div>
                      </div>

                      {/* Formas de Pagamento */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold text-lg mb-4">💳 Formas de Pagamento</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                            <p className="text-sm text-blue-600 mb-2">📱 PIX</p>
                            <p className="text-2xl font-bold text-blue-700">{formatarMoeda(formasPagamento.pix)}</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
                            <p className="text-sm text-purple-600 mb-2">🔗 Link de Pagamento</p>
                            <p className="text-2xl font-bold text-purple-700">{formatarMoeda(formasPagamento.link_pagamento)}</p>
                          </div>
                          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-center">
                            <p className="text-sm text-amber-600 mb-2">💳 Pago na Clínica</p>
                            <p className="text-2xl font-bold text-amber-700">{formatarMoeda(formasPagamento.pago_na_clinica)}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg">Desempenho por Vendedor</h3>
                          <Tabs value={vendedorFiltroAnalise} onValueChange={setVendedorFiltroAnalise}>
                            <TabsList>
                              <TabsTrigger value="todos">Todos os Vendedores</TabsTrigger>
                              {vendedoresUnicos.map(vendedor => (
                                <TabsTrigger key={vendedor} value={vendedor}>
                                  {vendedor}
                                </TabsTrigger>
                              ))}
                            </TabsList>
                          </Tabs>
                        </div>
                        
                        <Table>
                           <TableHeader>
                             <TableRow>
                               <TableHead>Vendedor</TableHead>
                               <TableHead>Cliente</TableHead>
                               <TableHead>Telefone</TableHead>
                               <TableHead>Data do Pagamento</TableHead>
                               <TableHead className="text-right">Qtd</TableHead>
                              <TableHead className="text-right">Vlr. Combinado</TableHead>
                              <TableHead className="text-right">Sinal</TableHead>
                              <TableHead className="text-right">Receb. 2</TableHead>
                              <TableHead className="text-right">Final</TableHead>
                              <TableHead className="text-right">Total Pago</TableHead>
                              <TableHead className="text-right">A Receber</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(porVendedor).map(([nome, dados]) => (
                               <TableRow key={nome}>
                                 <TableCell className="font-medium">{nome}</TableCell>
                                 <TableCell>{agendamentosMesAnalise.find(ag => ag.vendedor_nome === nome)?.cliente_nome || "-"}</TableCell>
                                 <TableCell className="text-sm">{agendamentosMesAnalise.find(ag => ag.vendedor_nome === nome)?.cliente_telefone || "-"}</TableCell>
                                 <TableCell>
                                   {agendamentosMesAnalise.find(ag => ag.vendedor_nome === nome)?.data_pagamento 
                                     ? format(criarDataPura(agendamentosMesAnalise.find(ag => ag.vendedor_nome === nome).data_pagamento), "dd/MM/yyyy", { locale: ptBR })
                                     : "-"}
                                 </TableCell>
                                 <TableCell className="text-right">{dados.quantidade}</TableCell>
                                <TableCell className="text-right">{formatarMoeda(dados.totalCombinado)}</TableCell>
                                <TableCell className="text-right text-green-600">{formatarMoeda(dados.totalSinal)}</TableCell>
                                <TableCell className="text-right text-green-600">{formatarMoeda(dados.totalRecebimento2)}</TableCell>
                                <TableCell className="text-right text-green-600">{formatarMoeda(dados.totalFinalPagamento)}</TableCell>
                                <TableCell className="text-right text-emerald-600 font-semibold">{formatarMoeda(dados.totalPago)}</TableCell>
                                <TableCell className="text-right text-orange-600">{formatarMoeda(dados.totalAReceber)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Tabela detalhada de vendas */}
                      <div>
                        <h3 className="font-semibold text-lg mb-4">Vendas Detalhadas</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data/Hora Criação</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Profissional</TableHead>
                                <TableHead>Data Agendamento</TableHead>
                                 <TableHead>Data do Pagamento</TableHead>
                                 <TableHead>Pacote</TableHead>
                                 <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-right">Pago</TableHead>
                                <TableHead className="text-right">A Receber</TableHead>
                                <TableHead>Comprovante 1</TableHead>
                                <TableHead>Observações Vendedor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {agendamentosMesAnalise
                                .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
                                .map((venda) => {
                                  const totalPago = (venda.sinal || 0) + (venda.recebimento_2 || 0) + (venda.final_pagamento || 0);
                                  return (
                                    <TableRow key={venda.id}>
                                      <TableCell>
                                        <div className="flex items-center gap-2 text-sm">
                                          <Calendar className="w-3 h-3 text-gray-400" />
                                          {format(new Date(venda.created_date || venda.data), "dd/MM/yyyy", { locale: ptBR })}
                                          <Clock className="w-3 h-3 text-gray-400 ml-1" />
                                          {format(new Date(venda.created_date || venda.data), "HH:mm", { locale: ptBR })}
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-medium">{venda.cliente_nome}</TableCell>
                                      <TableCell className="text-sm">{venda.cliente_telefone || "-"}</TableCell>
                                      <TableCell>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                          {venda.unidade_nome || "-"}
                                        </span>
                                      </TableCell>
                                      <TableCell>{venda.profissional_nome}</TableCell>
                                      <TableCell>
                                        {venda.data ? format(criarDataPura(venda.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                                      </TableCell>
                                      <TableCell>
                                        {venda.data_pagamento ? format(criarDataPura(venda.data_pagamento), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                                      </TableCell>
                                      <TableCell>
                                        {venda.cliente_pacote === "Sim" ? (
                                          <div className="text-xs">
                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                                              <Package className="w-3 h-3" />
                                              {venda.sessoes_feitas || 0}/{venda.quantas_sessoes || 0}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-xs">-</span>
                                        )}
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
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setImagemDialogAnalise(venda.comprovante_1)}
                                            className="h-8"
                                          >
                                            <ImageIcon className="w-3 h-3 mr-1" />
                                            Ver
                                          </Button>
                                        ) : (
                                          <span className="text-gray-400 text-xs">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="max-w-xs">
                                        {venda.observacoes_vendedores ? (
                                          <button
                                            onClick={() => setObservacoesDialogAnalise({
                                              cliente: venda.cliente_nome,
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
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2">Resumo do Mês</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Total de Agendamentos</p>
                            <p className="text-xl font-bold">{agendamentosMesAnalise.length}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Taxa de Recebimento</p>
                            <p className="text-xl font-bold text-emerald-600">
                              {totalCombinadoMes > 0 ? ((totalPagoMes / totalCombinadoMes) * 100).toFixed(1) : "0"}%
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Taxa Pendente</p>
                            <p className="text-xl font-bold text-orange-600">
                              {totalCombinadoMes > 0 ? ((totalAReceberMes / totalCombinadoMes) * 100).toFixed(1) : "0"}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
              <CardHeader className="space-y-4">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle>Detalhamento Completo</CardTitle>
                  {(isAdmin || usuarioAtual?.cargo === "financeiro") && (
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
                  )}
                </div>
                <div className="w-full">
                  <Input
                    placeholder="Pesquisar por data, número, cliente, profissional, vendedor, valores ou status..."
                    value={pesquisaDetalhado}
                    onChange={(e) => setPesquisaDetalhado(e.target.value)}
                    className="max-w-xl"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4 py-3 min-w-[110px]">Data</TableHead>
                        <TableHead className="px-4 py-3 min-w-[120px]">Número</TableHead>
                        <TableHead className="px-4 py-3 min-w-[150px]">Cliente</TableHead>
                        <TableHead className="px-4 py-3 min-w-[130px]">Profissional</TableHead>
                        <TableHead className="px-4 py-3 min-w-[130px]">Vendedor</TableHead>
                        <TableHead className="text-right px-4 py-3 min-w-[130px]">Vlr. Combinado</TableHead>
                        <TableHead className="text-right px-4 py-3 min-w-[110px]">Sinal</TableHead>
                        <TableHead className="text-right px-4 py-3 min-w-[110px]">Receb. 2</TableHead>
                        <TableHead className="text-right px-4 py-3 min-w-[110px]">Final</TableHead>
                        <TableHead className="text-right px-4 py-3 min-w-[120px]">Total Pago</TableHead>
                        <TableHead className="text-right px-4 py-3 min-w-[110px]">Falta</TableHead>
                        <TableHead className="px-4 py-3 min-w-[100px]">Status</TableHead>
                        <TableHead className="px-4 py-3 min-w-[200px]">Anotação da Venda</TableHead>
                        <TableHead className="px-4 py-3 min-w-[110px]">Criado em</TableHead>
                        <TableHead className="px-4 py-3 min-w-[130px]">Comprovantes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agendamentosFiltrados.filter(ag => {
                        if (!pesquisaDetalhado) return true;
                        const termo = pesquisaDetalhado.toLowerCase();
                        return (
                          ag.data?.includes(termo) ||
                          format(criarDataPura(ag.data || ""), "dd/MM/yyyy", { locale: ptBR }).includes(termo) ||
                          ag.cliente_telefone?.toLowerCase().includes(termo) ||
                          ag.cliente_nome?.toLowerCase().includes(termo) ||
                          ag.profissional_nome?.toLowerCase().includes(termo) ||
                          ag.vendedor_nome?.toLowerCase().includes(termo) ||
                          ag.status?.toLowerCase().includes(termo) ||
                          ag.anotacao_venda?.toLowerCase().includes(termo) ||
                          String(ag.valor_combinado || 0).includes(termo) ||
                          String(ag.sinal || 0).includes(termo) ||
                          String(ag.recebimento_2 || 0).includes(termo) ||
                          String(ag.final_pagamento || 0).includes(termo) ||
                          String(ag.falta_quanto || 0).includes(termo)
                        );
                      }).map((ag) => {
                        const valorCombinado = dadosEditados[ag.id]?.valor_combinado !== undefined 
                          ? dadosEditados[ag.id].valor_combinado 
                          : ag.valor_combinado;
                        const sinal = dadosEditados[ag.id]?.sinal !== undefined 
                          ? dadosEditados[ag.id].sinal 
                          : ag.sinal;
                        const recebimento2 = dadosEditados[ag.id]?.recebimento_2 !== undefined 
                          ? dadosEditados[ag.id].recebimento_2 
                          : ag.recebimento_2;
                        const finalPagamento = dadosEditados[ag.id]?.final_pagamento !== undefined 
                          ? dadosEditados[ag.id].final_pagamento 
                          : ag.final_pagamento;
                        const totalPago = (parseFloat(sinal) || 0) + (parseFloat(recebimento2) || 0) + (parseFloat(finalPagamento) || 0);
                        const faltaQuanto = dadosEditados[ag.id]?.falta_quanto !== undefined 
                          ? dadosEditados[ag.id].falta_quanto 
                          : ag.falta_quanto;
                        const vendedorId = dadosEditados[ag.id]?.vendedor_id !== undefined
                          ? dadosEditados[ag.id].vendedor_id
                          : ag.vendedor_id;
                        const anotacaoVenda = dadosEditados[ag.id]?.anotacao_venda !== undefined
                          ? dadosEditados[ag.id].anotacao_venda
                          : ag.anotacao_venda;
                        
                        return (
                          <TableRow key={ag.id} className={dadosEditados[ag.id] ? "bg-yellow-50" : ""}>
                            <TableCell className="px-4 py-3">
                              {ag.data ? format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                            </TableCell>
                            <TableCell className="text-sm px-4 py-3">{ag.cliente_telefone || "-"}</TableCell>
                            <TableCell className="font-medium px-4 py-3">{ag.cliente_nome}</TableCell>
                            <TableCell className="px-4 py-3">{ag.profissional_nome}</TableCell>
                            <TableCell className="px-4 py-3">
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
                            <TableCell className="text-right px-4 py-3">
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
                            <TableCell className="text-right text-green-600 px-4 py-3">
                              {modoEditor ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={sinal || ""}
                                  onChange={(e) => handleCampoChange(ag.id, "sinal", e.target.value)}
                                  className="w-28 text-right"
                                />
                              ) : (
                                formatarMoeda(sinal)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-green-600 px-4 py-3">
                              {modoEditor ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={recebimento2 || ""}
                                  onChange={(e) => handleCampoChange(ag.id, "recebimento_2", e.target.value)}
                                  className="w-28 text-right"
                                />
                              ) : (
                                formatarMoeda(recebimento2)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-green-600 px-4 py-3">
                              {modoEditor ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={finalPagamento || ""}
                                  onChange={(e) => handleCampoChange(ag.id, "final_pagamento", e.target.value)}
                                  className="w-28 text-right"
                                />
                              ) : (
                                formatarMoeda(finalPagamento)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-semibold px-4 py-3">
                              {formatarMoeda(totalPago)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600 px-4 py-3">
                              {formatarMoeda(faltaQuanto)}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                                {ag.status}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[200px] px-4 py-3">
                              {modoEditor ? (
                                <Textarea
                                  value={anotacaoVenda || ""}
                                  onChange={(e) => setDadosEditados(prev => ({
                                    ...prev,
                                    [ag.id]: {
                                      ...prev[ag.id],
                                      anotacao_venda: e.target.value
                                    }
                                  }))}
                                  placeholder="Anotação da venda..."
                                  className="text-xs min-h-[60px]"
                                  rows={2}
                                />
                              ) : (
                                <span className="text-xs text-gray-600 line-clamp-2">
                                  {anotacaoVenda || "-"}
                                </span>
                              )}
                              </TableCell>
                              <TableCell className="px-4 py-3">
                              <div className="text-xs text-gray-600">
                                {ag.created_date ? (
                                  <>
                                    <div>{format(new Date(ag.created_date), "dd/MM/yyyy", { locale: ptBR })}</div>
                                    <div className="text-gray-500">{format(new Date(ag.created_date), "HH:mm", { locale: ptBR })}</div>
                                  </>
                                ) : "-"}
                              </div>
                              </TableCell>
                              <TableCell className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {[1, 2, 3, 4, 5].map(num => {
                                  const comprovante = ag[`comprovante_${num}`];
                                  if (!comprovante) return null;
                                  return (
                                    <Button
                                      key={num}
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setComprovanteVisualizacao(comprovante)}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      {num}
                                    </Button>
                                  );
                                })}
                                {!ag.comprovante_1 && !ag.comprovante_2 && !ag.comprovante_3 && !ag.comprovante_4 && !ag.comprovante_5 && (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </div>
                            </TableCell>
                            </TableRow>
                            );
                            })}
                            </TableBody>
                            </Table>
                            </div>

                {agendamentosFiltrados.filter(ag => {
                  if (!pesquisaDetalhado) return true;
                  const termo = pesquisaDetalhado.toLowerCase();
                  return (
                    ag.data?.includes(termo) ||
                    format(criarDataPura(ag.data || ""), "dd/MM/yyyy", { locale: ptBR }).includes(termo) ||
                    ag.cliente_telefone?.toLowerCase().includes(termo) ||
                    ag.cliente_nome?.toLowerCase().includes(termo) ||
                    ag.profissional_nome?.toLowerCase().includes(termo) ||
                    ag.vendedor_nome?.toLowerCase().includes(termo) ||
                    ag.status?.toLowerCase().includes(termo) ||
                    ag.anotacao_venda?.toLowerCase().includes(termo) ||
                    String(ag.valor_combinado || 0).includes(termo) ||
                    String(ag.sinal || 0).includes(termo) ||
                    String(ag.recebimento_2 || 0).includes(termo) ||
                    String(ag.final_pagamento || 0).includes(termo) ||
                    String(ag.falta_quanto || 0).includes(termo)
                  );
                }).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">Nenhum agendamento encontrado</p>
                    <p className="text-sm mt-2">Tente ajustar os filtros ou a pesquisa para ver os dados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Terapeuta x Recepção */}
          <TabsContent value="terapeuta-recepcao">
            <Card>
              <CardHeader>
                <CardTitle>🤝 Análise Cruzada: Terapeuta x Recepção</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Planos terapêuticos fechados - Análise de vendas por terapeuta e recepcionista
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Filtrar leads convertidos (com data_conversao e status convertido)
                  const leadsConvertidos = leads.filter(lead => {
                    if (!lead.convertido) return false;
                    if (!lead.data_conversao) return false;
                    
                    // Aplicar filtro de período baseado no tipo de data selecionado
                    let dataParaFiltro;
                    if (tipoDataFiltro === "data_conversao") {
                      dataParaFiltro = lead.data_conversao;
                    } else {
                      // Se não tiver data de pagamento no lead, não incluir
                      return false;
                    }
                    
                    if (!dataParaFiltro) return false;
                    if (dataParaFiltro < dataInicio || dataParaFiltro > dataFim) return false;

                    // Filtro de unidade
                    if (unidadeFiltro !== "todas" && lead.unidade_id !== unidadeFiltro) return false;

                    return true;
                  });

                  // Calcular tempo médio de conversão
                  const temposConversao = [];
                  leadsConvertidos.forEach(lead => {
                    if (lead.data_entrada && lead.data_conversao) {
                      const entrada = new Date(lead.data_entrada);
                      const conversao = new Date(lead.data_conversao);
                      const diffDias = Math.floor((conversao - entrada) / (1000 * 60 * 60 * 24));
                      if (diffDias >= 0) {
                        temposConversao.push(diffDias);
                      }
                    }
                  });
                  
                  const tempoMedioConversao = temposConversao.length > 0
                    ? temposConversao.reduce((a, b) => a + b, 0) / temposConversao.length
                    : 0;

                  // Calcular métricas
                  const totalConversoes = leadsConvertidos.length;
                  const valorTotalOriginal = leadsConvertidos.reduce((sum, l) => sum + (l.valor_original || 0), 0);
                  const valorTotalFinal = leadsConvertidos.reduce((sum, l) => sum + (l.valor_final || 0), 0);
                  const descontoTotal = valorTotalOriginal - valorTotalFinal;

                  // Agrupar por terapeuta
                  const porTerapeuta = {};
                  leadsConvertidos.forEach(lead => {
                    const terapeuta = lead.terapeuta_nome || "Sem Terapeuta";
                    if (!porTerapeuta[terapeuta]) {
                      porTerapeuta[terapeuta] = {
                        conversoes: 0,
                        valorTotal: 0
                      };
                    }
                    porTerapeuta[terapeuta].conversoes++;
                    porTerapeuta[terapeuta].valorTotal += (lead.valor_final || 0);
                  });

                  // Agrupar por recepcionista
                  const porRecepcao = {};
                  leadsConvertidos.forEach(lead => {
                    const recepcao = lead.recepcao_vendeu || "Sem Recepção";
                    if (!porRecepcao[recepcao]) {
                      porRecepcao[recepcao] = {
                        conversoes: 0,
                        valorTotal: 0
                      };
                    }
                    porRecepcao[recepcao].conversoes++;
                    porRecepcao[recepcao].valorTotal += (lead.valor_final || 0);
                  });

                  return (
                    <div className="space-y-6">
                      {/* Métricas Resumidas */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-600 mb-1">Total de Conversões</p>
                          <p className="text-3xl font-bold text-blue-700">{totalConversoes}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-600 mb-1">Valor Original Total</p>
                          <p className="text-2xl font-bold text-purple-700">{formatarMoeda(valorTotalOriginal)}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <p className="text-sm text-orange-600 mb-1">Desconto Total</p>
                          <p className="text-2xl font-bold text-orange-700">{formatarMoeda(descontoTotal)}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                          <p className="text-sm text-emerald-600 mb-1">Valor Final Total</p>
                          <p className="text-2xl font-bold text-emerald-700">{formatarMoeda(valorTotalFinal)}</p>
                        </div>

                      </div>

                      {/* Gráficos de Performance */}
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Top Terapeutas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {Object.entries(porTerapeuta)
                                .sort((a, b) => b[1].conversoes - a[1].conversoes)
                                .slice(0, 5)
                                .map(([nome, dados]) => (
                                  <div key={nome} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="text-sm font-medium">{nome}</span>
                                    <div className="text-right">
                                      <span className="text-sm text-blue-600 font-semibold">{dados.conversoes} vendas</span>
                                      <span className="text-xs text-gray-600 ml-2">{formatarMoeda(dados.valorTotal)}</span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Top Recepcionistas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {Object.entries(porRecepcao)
                                .sort((a, b) => b[1].conversoes - a[1].conversoes)
                                .slice(0, 5)
                                .map(([nome, dados]) => (
                                  <div key={nome} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="text-sm font-medium">{nome}</span>
                                    <div className="text-right">
                                      <span className="text-sm text-green-600 font-semibold">{dados.conversoes} vendas</span>
                                      <span className="text-xs text-gray-600 ml-2">{formatarMoeda(dados.valorTotal)}</span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Tabela Detalhada */}
                      <div>
                        <h3 className="font-semibold text-lg mb-4">Planos Terapêuticos Fechados - Detalhado</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                               <TableRow>
                                 <TableHead>Cliente</TableHead>
                                 <TableHead>Telefone</TableHead>
                                 <TableHead>Plano Fechado</TableHead>
                                 <TableHead>Data de Conversão</TableHead>
                                 <TableHead>Terapeuta</TableHead>
                                 <TableHead>Recepção</TableHead>
                                 <TableHead className="text-center">Fechou ?</TableHead>
                                 <TableHead className="text-right">Valor Original</TableHead>
                                 <TableHead className="text-right">Desconto (%)</TableHead>
                                 <TableHead className="text-right">Valor Final</TableHead>
                                 <TableHead>Forma de Pagamento</TableHead>
                                 <TableHead className="text-center">Quantas Vezes</TableHead>
                               </TableRow>
                             </TableHeader>
                            <TableBody>
                              {leadsConvertidos
                                .sort((a, b) => new Date(b.data_conversao || 0) - new Date(a.data_conversao || 0))
                                .map((lead) => {
                                  const valorOriginal = lead.valor_original || 0;
                                  const valorFinal = lead.valor_final || 0;
                                  const desconto = valorOriginal > 0 ? ((valorOriginal - valorFinal) / valorOriginal * 100) : 0;
                                  const convertido = lead.convertido ? "SIM, FECHOU PLANO" : "NÃO FECHOU";

                                  return (
                                    <TableRow key={lead.id}>
                                      <TableCell className="font-semibold">{lead.nome}</TableCell>
                                      <TableCell className="text-sm">{lead.telefone || "-"}</TableCell>
                                      <TableCell>
                                        <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                          {lead.plano_terapeutico_fechado || "-"}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        {lead.data_conversao ? format(criarDataPura(lead.data_conversao), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {lead.terapeuta_nome || "-"}
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                          {lead.recepcao_vendeu || "Sem Recepção"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <span className="text-sm font-semibold">
                                          {convertido}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right text-gray-600">
                                        {formatarMoeda(valorOriginal)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="text-orange-600 font-medium">
                                          {desconto.toFixed(1)}%
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right text-emerald-600 font-bold">
                                        {formatarMoeda(valorFinal)}
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm">
                                          {lead.forma_pagamento === "pix" ? "📱 PIX" :
                                           lead.forma_pagamento === "link_pagamento" ? "🔗 Link" :
                                           lead.forma_pagamento === "pago_na_clinica" ? "💳 Clínica" :
                                           lead.forma_pagamento || "-"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <span className="text-sm font-semibold bg-gray-100 px-2 py-1 rounded">
                                          {lead.quantas_vezes || "1"}x
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>

                        {leadsConvertidos.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            <p className="font-medium">Nenhum plano terapêutico fechado neste período</p>
                            <p className="text-sm mt-2">Ajuste os filtros para ver os dados</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Por Vendedor */}
          <TabsContent value="por-vendedor">
            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Vendedor (Data do Pagamento)</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Este relatório considera apenas agendamentos com data de pagamento dentro do período selecionado
                </p>
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
                      // Filtrar por data de pagamento (não por data do agendamento)
                      const agendamentosVendedor = agendamentos
                        .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
                        .filter(ag => ag.vendedor_id === vendedor.id)
                        .filter(ag => {
                          // Filtrar por data de pagamento
                          if (!ag.data_pagamento) return false;
                          const dataPagamento = ag.data_pagamento;
                          if (dataPagamento < dataInicio || dataPagamento > dataFim) return false;

                          // Aplicar outros filtros
                          if (unidadeFiltro !== "todas" && ag.unidade_id !== unidadeFiltro) return false;
                          if (profissionalFiltro !== "todos" && ag.profissional_id !== profissionalFiltro) return false;

                          return true;
                        });

                      const totalCombinado = agendamentosVendedor.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
                      const totalSinal = agendamentosVendedor.reduce((sum, ag) => sum + (ag.sinal || 0), 0);
                      const totalRecebimento2 = agendamentosVendedor.reduce((sum, ag) => sum + (ag.recebimento_2 || 0), 0);
                      const totalFinalPagamento = agendamentosVendedor.reduce((sum, ag) => sum + (ag.final_pagamento || 0), 0);
                      const totalRecebido = totalSinal + totalRecebimento2 + totalFinalPagamento;
                      const totalAReceber = totalCombinado - totalRecebido;

                      // Não mostrar vendedores sem vendas no período
                      if (agendamentosVendedor.length === 0) return null;

                      return (
                        <TableRow key={vendedor.id}>
                          <TableCell className="font-medium">{vendedor.nome}</TableCell>
                          <TableCell className="text-right">{agendamentosVendedor.length}</TableCell>
                          <TableCell className="text-right">{formatarMoeda(totalCombinado)}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">
                            {formatarMoeda(totalRecebido)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatarMoeda(totalAReceber)}
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

                {vendedores.filter(v => {
                  const agendamentosVendedor = agendamentos
                    .filter(ag => ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO")
                    .filter(ag => ag.vendedor_id === v.id)
                    .filter(ag => {
                      if (!ag.data_pagamento) return false;
                      const dataPagamento = ag.data_pagamento;
                      if (dataPagamento < dataInicio || dataPagamento > dataFim) return false;
                      if (unidadeFiltro !== "todas" && ag.unidade_id !== unidadeFiltro) return false;
                      if (profissionalFiltro !== "todos" && ag.profissional_id !== profissionalFiltro) return false;
                      return true;
                    });
                  return agendamentosVendedor.length > 0;
                }).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="font-medium">Nenhuma venda com data de pagamento neste período</p>
                    <p className="text-sm mt-2">As vendas só aparecem quando possuem data de pagamento cadastrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Visualizar Comprovante */}
      <Dialog open={!!comprovanteVisualizacao} onOpenChange={() => setComprovanteVisualizacao(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comprovante de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {comprovanteVisualizacao && (
              <img 
                src={comprovanteVisualizacao} 
                alt="Comprovante" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComprovanteVisualizacao(null)}>
              Fechar
            </Button>
            <a 
              href={comprovanteVisualizacao} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="bg-blue-600 hover:bg-blue-700">
                Abrir em Nova Aba
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizar Comprovante - Análise */}
      <Dialog open={!!imagemDialogAnalise} onOpenChange={() => setImagemDialogAnalise(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comprovante de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center bg-gray-100 rounded-lg p-4">
            <img 
              src={imagemDialogAnalise} 
              alt="Comprovante" 
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Observações - Análise */}
      <Dialog open={!!observacoesDialogAnalise} onOpenChange={() => setObservacoesDialogAnalise(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Observações do Vendedor - {observacoesDialogAnalise?.cliente}</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {observacoesDialogAnalise?.texto}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Exportar PDF */}
      <Dialog open={dialogExportarPDF} onOpenChange={setDialogExportarPDF}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Relatório em PDF</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione o Tipo de Relatório *</Label>
              <Select value={tipoRelatorioPDF} onValueChange={setTipoRelatorioPDF}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financeiro">📊 Relatório Financeiro Detalhado</SelectItem>
                  <SelectItem value="vendedor">👤 Relatório do Vendedor Detalhado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Selecione o Mês do Relatório *</Label>
              <Select value={mesSelecionadoPDF} onValueChange={setMesSelecionadoPDF}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um mês..." />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponiveis.map(mes => {
                    const [ano, mesNum] = mes.split('-');
                    const mesNome = format(new Date(ano, mesNum - 1), "MMMM 'de' yyyy", { locale: ptBR });
                    return (
                      <SelectItem key={mes} value={mes}>
                        {mesNome}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {tipoRelatorioPDF === "financeiro" ? (
                <p className="text-xs text-gray-500 mt-2">
                  O relatório incluirá todos os agendamentos, detalhamento completo e estatísticas por terapeuta do mês selecionado.
                </p>
              ) : (
               <p className="text-xs text-gray-500 mt-2">
                 O relatório mostrará todos os agendamentos com vendedor cadastrado, separados por vendedor, baseado na DATA DE PAGAMENTO do agendamento.
               </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogExportarPDF(false)}>
              Cancelar
            </Button>
            <Button onClick={exportarPDF} className="bg-red-600 hover:bg-red-700">
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Vendedor */}
      <Dialog open={dialogVendedorAberto} onOpenChange={setDialogVendedorAberto}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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