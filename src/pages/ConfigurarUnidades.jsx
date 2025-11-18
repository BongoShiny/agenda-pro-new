import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ConfigurarUnidadesPage() {
  const queryClient = useQueryClient();
  const [dialogNovaUnidade, setDialogNovaUnidade] = useState(false);
  const [editandoUnidade, setEditandoUnidade] = useState(null);
  const [novaUnidade, setNovaUnidade] = useState({
    nome: "",
    endereco: "",
    link_google_maps: "",
    cor: "#3B82F6",
    ativa: true
  });
  const [dadosEditados, setDadosEditados] = useState({
    nome: "",
    endereco: "",
    link_google_maps: "",
    cor: "#3B82F6"
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const criarUnidadeMutation = useMutation({
    mutationFn: (dados) => base44.entities.Unidade.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      setDialogNovaUnidade(false);
      setNovaUnidade({ nome: "", endereco: "", cor: "#3B82F6", ativa: true });
    },
  });

  const atualizarUnidadeMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.Unidade.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      setEditandoUnidade(null);
    },
  });

  const deletarUnidadeMutation = useMutation({
    mutationFn: (id) => base44.entities.Unidade.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
    },
  });

  const handleCriarUnidade = async () => {
    if (!novaUnidade.nome) return;
    await criarUnidadeMutation.mutateAsync(novaUnidade);
  };

  const handleEditarUnidade = (unidade) => {
    setEditandoUnidade(unidade.id);
    setDadosEditados({
      nome: unidade.nome,
      endereco: unidade.endereco || "",
      link_google_maps: unidade.link_google_maps || "",
      cor: unidade.cor || "#3B82F6"
    });
  };

  const handleSalvarUnidade = async (unidadeId) => {
    const unidade = unidades.find(u => u.id === unidadeId);
    await atualizarUnidadeMutation.mutateAsync({
      id: unidadeId,
      dados: { ...unidade, ...dadosEditados }
    });
  };

  const handleDeletarUnidade = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta unidade?")) {
      await deletarUnidadeMutation.mutateAsync(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("ConfiguracaoTerapeutas")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configurar Unidades</h1>
              <p className="text-gray-500 mt-1">Gerencie as unidades do sistema</p>
            </div>
          </div>

          <Button onClick={() => setDialogNovaUnidade(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Unidade
          </Button>
        </div>

        <div className="grid gap-4">
          {unidades.map(unidade => (
            <Card key={unidade.id}>
              <CardContent className="p-6">
                {editandoUnidade === unidade.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Unidade</Label>
                      <Input
                        value={dadosEditados.nome}
                        onChange={(e) => setDadosEditados(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome da unidade"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Endereço</Label>
                      <Input
                        value={dadosEditados.endereco}
                        onChange={(e) => setDadosEditados(prev => ({ ...prev, endereco: e.target.value }))}
                        placeholder="Endereço completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link do Google Maps</Label>
                      <Input
                        value={dadosEditados.link_google_maps}
                        onChange={(e) => setDadosEditados(prev => ({ ...prev, link_google_maps: e.target.value }))}
                        placeholder="Cole o link do Google Maps aqui"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor de Identificação</Label>
                      <Input
                        type="color"
                        value={dadosEditados.cor}
                        onChange={(e) => setDadosEditados(prev => ({ ...prev, cor: e.target.value }))}
                        className="h-12 w-24"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleSalvarUnidade(unidade.id)} className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={() => setEditandoUnidade(null)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: unidade.cor || "#3B82F6" }}
                      >
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{unidade.nome}</h3>
                        {unidade.endereco && (
                          <p className="text-sm text-gray-600 mt-1">{unidade.endereco}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditarUnidade(unidade)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeletarUnidade(unidade.id)}
                        className="hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {unidades.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 font-medium">Nenhuma unidade cadastrada</p>
                <p className="text-sm text-gray-500 mt-2">Clique em "Nova Unidade" para começar</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog para criar nova unidade */}
      <Dialog open={dialogNovaUnidade} onOpenChange={setDialogNovaUnidade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Unidade</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Unidade *</Label>
              <Input
                value={novaUnidade.nome}
                onChange={(e) => setNovaUnidade(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Unidade Centro"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={novaUnidade.endereco}
                onChange={(e) => setNovaUnidade(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Endereço completo da unidade"
              />
            </div>

            <div className="space-y-2">
              <Label>Link do Google Maps</Label>
              <Input
                value={novaUnidade.link_google_maps}
                onChange={(e) => setNovaUnidade(prev => ({ ...prev, link_google_maps: e.target.value }))}
                placeholder="Cole o link do Google Maps aqui"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <Input
                type="color"
                value={novaUnidade.cor}
                onChange={(e) => setNovaUnidade(prev => ({ ...prev, cor: e.target.value }))}
                className="h-12 w-24"
              />
              <p className="text-xs text-gray-500">Escolha uma cor para identificar esta unidade</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovaUnidade(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCriarUnidade}
              disabled={!novaUnidade.nome}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Criar Unidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}