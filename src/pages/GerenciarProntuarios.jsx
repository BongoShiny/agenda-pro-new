import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Search, CheckCircle, XCircle, Edit, Save, X, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function GerenciarProntuariosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState("");
  const [dialogEditarAberto, setDialogEditarAberto] = useState(false);
  const [prontuarioEditando, setProntuarioEditando] = useState(null);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [dialogCobrarAberto, setDialogCobrarAberto] = useState(false);
  const [agendamentoCobrando, setAgendamentoCobrando] = useState(null);
  const [recepcionistasSelecionados, setRecepcionistasSelecionados] = useState([]);
  const [mensagemAlerta, setMensagemAlerta] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        const temAcesso = user?.cargo === "administrador" || 
                         user?.cargo === "superior" || 
                         user?.role === "admin" || 
                         user?.cargo === "gerencia_unidades" ||
                         user?.cargo === "financeiro";
        
        // Bloquear acesso para recepcionistas
        if (!temAcesso || user?.cargo === "recepcao") {
          navigate(createPageUrl("Agenda"));
        } else {
          // Registrar entrada na área de prontuários
          await base44.entities.LogAcao.create({
            tipo: "acessou_relatorios",
            usuario_email: user.email,
            descricao: "Entrou na área de Gerenciar Prontuários",
            entidade_tipo: "Prontuario"
          });
        }
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();

    // Registrar saída quando componente desmontar
    return () => {
      if (usuarioAtual) {
        base44.entities.LogAcao.create({
          tipo: "acessou_relatorios",
          usuario_email: usuarioAtual.email,
          descricao: "Saiu da área de Gerenciar Prontuários",
          entidade_tipo: "Prontuario"
        }).catch(err => console.error("Erro ao registrar saída:", err));
      }
    };
  }, [navigate]);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-prontuarios'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const { data: prontuarios = [] } = useQuery({
    queryKey: ['prontuarios'],
    queryFn: () => base44.entities.Prontuario.list("-created_date"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-prontuarios'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-recepcionistas'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  // Filtrar recepcionistas
  const recepcionistas = usuarios.filter(u => u.cargo === "recepcao");

  // Filtrar agendamentos não bloqueados
  let agendamentosValidos = agendamentos.filter(ag => 
    ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO"
  );

  // Filtrar por unidades de acesso para gerentes de unidade
  if (usuarioAtual?.cargo === "gerencia_unidades") {
    const unidadesAcesso = usuarioAtual?.unidades_acesso || [];
    agendamentosValidos = agendamentosValidos.filter(ag => unidadesAcesso.includes(ag.unidade_id));
  }

  // Separar agendamentos com e sem prontuário
  const agendamentosComProntuario = agendamentosValidos.filter(ag =>
    prontuarios.some(p => p.agendamento_id === ag.id)
  );

  const agendamentosSemProntuario = agendamentosValidos.filter(ag =>
    !prontuarios.some(p => p.agendamento_id === ag.id)
  );

  // Função para calcular status do prontuário
  const getStatusProntuario = (ag) => {
    const temProntuario = prontuarios.some(p => p.agendamento_id === ag.id);
    
    if (temProntuario) {
      return { label: 'Preenchido', cor: 'bg-green-100 text-green-700', tipo: 'preenchido' };
    }
    
    // Verificar se está atrasado (1 hora após o término)
    const agora = new Date();
    const [ano, mes, dia] = ag.data.split('-').map(Number);
    const [horaFim, minutoFim] = ag.hora_fim.split(':').map(Number);
    const dataFimSessao = new Date(ano, mes - 1, dia, horaFim, minutoFim);
    const umaHoraDepois = new Date(dataFimSessao.getTime() + 60 * 60 * 1000);
    
    if (agora > umaHoraDepois) {
      return { label: '⚠️ Atrasado', cor: 'bg-red-100 text-red-700', tipo: 'atrasado' };
    }
    
    return { label: 'Pendente', cor: 'bg-orange-100 text-orange-700', tipo: 'pendente' };
  };

  // Função de pesquisa
  const filtrarAgendamentos = (lista) => {
    if (!pesquisa) return lista;
    const termo = pesquisa.toLowerCase();
    return lista.filter(ag =>
      ag.cliente_nome?.toLowerCase().includes(termo) ||
      ag.cliente_telefone?.toLowerCase().includes(termo) ||
      ag.unidade_nome?.toLowerCase().includes(termo)
    );
  };

  const abrirEdicao = (agendamento) => {
    const prontuario = prontuarios.find(p => p.agendamento_id === agendamento.id);
    if (!prontuario) return;
    
    setProntuarioEditando({
      ...prontuario,
      terapia_feita: prontuario.terapia_feita || "",
      musculo_liberado: prontuario.musculo_liberado || "",
      sugestoes_proxima_sessao: prontuario.sugestoes_proxima_sessao || "",
      observacoes: prontuario.observacoes || "",
      relato_terapeuta: prontuario.relato_terapeuta || "",
      sessao_plano_terapeutico: prontuario.sessao_plano_terapeutico || ""
    });
    setAgendamentoEditando(agendamento);
    setDialogEditarAberto(true);
  };

  const atualizarProntuarioMutation = useMutation({
    mutationFn: async (dados) => {
      const resultado = await base44.entities.Prontuario.update(prontuarioEditando.id, dados);
      
      // Registrar edição no log
      await base44.entities.LogAcao.create({
        tipo: "editou_prontuario",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Editou prontuário de: ${agendamentoEditando.cliente_nome} - ${agendamentoEditando.data} às ${agendamentoEditando.hora_inicio} na área de Gerenciar Prontuários`,
        entidade_tipo: "Prontuario",
        entidade_id: prontuarioEditando.id,
        dados_antigos: JSON.stringify(prontuarioEditando),
        dados_novos: JSON.stringify(resultado)
      });
      
      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prontuarios'] });
      queryClient.invalidateQueries({ queryKey: ['logs-acoes'] });
      setDialogEditarAberto(false);
      setProntuarioEditando(null);
      setAgendamentoEditando(null);
      alert("✅ Prontuário atualizado com sucesso!");
    }
  });

  const handleSalvarEdicao = () => {
    const { id, agendamento_id, cliente_id, cliente_nome, cliente_telefone, profissional_nome, unidade_nome, data_sessao, criado_por, created_date, updated_date, created_by, ...dados } = prontuarioEditando;
    atualizarProntuarioMutation.mutate(dados);
  };

  const handleAbrirCobrar = (ag) => {
    setAgendamentoCobrando(ag);
    setMensagemAlerta(`⚠️ PRONTUÁRIO ATRASADO - ${ag.cliente_nome}\n\nData: ${format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}\nHorário: ${ag.hora_inicio}\nProfissional: ${ag.profissional_nome}\n\nPor favor, providenciar o preenchimento do prontuário com urgência!`);
    setRecepcionistasSelecionados([]);
    setDialogCobrarAberto(true);
  };

  const enviarAlertaMutation = useMutation({
    mutationFn: async () => {
      const alertas = [];
      for (const email of recepcionistasSelecionados) {
        await base44.entities.Alerta.create({
          usuario_email: email,
          titulo: "⚠️ PRONTUÁRIO ATRASADO",
          mensagem: mensagemAlerta,
          tipo: "prontuario_atrasado",
          agendamento_id: agendamentoCobrando.id,
          enviado_por: usuarioAtual?.email
        });
        alertas.push(email);
      }
      
      // Registrar no log
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Enviou cobrança de prontuário atrasado para: ${alertas.join(", ")} - ${agendamentoCobrando.cliente_nome}`,
        entidade_tipo: "Alerta",
        entidade_id: agendamentoCobrando.id
      });
      
      return alertas;
    },
    onSuccess: (alertas) => {
      setDialogCobrarAberto(false);
      alert(`✅ Alertas enviados com sucesso para ${alertas.length} recepcionista(s)!`);
    }
  });

  const handleEnviarAlertas = () => {
    if (recepcionistasSelecionados.length === 0) {
      alert("⚠️ Selecione pelo menos um recepcionista!");
      return;
    }
    if (!mensagemAlerta.trim()) {
      alert("⚠️ Digite uma mensagem!");
      return;
    }
    enviarAlertaMutation.mutate();
  };

  const toggleRecepcionista = (email) => {
    setRecepcionistasSelecionados(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const exportarProntuario = async (agendamento) => {
    const prontuario = prontuarios.find(p => p.agendamento_id === agendamento.id);
    if (!prontuario) return;

    // Registrar exportação no log
    await base44.entities.LogAcao.create({
      tipo: "gerou_relatorio_pdf",
      usuario_email: usuarioAtual?.email || "sistema",
      descricao: `Exportou PDF do prontuário de: ${agendamento.cliente_nome} - ${agendamento.data} na área de Gerenciar Prontuários`,
      entidade_tipo: "Prontuario",
      entidade_id: prontuario.id
    });

    const dataFormatada = format(criarDataPura(agendamento.data), "dd/MM/yyyy", { locale: ptBR });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prontuário - ${agendamento.cliente_nome}</title>
          <style>
            @page {
              size: A4;
              margin: 8mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 0; 
              background: #fff;
              margin: 0;
            }
            .container {
              max-width: 100%;
              margin: 0 auto;
              border: 4px solid #7C5746;
              padding: 0;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 0;
              padding: 12px 10px;
              background: #7C5746;
            }
            .content {
              padding: 10px;
            }
            .logo {
              width: 60px;
              height: auto;
              margin-bottom: 5px;
            }
            .title {
              color: #fff;
              font-size: 15px;
              font-weight: bold;
              margin: 3px 0;
            }
            .subtitle {
              color: #f9f5f3;
              font-size: 9px;
              font-style: italic;
            }
            .info-section {
              background: #f9f5f3;
              padding: 8px;
              border-radius: 6px;
              margin-bottom: 8px;
              border: 1px solid #d4c5b9;
              box-shadow: 0 1px 2px rgba(0,0,0,0.06);
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
            }
            .info-row {
              display: flex;
              font-size: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #7C5746;
              min-width: 65px;
            }
            .info-value {
              color: #333;
            }
            .field-section {
              margin-bottom: 10px;
              padding: 10px;
              background: #f9f5f3;
              border: 1px solid #d4c5b9;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            .field-label {
              font-weight: bold;
              color: #7C5746;
              font-size: 10px;
              margin-bottom: 4px;
              display: block;
            }
            .field-value {
              color: #333;
              line-height: 1.3;
              white-space: pre-wrap;
              padding: 6px;
              background: #fff;
              border-radius: 4px;
              min-height: 25px;
              font-size: 9px;
              border: 1px solid #e8e0db;
            }
            .footer {
              margin-top: 8px;
              padding: 6px;
              background: #f9f5f3;
              border: 1px solid #d4c5b9;
              border-radius: 6px;
              text-align: center;
              color: #7C5746;
              font-size: 9px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f9217a0dea005bde3c1cc0/e271e046f_image.png" alt="Logo Vibi Terapias" class="logo" />
              <div class="title">FICHA DE PRONTUÁRIO</div>
              <div class="subtitle">Clínica especializada em Dor</div>
            </div>

            <div class="content">
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Paciente:</span>
                <span class="info-value">${agendamento.cliente_nome}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Telefone:</span>
                <span class="info-value">${agendamento.cliente_telefone || "-"}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Profissional:</span>
                <span class="info-value">${agendamento.profissional_nome}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Unidade:</span>
                <span class="info-value">${agendamento.unidade_nome}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Data da Sessão:</span>
                <span class="info-value">${dataFormatada}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Horário:</span>
                <span class="info-value">${agendamento.hora_inicio} - ${agendamento.hora_fim}</span>
              </div>
            </div>

            <div class="field-section">
              <span class="field-label">TERAPIA FEITA:</span>
              <div class="field-value">${prontuario.terapia_feita || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULO LIBERADO:</span>
              <div class="field-value">${prontuario.musculo_liberado || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">SUGESTÕES PARA PRÓXIMA SESSÃO:</span>
              <div class="field-value">${prontuario.sugestoes_proxima_sessao || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">OBSERVAÇÕES:</span>
              <div class="field-value">${prontuario.observacoes || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">RELATO DO TERAPEUTA SOBRE A SESSÃO:</span>
              <div class="field-value">${prontuario.relato_terapeuta || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">QUAL A SESSÃO DO PLANO TERAPÊUTICO:</span>
              <div class="field-value">${prontuario.sessao_plano_terapeutico || "-"}</div>
            </div>

            <div class="footer">
              <p><strong>Vibi Terapias</strong> - Clínica especializada em Dor</p>
              <p>Prontuário gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
            </div>
          </div>

          <button class="no-print" onclick="window.print()" style="
            position: fixed;
            bottom: 30px;
            right: 30px;
            padding: 15px 30px;
            background: #7C5746;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          ">
            🖨️ Imprimir / Salvar como PDF
          </button>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
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
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Prontuários</h1>
              <p className="text-sm text-gray-500">Visualize e exporte prontuários de clientes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Pesquisar por nome, telefone ou unidade..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="com-prontuario" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="com-prontuario">
              Com Prontuário ({filtrarAgendamentos(agendamentosComProntuario).length})
            </TabsTrigger>
            <TabsTrigger value="sem-prontuario">
              Sem Prontuário ({filtrarAgendamentos(agendamentosSemProntuario).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="com-prontuario">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Agendamentos com Prontuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrarAgendamentos(agendamentosComProntuario).map(ag => (
                      <TableRow key={ag.id}>
                        <TableCell>
                          {format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{ag.cliente_nome}</TableCell>
                        <TableCell>{ag.cliente_telefone || "-"}</TableCell>
                        <TableCell>{ag.profissional_nome}</TableCell>
                        <TableCell>{ag.unidade_nome}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700">
                            Preenchido
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirEdicao(ag)}
                              className="border-blue-600 text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportarProntuario(ag)}
                              className="border-amber-600 text-amber-700 hover:bg-amber-50"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Exportar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filtrarAgendamentos(agendamentosComProntuario).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">Nenhum prontuário encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sem-prontuario">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-orange-600" />
                  Agendamentos sem Prontuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrarAgendamentos(agendamentosSemProntuario).map(ag => {
                      const status = getStatusProntuario(ag);
                      return (
                        <TableRow key={ag.id}>
                          <TableCell>
                            {format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">{ag.cliente_nome}</TableCell>
                          <TableCell>{ag.cliente_telefone || "-"}</TableCell>
                          <TableCell>{ag.profissional_nome}</TableCell>
                          <TableCell>{ag.unidade_nome}</TableCell>
                          <TableCell>
                            {status.tipo === 'atrasado' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAbrirCobrar(ag)}
                                className="border-red-600 text-red-700 hover:bg-red-50"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                {status.label}
                              </Button>
                            ) : (
                              <Badge className={status.cor}>
                                {status.label}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {filtrarAgendamentos(agendamentosSemProntuario).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <p className="font-medium">Todos os agendamentos têm prontuário!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Editar Prontuário */}
      <Dialog open={dialogEditarAberto} onOpenChange={setDialogEditarAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Prontuário</DialogTitle>
          </DialogHeader>

          {prontuarioEditando && agendamentoEditando && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">
                  {agendamentoEditando.cliente_nome} - {format(criarDataPura(agendamentoEditando.data), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Profissional: {agendamentoEditando.profissional_nome} | Unidade: {agendamentoEditando.unidade_nome}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">TERAPIA FEITA:</Label>
                <Textarea
                  value={prontuarioEditando.terapia_feita}
                  onChange={(e) => setProntuarioEditando({ ...prontuarioEditando, terapia_feita: e.target.value })}
                  placeholder="Descreva a terapia realizada..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">MÚSCULO LIBERADO:</Label>
                <Textarea
                  value={prontuarioEditando.musculo_liberado}
                  onChange={(e) => setProntuarioEditando({ ...prontuarioEditando, musculo_liberado: e.target.value })}
                  placeholder="Liste os músculos que foram liberados..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">SUGESTÕES PARA PRÓXIMA SESSÃO:</Label>
                <Textarea
                  value={prontuarioEditando.sugestoes_proxima_sessao}
                  onChange={(e) => setProntuarioEditando({ ...prontuarioEditando, sugestoes_proxima_sessao: e.target.value })}
                  placeholder="Sugestões e recomendações para a próxima sessão..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">OBSERVAÇÕES:</Label>
                <Textarea
                  value={prontuarioEditando.observacoes}
                  onChange={(e) => setProntuarioEditando({ ...prontuarioEditando, observacoes: e.target.value })}
                  placeholder="Observações gerais..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">RELATO DO TERAPEUTA SOBRE A SESSÃO:</Label>
                <Textarea
                  value={prontuarioEditando.relato_terapeuta}
                  onChange={(e) => setProntuarioEditando({ ...prontuarioEditando, relato_terapeuta: e.target.value })}
                  placeholder="Relato detalhado do terapeuta sobre a sessão..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">QUAL A SESSÃO DO PLANO TERAPÊUTICO:</Label>
                <Textarea
                  value={prontuarioEditando.sessao_plano_terapeutico}
                  onChange={(e) => setProntuarioEditando({ ...prontuarioEditando, sessao_plano_terapeutico: e.target.value })}
                  placeholder="Ex: 3ª sessão de 10, 5ª sessão do plano..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditarAberto(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicao} className="bg-amber-600 hover:bg-amber-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cobrar Prontuário Atrasado */}
      <Dialog open={dialogCobrarAberto} onOpenChange={setDialogCobrarAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              COBRAR PRONTUÁRIO ATRASADO
            </DialogTitle>
          </DialogHeader>

          {agendamentoCobrando && (
            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-bold text-red-900">
                  {agendamentoCobrando.cliente_nome}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Data: {format(criarDataPura(agendamentoCobrando.data), "dd/MM/yyyy", { locale: ptBR })} às {agendamentoCobrando.hora_inicio}
                </p>
                <p className="text-xs text-red-700">
                  Profissional: {agendamentoCobrando.profissional_nome} | Unidade: {agendamentoCobrando.unidade_nome}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Selecionar Recepcionistas:
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {recepcionistas.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum recepcionista cadastrado</p>
                  ) : (
                    recepcionistas.map(recep => (
                      <div key={recep.email} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={recep.email}
                          checked={recepcionistasSelecionados.includes(recep.email)}
                          onChange={() => toggleRecepcionista(recep.email)}
                          className="w-4 h-4"
                        />
                        <label htmlFor={recep.email} className="text-sm cursor-pointer">
                          {recep.full_name} ({recep.email})
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRecepcionistasSelecionados(recepcionistas.map(r => r.email))}
                  className="mt-2"
                >
                  Selecionar Todos
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Mensagem do Alerta:</Label>
                <Textarea
                  value={mensagemAlerta}
                  onChange={(e) => setMensagemAlerta(e.target.value)}
                  placeholder="Digite a mensagem que aparecerá para os recepcionistas..."
                  rows={6}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCobrarAberto(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleEnviarAlertas} className="bg-red-600 hover:bg-red-700">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Enviar Alertas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}