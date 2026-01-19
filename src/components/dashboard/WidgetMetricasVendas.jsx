import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, TrendingUp, Calendar, Clock, Image as ImageIcon, FileText, ExternalLink, Edit3, Save, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

export default function WidgetMetricasVendas({ agendamentos, dataInicio, dataFim }) {
  const [unidadeSelecionada, setUnidadeSelecionada] = useState("todas");
  const [vendedorSelecionado, setVendedorSelecionado] = useState("todos");
  const [imagemDialog, setImagemDialog] = useState(null);
  const [observacoesDialog, setObservacoesDialog] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [anotacoes, setAnotacoes] = useState({});
  const queryClient = useQueryClient();

  const atualizarAgendamentoMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.Agendamento.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-dashboard'] });
    },
  });

  // Buscar todos os vendedores cadastrados
  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  // Filtrar vendas baseado em created_date (data de criação) e que tenham vendedor
  const vendasPeriodo = agendamentos.filter(ag => {
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
    if (!ag.created_date) return false;
    if (!ag.vendedor_id && !ag.vendedor_nome) return false; // Apenas com vendedor
    
    const dataCriacao = ag.created_date.substring(0, 10); // YYYY-MM-DD
    return dataCriacao >= dataInicio && dataCriacao <= dataFim;
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
    if (dataInicio === dataFim) {
      return format(new Date(dataInicio + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
    }
    return `${format(new Date(dataInicio + 'T12:00:00'), "dd/MM", { locale: ptBR })} - ${format(new Date(dataFim + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}`;
  };

  const totalVendas = vendasFiltradas.length;
  const totalValor = vendasFiltradas.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);

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
                      <TableHead>Unidade</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Data Agendamento</TableHead>
                      <TableHead>Pacote</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">A Receber</TableHead>
                      <TableHead>Comprovante 1</TableHead>
                      <TableHead>Observações Vendedor</TableHead>
                      <TableHead className="min-w-[200px]">Anotações</TableHead>
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
                                {format(new Date(venda.created_date), "dd/MM/yyyy", { locale: ptBR })}
                                <Clock className="w-3 h-3 text-gray-400 ml-1" />
                                {format(new Date(venda.created_date), "HH:mm", { locale: ptBR })}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{venda.cliente_nome}</TableCell>
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
                              {venda.observacoes_vendedores ? (
                                <button
                                  onClick={() => setObservacoesDialog({
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
            <DialogTitle>Observações do Vendedor - {observacoesDialog?.cliente}</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {observacoesDialog?.texto}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}