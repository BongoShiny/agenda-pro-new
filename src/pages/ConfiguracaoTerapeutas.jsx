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
import { ArrowLeft, Plus, GripVertical, Trash2, Edit2, Check, X, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ConfiguracaoTerapeutasPage() {
  const queryClient = useQueryClient();
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [editandoProfissional, setEditandoProfissional] = useState(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [dialogNovoAberto, setDialogNovoAberto] = useState(false);
  const [novoProfissional, setNovoProfissional] = useState({
    nome: "",
    especialidade: ""
  });

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

  const criarProfissionalMutation = useMutation({
    mutationFn: (dados) => base44.entities.Profissional.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais'] });
      setDialogNovoAberto(false);
      setNovoProfissional({ nome: "", especialidade: "" });
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

  const handleCriarNovoProfissional = async () => {
    if (!novoProfissional.nome) return;
    
    const profissionalCriado = await criarProfissionalMutation.mutateAsync({
      nome: novoProfissional.nome,
      especialidade: novoProfissional.especialidade || "Terapeuta",
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
    await atualizarConfiguracaoMutation.mutateAsync({
      id: config.id,
      dados: { ...config, ativo: !config.ativo }
    });
  };

  const handleRemoverTerapeuta = async (configId) => {
    await deletarConfiguracaoMutation.mutateAsync(configId);
  };

  const handleDragEnd = async (result, unidadeId) => {
    if (!result.destination) return;

    const configs = getConfiguracoesUnidade(unidadeId);
    const items = Array.from(configs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    for (let i = 0; i < items.length; i++) {
      if (items[i].ordem !== i) {
        await atualizarConfiguracaoMutation.mutateAsync({
          id: items[i].id,
          dados: { ...items[i], ordem: i }
        });
      }
    }
  };

  const handleEditarNome = (profissional) => {
    setEditandoProfissional(profissional.id);
    setNomeEditado(profissional.nome);
  };

  const handleSalvarNome = async (profissionalId) => {
    const profissional = profissionais.find(p => p.id === profissionalId);
    await atualizarProfissionalMutation.mutateAsync({
      id: profissionalId,
      dados: { ...profissional, nome: nomeEditado }
    });
  };

  const handleCancelarEdicao = () => {
    setEditandoProfissional(null);
    setNomeEditado("");
  };

  const handleDeletarProfissional = async (profissionalId, unidadeId) => {
    // Primeiro remove a configuração
    const config = configuracoes.find(c => c.profissional_id === profissionalId && c.unidade_id === unidadeId);
    if (config) {
      await deletarConfiguracaoMutation.mutateAsync(config.id);
    }
    
    // Verifica se o profissional está em outras unidades
    const outrasConfigs = configuracoes.filter(c => c.profissional_id === profissionalId && c.unidade_id !== unidadeId);
    
    // Se não está em outras unidades, pode deletar o profissional
    if (outrasConfigs.length === 0) {
      await deletarProfissionalMutation.mutateAsync(profissionalId);
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
              <h1 className="text-3xl font-bold text-gray-900">Configuração de Terapeutas</h1>
              <p className="text-gray-500 mt-1">Adicione e gerencie os terapeutas de cada unidade</p>
            </div>
          </div>

          <Button onClick={() => setDialogNovoAberto(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Criar Novo Terapeuta
          </Button>
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
                                              <Input
                                                value={nomeEditado}
                                                onChange={(e) => setNomeEditado(e.target.value)}
                                                placeholder="Nome do terapeuta"
                                                className="max-w-xs"
                                                autoFocus
                                              />
                                              <Button size="icon" variant="ghost" onClick={() => handleSalvarNome(profissional.id)}>
                                                <Check className="w-4 h-4 text-green-600" />
                                              </Button>
                                              <Button size="icon" variant="ghost" onClick={handleCancelarEdicao}>
                                                <X className="w-4 h-4 text-red-600" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-lg">{profissional.nome}</span>
                                              <Button size="icon" variant="ghost" onClick={() => handleEditarNome(profissional)} className="h-7 w-7">
                                                <Edit2 className="w-3 h-3 text-gray-400" />
                                              </Button>
                                            </div>
                                            <span className="text-sm text-gray-500">{profissional.especialidade}</span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                          <Label className="text-sm text-gray-600">Ativo</Label>
                                          <Switch
                                            checked={config.ativo}
                                            onCheckedChange={() => handleToggleAtivo(config)}
                                          />
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeletarProfissional(profissional.id, unidade.id)}
                                          className="hover:bg-red-50"
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
    </div>
  );
}