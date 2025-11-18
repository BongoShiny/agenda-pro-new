import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, GripVertical, Trash2, Edit2, Check, X, UserPlus, AlertTriangle, UserMinus, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfiguracaoTerapeutasPage() {
  const queryClient = useQueryClient();
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);

  // Carregar usuário atual para verificar se é admin
  React.useEffect(() => {
    const carregarUsuario = async () => {
      const user = await base44.auth.me();
      setUsuarioAtual(user);
    };
    carregarUsuario();
  }, []);
  const [editandoProfissional, setEditandoProfissional] = useState(null);
  const [dadosEditados, setDadosEditados] = useState({
    nome: "",
    especialidade: "",
    horario_inicio: "",
    horario_fim: ""
  });
  const [dialogNovoAberto, setDialogNovoAberto] = useState(false);
  const [alertExcluirAberto, setAlertExcluirAberto] = useState(false);
  const [profissionalParaExcluir, setProfissionalParaExcluir] = useState(null);
  const [novoProfissional, setNovoProfissional] = useState({
    nome: "",
    especialidade: "",
    horario_inicio: "08:00",
    horario_fim: "18:00"
  });
  const [dialogExcecaoAberto, setDialogExcecaoAberto] = useState(false);
  const [profissionalExcecao, setProfissionalExcecao] = useState(null);
  const [novaExcecao, setNovaExcecao] = useState({
    data: "",
    data_inicio: "",
    data_fim: "",
    horario_inicio: "08:00",
    horario_fim: "18:00",
    motivo: "",
    tipo: "horario" // "horario" ou "folga"
  });
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.ConfiguracaoTerapeuta.list("ordem"),
    initialData: [],
  });

  const { data: excecoesHorario = [] } = useQuery({
    queryKey: ['excecoes-horario'],
    queryFn: () => base44.entities.HorarioExcecao.list("-data"),
    initialData: [],
  });

  const criarProfissionalMutation = useMutation({
    mutationFn: (dados) => base44.entities.Profissional.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais'] });
      setDialogNovoAberto(false);
      setNovoProfissional({ nome: "", especialidade: "", horario_inicio: "08:00", horario_fim: "18:00" });
    },
  });

  const criarConfiguracaoMutation = useMutation({
    mutationFn: (dados) => base44.entities.ConfiguracaoTerapeuta.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
    },
  });

  const atualizarConfiguracaoMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.ConfiguracaoTerapeuta.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
    },
  });

  const deletarConfiguracaoMutation = useMutation({
    mutationFn: (id) => base44.entities.ConfiguracaoTerapeuta.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
    },
  });

  const atualizarProfissionalMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.Profissional.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais'] });
      setEditandoProfissional(null);
    },
  });

  const deletarProfissionalMutation = useMutation({
    mutationFn: (id) => base44.entities.Profissional.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais'] });
    },
  });

  const criarExcecaoMutation = useMutation({
    mutationFn: (dados) => base44.entities.HorarioExcecao.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excecoes-horario'] });
      setDialogExcecaoAberto(false);
      setProfissionalExcecao(null);
      setNovaExcecao({ data: "", horario_inicio: "08:00", horario_fim: "18:00", motivo: "" });
    },
  });

  const deletarExcecaoMutation = useMutation({
    mutationFn: (id) => base44.entities.HorarioExcecao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excecoes-horario'] });
    },
  });

  const getConfiguracoesUnidade = (unidadeId) => {
    return configuracoes
      .filter(c => c.unidade_id === unidadeId)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  };

  const getProfissionaisDisponiveis = (unidadeId) => {
    const configsUnidade = getConfiguracoesUnidade(unidadeId);
    const idsUsados = configsUnidade.map(c => c.profissional_id);
    return profissionais.filter(p => !idsUsados.includes(p.id));
  };

  const getUnidadesDoProfissional = (profissionalId) => {
    return configuracoes
      .filter(c => c.profissional_id === profissionalId)
      .map(c => unidades.find(u => u.id === c.unidade_id))
      .filter(Boolean);
  };

  const handleCriarNovoProfissional = async () => {
    if (!novoProfissional.nome) return;
    
    await criarProfissionalMutation.mutateAsync({
      nome: novoProfissional.nome,
      especialidade: novoProfissional.especialidade || "Terapeuta",
      horario_inicio: novoProfissional.horario_inicio || "08:00",
      horario_fim: novoProfissional.horario_fim || "18:00",
      ativo: true
    });
  };

  const handleAdicionarTerapeuta = async (unidadeId, profissionalId) => {
    const configs = getConfiguracoesUnidade(unidadeId);
    const ordem = configs.length;
    await criarConfiguracaoMutation.mutateAsync({
      unidade_id: unidadeId,
      profissional_id: profissionalId,
      ordem,
      ativo: true
    });
  };

  const handleToggleAtivo = async (config) => {
    if (!config || !config.id) return;
    try {
      await atualizarConfiguracaoMutation.mutateAsync({
        id: config.id,
        dados: { ...config, ativo: !config.ativo }
      });
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
    }
  };

  const handleRemoverDaUnidade = async (profissionalId, unidadeId) => {
    const config = configuracoes.find(c => c.profissional_id === profissionalId && c.unidade_id === unidadeId);
    if (config && config.id) {
      try {
        await deletarConfiguracaoMutation.mutateAsync(config.id);
      } catch (error) {
        console.error("Erro ao remover da unidade:", error);
        queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
      }
    }
  };

  const handleAbrirDialogExcluir = (profissional) => {
    setProfissionalParaExcluir(profissional);
    setAlertExcluirAberto(true);
  };

  const handleExcluirPermanentemente = async () => {
    if (!profissionalParaExcluir) return;

    try {
      // Primeiro, deletar todas as configurações deste profissional em todas as unidades
      const configsDoProfissional = configuracoes.filter(c => c.profissional_id === profissionalParaExcluir.id);
      
      for (const config of configsDoProfissional) {
        if (config && config.id) {
          try {
            await deletarConfiguracaoMutation.mutateAsync(config.id);
          } catch (error) {
            console.error("Erro ao deletar configuração:", error);
          }
        }
      }

      // Depois, deletar o profissional
      await deletarProfissionalMutation.mutateAsync(profissionalParaExcluir.id);

      setAlertExcluirAberto(false);
      setProfissionalParaExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir profissional:", error);
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
      queryClient.invalidateQueries({ queryKey: ['profissionais'] });
    }
  };

  const handleDragEnd = async (result, unidadeId) => {
    if (!result.destination) return;

    const configs = getConfiguracoesUnidade(unidadeId);
    const items = Array.from(configs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    for (let i = 0; i < items.length; i++) {
      if (items[i] && items[i].id && items[i].ordem !== i) {
        try {
          await atualizarConfiguracaoMutation.mutateAsync({
            id: items[i].id,
            dados: { ...items[i], ordem: i }
          });
        } catch (error) {
          console.error("Erro ao reordenar:", error);
          queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
          break;
        }
      }
    }
  };

  const handleEditarProfissional = (profissional) => {
    setEditandoProfissional(profissional.id);
    setDadosEditados({
      nome: profissional.nome,
      especialidade: profissional.especialidade || "",
      horario_inicio: profissional.horario_inicio || "08:00",
      horario_fim: profissional.horario_fim || "18:00"
    });
  };

  const handleSalvarProfissional = async (profissionalId) => {
    const profissional = profissionais.find(p => p.id === profissionalId);
    await atualizarProfissionalMutation.mutateAsync({
      id: profissionalId,
      dados: { ...profissional, ...dadosEditados }
    });
  };

  const handleCancelarEdicao = () => {
    setEditandoProfissional(null);
    setDadosEditados({ nome: "", especialidade: "", horario_inicio: "", horario_fim: "" });
  };

  const handleAbrirDialogExcecao = (profissional) => {
    setProfissionalExcecao(profissional);
    setDialogExcecaoAberto(true);
  };

  const handleCriarExcecao = async () => {
    if (!novaExcecao.data || !profissionalExcecao) return;
    
    // Se for folga, usar horários 00:00 - 00:00
    const horarioInicio = novaExcecao.tipo === "folga" ? "00:00" : novaExcecao.horario_inicio;
    const horarioFim = novaExcecao.tipo === "folga" ? "00:00" : novaExcecao.horario_fim;
    const motivo = novaExcecao.tipo === "folga" ? "Folga" : novaExcecao.motivo;
    
    await criarExcecaoMutation.mutateAsync({
      profissional_id: profissionalExcecao.id,
      data: novaExcecao.data,
      horario_inicio: horarioInicio,
      horario_fim: horarioFim,
      motivo: motivo
    });
  };

  const handleBloquearDiaInteiro = async () => {
    if (!novaExcecao.data || !profissionalExcecao) {
      alert("Por favor, selecione uma data primeiro");
      return;
    }
    
    if (!confirm(`Tem certeza que deseja bloquear TODO o dia ${novaExcecao.data} para ${profissionalExcecao.nome}?`)) {
      return;
    }
    
    await criarExcecaoMutation.mutateAsync({
      profissional_id: profissionalExcecao.id,
      data: novaExcecao.data,
      horario_inicio: "00:00",
      horario_fim: "00:00",
      motivo: "Dia inteiro bloqueado"
    });
  };

  const getExcecoesDoProfissional = (profissionalId) => {
    return excecoesHorario
      .filter(e => e.profissional_id === profissionalId)
      .sort((a, b) => a.data.localeCompare(b.data));
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
              <h1 className="text-3xl font-bold text-gray-900">Configuração de Terapeutas</h1>
              <p className="text-gray-500 mt-1">Adicione, edite e gerencie os terapeutas de cada unidade</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setDialogNovoAberto(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Novo Terapeuta
            </Button>
            <Link to={createPageUrl("ConfigurarUnidades")}>
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                Configurar Unidades
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue={unidades[0]?.id} onValueChange={setUnidadeSelecionada}>
          <TabsList className="mb-6">
            {unidades.map(unidade => (
              <TabsTrigger key={unidade.id} value={unidade.id}>
                {unidade.nome}
              </TabsTrigger>
            ))}
          </TabsList>

          {unidades.map(unidade => {
            const configs = getConfiguracoesUnidade(unidade.id);
            const disponiveis = getProfissionaisDisponiveis(unidade.id);

            return (
              <TabsContent key={unidade.id} value={unidade.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Terapeutas da Unidade {unidade.nome}</span>
                      <span className="text-sm font-normal text-gray-500">
                        {configs.filter(c => c.ativo).length} terapeutas ativos
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Adicionar terapeuta existente */}
                    {disponiveis.length > 0 && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Label className="text-sm font-semibold mb-2 block">Adicionar Terapeuta Existente</Label>
                        <div className="flex gap-2">
                          <Select onValueChange={(value) => handleAdicionarTerapeuta(unidade.id, value)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Selecione um terapeuta" />
                            </SelectTrigger>
                            <SelectContent>
                              {disponiveis.map(prof => (
                                <SelectItem key={prof.id} value={prof.id}>
                                  {prof.nome} - {prof.especialidade}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Lista de terapeutas */}
                    <DragDropContext onDragEnd={(result) => handleDragEnd(result, unidade.id)}>
                      <Droppable droppableId="terapeutas">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                            {configs.map((config, index) => {
                              const profissional = profissionais.find(p => p.id === config.profissional_id);
                              if (!profissional) return null;

                              const unidadesDoProfissional = getUnidadesDoProfissional(profissional.id);

                              return (
                                <Draggable key={config.id} draggableId={config.id} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                    >
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                      </div>

                                      <div className="flex-1">
                                        {editandoProfissional === profissional.id ? (
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <div className="flex-1 space-y-2">
                                                <Input
                                                  value={dadosEditados.nome}
                                                  onChange={(e) => setDadosEditados(prev => ({ ...prev, nome: e.target.value }))}
                                                  placeholder="Nome do terapeuta"
                                                  autoFocus
                                                />
                                                <Input
                                                  value={dadosEditados.especialidade}
                                                  onChange={(e) => setDadosEditados(prev => ({ ...prev, especialidade: e.target.value }))}
                                                  placeholder="Especialidade"
                                                />
                                                <div className="flex gap-2 items-center">
                                                  <Input
                                                    type="time"
                                                    value={dadosEditados.horario_inicio}
                                                    onChange={(e) => setDadosEditados(prev => ({ ...prev, horario_inicio: e.target.value }))}
                                                    className="flex-1"
                                                  />
                                                  <span className="text-gray-500 text-sm">até</span>
                                                  <Input
                                                    type="time"
                                                    value={dadosEditados.horario_fim}
                                                    onChange={(e) => setDadosEditados(prev => ({ ...prev, horario_fim: e.target.value }))}
                                                    className="flex-1"
                                                  />
                                                </div>
                                              </div>
                                              <div className="flex flex-col gap-1">
                                                <Button size="icon" variant="ghost" onClick={() => handleSalvarProfissional(profissional.id)}>
                                                  <Check className="w-4 h-4 text-green-600" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={handleCancelarEdicao}>
                                                  <X className="w-4 h-4 text-red-600" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-lg">{profissional.nome}</span>
                                              <Button size="icon" variant="ghost" onClick={() => handleEditarProfissional(profissional)} className="h-7 w-7">
                                                <Edit2 className="w-3 h-3 text-gray-400" />
                                              </Button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-sm text-gray-500">{profissional.especialidade}</span>
                                              {unidadesDoProfissional.length > 1 && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0-5 rounded">
                                                  Em {unidadesDoProfissional.length} unidades
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                             Horário padrão: {profissional.horario_inicio || "08:00"} - {profissional.horario_fim || "18:00"}
                                            </div>
                                            {getExcecoesDoProfissional(profissional.id).length > 0 && (
                                             <div className="text-xs text-blue-600 mt-1">
                                               📅 {getExcecoesDoProfissional(profissional.id).length} exceção(ões) configurada(s)
                                             </div>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 mr-2">
                                          <Label className="text-sm text-gray-600">Ativo</Label>
                                          <Switch
                                            checked={config.ativo}
                                            onCheckedChange={() => handleToggleAtivo(config)}
                                          />
                                        </div>
                                        
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleAbrirDialogExcecao(profissional)}
                                          className="hover:bg-blue-50"
                                          title="Configurar horários específicos"
                                        >
                                          <Calendar className="w-4 h-4 text-blue-500" />
                                        </Button>

                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRemoverDaUnidade(profissional.id, unidade.id)}
                                          className="hover:bg-orange-50"
                                          title="Remover desta unidade"
                                        >
                                          <UserMinus className="w-4 h-4 text-orange-500" />
                                        </Button>

                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleAbrirDialogExcluir(profissional)}
                                          className="hover:bg-red-50"
                                          title="Excluir permanentemente"
                                        >
                                          <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    {configs.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="font-medium">Nenhum terapeuta configurado para esta unidade</p>
                        <p className="text-sm mt-2">Adicione terapeutas existentes ou crie novos usando o botão acima</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Dialog para criar novo profissional */}
      <Dialog open={dialogNovoAberto} onOpenChange={setDialogNovoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Terapeuta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Terapeuta *</Label>
              <Input
                value={novoProfissional.nome}
                onChange={(e) => setNovoProfissional(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Dra. Maria Silva"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Especialidade</Label>
              <Input
                value={novoProfissional.especialidade}
                onChange={(e) => setNovoProfissional(prev => ({ ...prev, especialidade: e.target.value }))}
                placeholder="Ex: Fisioterapia, Quiropraxia, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Horário de Atendimento</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="time"
                  value={novoProfissional.horario_inicio}
                  onChange={(e) => setNovoProfissional(prev => ({ ...prev, horario_inicio: e.target.value }))}
                  className="flex-1"
                />
                <span className="text-gray-500">até</span>
                <Input
                  type="time"
                  value={novoProfissional.horario_fim}
                  onChange={(e) => setNovoProfissional(prev => ({ ...prev, horario_fim: e.target.value }))}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">Define os horários que aparecem na agenda para este terapeuta</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovoAberto(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCriarNovoProfissional}
              disabled={!novoProfissional.nome}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Criar Terapeuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para configurar exceções de horário */}
      <Dialog open={dialogExcecaoAberto} onOpenChange={setDialogExcecaoAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Horários Específicos - {profissionalExcecao?.nome}</DialogTitle>
            <DialogDescription>
              Configure horários diferentes para dias específicos. O horário padrão é {profissionalExcecao?.horario_inicio} - {profissionalExcecao?.horario_fim}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Adicionar nova exceção */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
              <Label className="font-semibold">Adicionar Horário Específico</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Data *</Label>
                  <Input
                    type="date"
                    value={novaExcecao.data}
                    onChange={(e) => setNovaExcecao(prev => ({ ...prev, data: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Horário de Atendimento</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="time"
                      value={novaExcecao.horario_inicio}
                      onChange={(e) => setNovaExcecao(prev => ({ ...prev, horario_inicio: e.target.value }))}
                      className="flex-1"
                      disabled={novaExcecao.tipo === "folga"}
                    />
                    <span className="text-gray-500 text-xs">até</span>
                    <Input
                      type="time"
                      value={novaExcecao.horario_fim}
                      onChange={(e) => setNovaExcecao(prev => ({ ...prev, horario_fim: e.target.value }))}
                      className="flex-1"
                      disabled={novaExcecao.tipo === "folga"}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Motivo (opcional)</Label>
                <Input
                  value={novaExcecao.motivo}
                  onChange={(e) => setNovaExcecao(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Ex: Horário reduzido, Evento especial..."
                  disabled={novaExcecao.tipo === "folga"}
                />
              </div>

              <Button 
                onClick={handleCriarExcecao}
                disabled={!novaExcecao.data}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Exceção
              </Button>
            </div>

            {/* Adicionar Folga */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-3">
              <Label className="font-semibold">Marcar Folga</Label>
              <p className="text-xs text-gray-600">Use esta opção para marcar um dia inteiro como folga do terapeuta</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Data Início *</Label>
                  <Input
                    type="date"
                    value={novaExcecao.data_inicio}
                    onChange={(e) => setNovaExcecao(prev => ({ ...prev, data_inicio: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Data Fim *</Label>
                  <Input
                    type="date"
                    value={novaExcecao.data_fim}
                    onChange={(e) => setNovaExcecao(prev => ({ ...prev, data_fim: e.target.value }))}
                  />
                </div>
              </div>

              <Button 
                onClick={async () => {
                  if (!novaExcecao.data_inicio || !novaExcecao.data_fim || !profissionalExcecao) return;
                  
                  const dataInicio = new Date(novaExcecao.data_inicio + 'T12:00:00');
                  const dataFim = new Date(novaExcecao.data_fim + 'T12:00:00');
                  
                  if (dataInicio > dataFim) {
                    alert("A data de início deve ser anterior ou igual à data de fim");
                    return;
                  }
                  
                  // Criar folgas para cada dia no período
                  const promises = [];
                  const currentDate = new Date(dataInicio);
                  
                  while (currentDate <= dataFim) {
                    const dataStr = currentDate.toISOString().split('T')[0];
                    promises.push(
                      base44.entities.HorarioExcecao.create({
                        profissional_id: profissionalExcecao.id,
                        data: dataStr,
                        horario_inicio: "00:00",
                        horario_fim: "00:00",
                        motivo: "Folga"
                      })
                    );
                    currentDate.setDate(currentDate.getDate() + 1);
                  }
                  
                  await Promise.all(promises);
                  queryClient.invalidateQueries({ queryKey: ['excecoes-horario'] });
                  setNovaExcecao(prev => ({ ...prev, data_inicio: "", data_fim: "" }));
                }}
                disabled={!novaExcecao.data_inicio || !novaExcecao.data_fim}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                📅 Marcar como Folga
              </Button>
            </div>

            {/* Lista de exceções existentes */}
            {profissionalExcecao && getExcecoesDoProfissional(profissionalExcecao.id).length > 0 && (
              <div className="space-y-3">
                <Label className="font-semibold">Exceções Configuradas</Label>
                {getExcecoesDoProfissional(profissionalExcecao.id).map(excecao => {
                  const dataFormatada = new Date(excecao.data + 'T12:00:00').toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit',
                    year: 'numeric'
                  });
                  
                  const isFolga = excecao.horario_inicio === "00:00" && excecao.horario_fim === "00:00";
                  
                  return (
                    <div key={excecao.id} className={`flex items-center gap-3 p-3 border rounded-lg ${
                      isFolga ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'
                    }`}>
                      <Calendar className={`w-5 h-5 ${isFolga ? 'text-orange-500' : 'text-blue-500'}`} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          📅 {dataFormatada}
                        </div>
                        {isFolga ? (
                          <div className="text-xs text-orange-700 mt-1 font-semibold">
                            🏖️ FOLGA
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600 mt-1">
                            ⏰ {excecao.horario_inicio} - {excecao.horario_fim}
                          </div>
                        )}
                        {excecao.motivo && excecao.motivo !== "Folga" && (
                          <div className="text-xs text-gray-500 mt-1">
                            💬 {excecao.motivo}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletarExcecaoMutation.mutate(excecao.id)}
                        className="hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {profissionalExcecao && getExcecoesDoProfissional(profissionalExcecao.id).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">Nenhuma exceção configurada ainda</p>
                <p className="text-xs mt-1">Use o formulário acima para adicionar horários específicos</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogExcecaoAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar exclusão permanente */}
      <AlertDialog open={alertExcluirAberto} onOpenChange={setAlertExcluirAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Excluir Terapeuta Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                Você está prestes a excluir permanentemente <strong>{profissionalParaExcluir?.nome}</strong>.
              </p>
              <p className="text-red-600 font-medium">
                Esta ação não pode ser desfeita!
              </p>
              <p>
                O terapeuta será removido de todas as unidades e todos os agendamentos futuros associados ficarão sem profissional.
              </p>
              {profissionalParaExcluir && getUnidadesDoProfissional(profissionalParaExcluir.id).length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3 mt-3">
                  <p className="text-sm font-medium text-orange-800">
                    Este terapeuta está vinculado às seguintes unidades:
                  </p>
                  <ul className="list-disc list-inside text-sm text-orange-700 mt-1">
                    {getUnidadesDoProfissional(profissionalParaExcluir.id).map(unidade => (
                      <li key={unidade.id}>{unidade.nome}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirPermanentemente}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}