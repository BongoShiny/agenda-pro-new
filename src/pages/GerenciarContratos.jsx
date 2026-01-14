import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Search, Eye, Download } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, X, CheckCircle } from "lucide-react";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function GerenciarContratosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState("");
  const [contratoVisualizando, setContratoVisualizando] = useState(null);
  const [dialogCobrarAberto, setDialogCobrarAberto] = useState(false);
  const [agendamentoCobrando, setAgendamentoCobrando] = useState(null);
  const [recepcionistasSelecionados, setRecepcionistasSelecionados] = useState([]);
  const [mensagemAlerta, setMensagemAlerta] = useState("");
  const navigate = useNavigate();

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
        
        if (!temAcesso) {
          navigate(createPageUrl("Agenda"));
        } else {
          // Registrar entrada
          await base44.entities.LogAcao.create({
            tipo: "acessou_relatorios",
            usuario_email: user.email,
            descricao: "Entrou na área de Gerenciar Contratos Termo 30%",
            entidade_tipo: "Agendamento"
          });
        }
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();

    return () => {
      if (usuarioAtual) {
        base44.entities.LogAcao.create({
          tipo: "acessou_relatorios",
          usuario_email: usuarioAtual.email,
          descricao: "Saiu da área de Gerenciar Contratos Termo 30%",
          entidade_tipo: "Agendamento"
        }).catch(err => console.error("Erro ao registrar saída:", err));
      }
    };
  }, [navigate]);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-contratos'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-recepcionistas-contratos'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const recepcionistas = usuarios.filter(u => u.cargo === "recepcao");

  // Filtrar agendamentos válidos
  let agendamentosValidos = agendamentos.filter(ag => 
    ag.status !== "bloqueio" && 
    ag.tipo !== "bloqueio" && 
    ag.cliente_nome !== "FECHADO"
  );

  // Filtrar por unidades de acesso para gerentes de unidade
  if (usuarioAtual?.cargo === "gerencia_unidades") {
    const unidadesAcesso = usuarioAtual?.unidades_acesso || [];
    agendamentosValidos = agendamentosValidos.filter(ag => unidadesAcesso.includes(ag.unidade_id));
  }

  // Separar com e sem contrato
  const agendamentosComContrato = agendamentosValidos.filter(ag => ag.contrato_termo_url);
  const agendamentosSemContrato = agendamentosValidos.filter(ag => !ag.contrato_termo_url);

  // Função de pesquisa
  const filtrarContratos = (lista) => {
    if (!pesquisa) return lista;
    const termo = pesquisa.toLowerCase();
    return lista.filter(ag =>
      ag.cliente_nome?.toLowerCase().includes(termo) ||
      ag.cliente_telefone?.toLowerCase().includes(termo) ||
      ag.unidade_nome?.toLowerCase().includes(termo) ||
      ag.profissional_nome?.toLowerCase().includes(termo)
    );
  };

  // Função para calcular status do contrato
  const getStatusContrato = (ag) => {
    if (ag.contrato_termo_url) {
      return { label: 'Anexado', cor: 'bg-green-100 text-green-700', tipo: 'anexado' };
    }
    
    // Verificar se passou o horário da sessão
    const agora = new Date();
    const [ano, mes, dia] = ag.data.split('-').map(Number);
    const [horaFim, minutoFim] = ag.hora_fim.split(':').map(Number);
    const dataFimSessao = new Date(ano, mes - 1, dia, horaFim, minutoFim);
    
    if (agora > dataFimSessao) {
      return { label: '⚠️ Atrasado', cor: 'bg-red-100 text-red-700', tipo: 'atrasado' };
    }
    
    return { label: 'Pendente', cor: 'bg-orange-100 text-orange-700', tipo: 'pendente' };
  };

  const handleVisualizar = (ag) => {
    setContratoVisualizando(ag);
  };

  const handleAbrirCobrar = (ag) => {
    setAgendamentoCobrando(ag);
    setMensagemAlerta(`⚠️ CONTRATO TERMO 30% NÃO ANEXADO - ${ag.cliente_nome}\n\nData: ${format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}\nHorário: ${ag.hora_inicio} - ${ag.hora_fim}\nProfissional: ${ag.profissional_nome}\n\nPor favor, providenciar o contrato assinado com urgência!`);
    setRecepcionistasSelecionados([]);
    setDialogCobrarAberto(true);
  };

  const enviarAlertaMutation = async () => {
    const alertas = [];
    for (const email of recepcionistasSelecionados) {
      await base44.entities.Alerta.create({
        usuario_email: email,
        titulo: "⚠️ CONTRATO TERMO 30% NÃO ANEXADO",
        mensagem: mensagemAlerta,
        tipo: "warning",
        agendamento_id: agendamentoCobrando.id,
        enviado_por: usuarioAtual?.email
      });
      alertas.push(email);
    }
    
    await base44.entities.LogAcao.create({
      tipo: "editou_agendamento",
      usuario_email: usuarioAtual?.email || "sistema",
      descricao: `Enviou cobrança de contrato não anexado para: ${alertas.join(", ")} - ${agendamentoCobrando.cliente_nome}`,
      entidade_tipo: "Alerta",
      entidade_id: agendamentoCobrando.id
    });
    
    return alertas;
  };

  const handleEnviarAlertas = async () => {
    if (recepcionistasSelecionados.length === 0) {
      alert("⚠️ Selecione pelo menos um recepcionista!");
      return;
    }
    if (!mensagemAlerta.trim()) {
      alert("⚠️ Digite uma mensagem!");
      return;
    }
    
    try {
      const alertas = await enviarAlertaMutation();
      setDialogCobrarAberto(false);
      alert(`✅ Alertas enviados com sucesso para ${alertas.length} recepcionista(s)!`);
    } catch (error) {
      alert("❌ Erro ao enviar alertas: " + error.message);
    }
  };

  const toggleRecepcionista = (email) => {
    setRecepcionistasSelecionados(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
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
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Contratos Termo 30%</h1>
              <p className="text-sm text-gray-500">Visualize todos os contratos de termo 30% multa assinados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Pesquisar por nome, telefone, unidade ou profissional..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="com-contrato" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="com-contrato">
              Com Contrato ({filtrarContratos(agendamentosComContrato).length})
            </TabsTrigger>
            <TabsTrigger value="sem-contrato">
              Sem Contrato ({filtrarContratos(agendamentosSemContrato).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="com-contrato">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Contratos Anexados
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
                    {filtrarContratos(agendamentosComContrato).map(ag => (
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
                            Anexado
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVisualizar(ag)}
                              className="border-blue-600 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </Button>
                            <a 
                              href={ag.contrato_termo_url} 
                              download={`Contrato_${ag.cliente_nome}_${ag.data}.pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-700 hover:bg-green-50"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar
                              </Button>
                            </a>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filtrarContratos(agendamentosComContrato).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">Nenhum contrato encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sem-contrato">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Contratos Não Anexados
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
                    {filtrarContratos(agendamentosSemContrato).map(ag => {
                      const status = getStatusContrato(ag);
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

                {filtrarContratos(agendamentosSemContrato).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <p className="font-medium">Todos os agendamentos têm contrato anexado!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Visualizar Contrato */}
      <Dialog open={!!contratoVisualizando} onOpenChange={() => setContratoVisualizando(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Contrato Termo 30% Multa - {contratoVisualizando?.cliente_nome}
            </DialogTitle>
          </DialogHeader>

          {contratoVisualizando && (
            <div className="space-y-4 py-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-orange-900">Cliente:</span>
                    <p className="text-orange-800">{contratoVisualizando.cliente_nome}</p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-900">Telefone:</span>
                    <p className="text-orange-800">{contratoVisualizando.cliente_telefone || "-"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-900">Data:</span>
                    <p className="text-orange-800">{format(criarDataPura(contratoVisualizando.data), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-900">Profissional:</span>
                    <p className="text-orange-800">{contratoVisualizando.profissional_nome}</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                <iframe
                  src={contratoVisualizando.contrato_termo_url}
                  className="w-full h-[60vh]"
                  title="Contrato"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setContratoVisualizando(null)}>
                  Fechar
                </Button>
                <a 
                  href={contratoVisualizando.contrato_termo_url} 
                  download={`Contrato_${contratoVisualizando.cliente_nome}_${contratoVisualizando.data}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Contrato
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Cobrar Contrato Atrasado */}
      <Dialog open={dialogCobrarAberto} onOpenChange={setDialogCobrarAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              COBRAR CONTRATO NÃO ANEXADO
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