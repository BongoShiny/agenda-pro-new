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
import { ArrowLeft, Save, Plus, GripVertical, Trash2, Edit2, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ConfiguracaoTerapeutasPage() {
  const queryClient = useQueryClient();
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [editandoProfissional, setEditandoProfissional] = useState(null);
  const [nomeEditado, setNomeEditado] = useState("");

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

    // Atualizar ordem de todos os itens
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
              <p className="text-gray-500 mt-1">Gerencie os terapeutas de cada unidade e suas ordens de exibição</p>
            </div>
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
                        {configs.filter(c => c.ativo).length} de 8 terapeutas ativos
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Adicionar novo terapeuta */}
                    {disponiveis.length > 0 && configs.length < 8 && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Label className="text-sm font-semibold mb-2 block">Adicionar Terapeuta</Label>
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
                                        <GripVertical className="w-5 h-5 text-gray-400" />
                                      </div>

                                      <div className="flex-1">
                                        {editandoProfissional === profissional.id ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              value={nomeEditado}
                                              onChange={(e) => setNomeEditado(e.target.value)}
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
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold">{profissional.nome}</span>
                                            <Button size="icon" variant="ghost" onClick={() => handleEditarNome(profissional)}>
                                              <Edit2 className="w-3 h-3 text-gray-400" />
                                            </Button>
                                          </div>
                                        )}
                                        <span className="text-sm text-gray-500">{profissional.especialidade}</span>
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
                                          onClick={() => handleRemoverTerapeuta(config.id)}
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
                        Nenhum terapeuta configurado para esta unidade.
                        <br />
                        Adicione terapeutas usando o seletor acima.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}