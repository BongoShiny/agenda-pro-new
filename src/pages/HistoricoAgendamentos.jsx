import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Calendar, User, Clock, FileText, X, Activity } from "lucide-react";
import { Link } from "react-router-dom";
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

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

const statusColors = {
  confirmado: "bg-emerald-100 text-emerald-800",
  agendado: "bg-amber-100 text-amber-800",
  ausencia: "bg-fuchsia-100 text-fuchsia-800",
  cancelado: "bg-red-100 text-red-800",
  concluido: "bg-blue-100 text-blue-800",
  bloqueio: "bg-red-100 text-red-800"
};

const statusLabels = {
  confirmado: "Confirmado",
  agendado: "Agendado",
  ausencia: "Ausência",
  cancelado: "Cancelado",
  concluido: "Concluído",
  bloqueio: "Bloqueado"
};

const tipoAcaoLabels = {
    criou_agendamento: "Criou Agendamento",
    editou_agendamento: "Editou Agendamento",
    excluiu_agendamento: "Excluiu Agendamento",
    bloqueou_horario: "Bloqueou Horário",
    desbloqueou_horario: "Desbloqueou Horário",
    criou_terapeuta: "Criou Terapeuta",
    editou_terapeuta: "Editou Terapeuta",
    excluiu_terapeuta: "Excluiu Terapeuta",
    editou_usuario: "Editou Usuário",
    acessou_relatorios: "Acessou Relatórios",
    exportou_planilha: "Exportou Planilha",
    ativou_modo_editor: "Ativou Modo Editor",
    editou_dados_relatorio: "Editou Dados no Relatório",
    alterou_configuracao: "Alterou Configuração",
    criou_unidade: "Criou Unidade",
    editou_unidade: "Editou Unidade",
    excluiu_unidade: "Excluiu Unidade",
    criou_excecao_horario: "Criou Exceção de Horário",
    excluiu_excecao_horario: "Excluiu Exceção de Horário"
  };

const tipoAcaoColors = {
  criou_agendamento: "bg-green-100 text-green-800",
  editou_agendamento: "bg-blue-100 text-blue-800",
  excluiu_agendamento: "bg-red-100 text-red-800",
  bloqueou_horario: "bg-orange-100 text-orange-800",
  desbloqueou_horario: "bg-teal-100 text-teal-800",
  criou_terapeuta: "bg-purple-100 text-purple-800",
  editou_terapeuta: "bg-indigo-100 text-indigo-800",
  excluiu_terapeuta: "bg-red-100 text-red-800"
};

export default function HistoricoAgendamentosPage() {
  const [busca, setBusca] = useState("");
  const [profissionalFiltro, setProfissionalFiltro] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("");
  const [buscaLogs, setBuscaLogs] = useState("");
  const [tipoAcaoFiltro, setTipoAcaoFiltro] = useState("");

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-historico'],
    queryFn: () => base44.entities.Agendamento.list("-created_date"),
    initialData: [],
  });

  const { data: logsAcoes = [] } = useQuery({
    queryKey: ['logs-acoes'],
    queryFn: () => base44.entities.LogAcao.list("-created_date"),
    initialData: [],
  });

  // Extrair lista única de profissionais e unidades
  const profissionaisUnicos = [...new Set(agendamentos.map(ag => ag.profissional_nome).filter(Boolean))].sort();
  const unidadesUnicas = [...new Set(agendamentos.map(ag => ag.unidade_nome).filter(Boolean))].sort();

  const agendamentosFiltrados = agendamentos.filter(ag => {
    // CRÍTICO: Aba "Agendamentos" mostra APENAS registros do sistema (sem criador_email)
    if (ag.criador_email) return false;
    
    const buscaLower = busca.toLowerCase();
    
    // Filtro de busca geral (cliente/telefone)
    const matchBusca = !busca || (
      ag.cliente_nome?.toLowerCase().includes(buscaLower) ||
      ag.cliente_telefone?.toLowerCase().includes(buscaLower)
    );
    
    // Filtro de profissional
    const matchProfissional = !profissionalFiltro || ag.profissional_nome === profissionalFiltro;
    
    // Filtro de unidade
    const matchUnidade = !unidadeFiltro || ag.unidade_nome === unidadeFiltro;
    
    return matchBusca && matchProfissional && matchUnidade;
  });

  const logsAcoesFiltrados = logsAcoes.filter(log => {
    const buscaLower = buscaLogs.toLowerCase();
    const matchBusca = !buscaLogs || (
      log.usuario_email?.toLowerCase().includes(buscaLower) ||
      log.descricao?.toLowerCase().includes(buscaLower)
    );
    const matchTipo = !tipoAcaoFiltro || log.tipo === tipoAcaoFiltro;
    return matchBusca && matchTipo;
  });

  const tiposAcoesUnicos = [...new Set(logsAcoes.map(log => log.tipo).filter(Boolean))].sort();

  const limparFiltros = () => {
    setBusca("");
    setProfissionalFiltro("");
    setUnidadeFiltro("");
  };

  const limparFiltrosLogs = () => {
    setBuscaLogs("");
    setTipoAcaoFiltro("");
  };

  const temFiltrosAtivos = busca || profissionalFiltro || unidadeFiltro;
  const temFiltrosAtivosLogs = buscaLogs || tipoAcaoFiltro;

  const formatarDataHora = (dateString) => {
    try {
      const date = new Date(dateString);
      
      // Subtrair 3 horas para converter UTC para Brasília
      const brasiliaDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
      
      const dia = String(brasiliaDate.getDate()).padStart(2, '0');
      const mes = String(brasiliaDate.getMonth() + 1).padStart(2, '0');
      const ano = brasiliaDate.getFullYear();
      const hora = String(brasiliaDate.getHours()).padStart(2, '0');
      const minuto = String(brasiliaDate.getMinutes()).padStart(2, '0');
      
      return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
    } catch {
      return "-";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Agenda")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Histórico do Sistema</h1>
              <p className="text-gray-500 mt-1">Agendamentos automáticos do sistema e ações de usuários</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {agendamentosFiltrados.length} registros
          </Badge>
        </div>

        <Tabs defaultValue="agendamentos" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="agendamentos">
              <Calendar className="w-4 h-4 mr-2" />
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="usuarios">
              <Activity className="w-4 h-4 mr-2" />
              Ações de Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agendamentos">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Agendamentos do Sistema</CardTitle>
                    {temFiltrosAtivos && (
                      <Button variant="outline" size="sm" onClick={limparFiltros}>
                        <X className="w-4 h-4 mr-2" />
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente/telefone..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={profissionalFiltro} onValueChange={setProfissionalFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos os Profissionais</SelectItem>
                    {profissionaisUnicos.map(prof => (
                      <SelectItem key={prof} value={prof}>{prof}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todas as Unidades</SelectItem>
                    {unidadesUnicas.map(unidade => (
                      <SelectItem key={unidade} value={unidade}>{unidade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Criado Por</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data Agendamento</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendamentosFiltrados.map(ag => (
                    <TableRow key={ag.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {formatarDataHora(ag.created_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-sm">
                            {ag.criador_email || "Sistema"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-semibold">{ag.cliente_nome}</span>
                          {ag.cliente_telefone && (
                            <div className="text-xs text-gray-600 mt-1">
                              📱 {ag.cliente_telefone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {ag.hora_inicio} - {ag.hora_fim}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{ag.profissional_nome}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{ag.unidade_nome}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[ag.status]}>
                          {statusLabels[ag.status] || ag.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {agendamentosFiltrados.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">Não foi possível encontrar a sua busca</p>
                <p className="text-sm mt-2">
                  {temFiltrosAtivos 
                    ? "Tente ajustar os filtros ou limpar para ver todos os registros" 
                    : "Ainda não há agendamentos no sistema"}
                </p>
              </div>
            )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Logs de Ações dos Usuários</CardTitle>
                    {temFiltrosAtivosLogs && (
                      <Button variant="outline" size="sm" onClick={limparFiltrosLogs}>
                        <X className="w-4 h-4 mr-2" />
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por usuário ou descrição..."
                        value={buscaLogs}
                        onChange={(e) => setBuscaLogs(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select value={tipoAcaoFiltro} onValueChange={setTipoAcaoFiltro}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por Tipo de Ação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Todas as Ações</SelectItem>
                        {tiposAcoesUnicos.map(tipo => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipoAcaoLabels[tipo] || tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Tipo de Ação</TableHead>
                        <TableHead>Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsAcoesFiltrados.map(log => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {formatarDataHora(log.created_date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="font-medium text-sm">
                                {log.usuario_email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={tipoAcaoColors[log.tipo]}>
                              {tipoAcaoLabels[log.tipo] || log.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700">{log.descricao}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {logsAcoesFiltrados.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">Nenhuma ação registrada</p>
                    <p className="text-sm mt-2">
                      {temFiltrosAtivosLogs 
                        ? "Tente ajustar os filtros ou limpar para ver todos os registros" 
                        : "As ações dos usuários aparecerão aqui"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}