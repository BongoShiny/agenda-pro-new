import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, UserCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ConfigurarRecepcionistasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [novaRecepcionista, setNovaRecepcionista] = useState({
    nome: "",
    email: "",
    unidade_id: "",
    unidade_nome: "",
    ativo: true
  });

  const { data: recepcionistas = [] } = useQuery({
    queryKey: ['recepcionistas'],
    queryFn: () => base44.entities.Recepcionista.list("nome"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const criarMutation = useMutation({
    mutationFn: (dados) => base44.entities.Recepcionista.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recepcionistas'] });
      setNovaRecepcionista({ nome: "", email: "", unidade_id: "", unidade_nome: "", ativo: true });
    },
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.Recepcionista.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recepcionistas'] });
    },
  });

  const handleUnidadeChange = (unidadeId) => {
    const unidade = unidades.find(u => u.id === unidadeId);
    setNovaRecepcionista(prev => ({
      ...prev,
      unidade_id: unidadeId,
      unidade_nome: unidade?.nome || ""
    }));
  };

  const handleCriar = () => {
    if (!novaRecepcionista.nome || !novaRecepcionista.email || !novaRecepcionista.unidade_id) {
      alert("Preencha todos os campos!");
      return;
    }
    criarMutation.mutate(novaRecepcionista);
  };

  const handleDeletar = (id, nome) => {
    if (window.confirm(`Deseja remover ${nome}?`)) {
      deletarMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate(createPageUrl("Administrador"))}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-purple-600" />
                Configurar Recepcionistas
              </h1>
              <p className="text-gray-600 mt-1">Gerencie as recepcionistas e suas unidades</p>
            </div>
          </div>

          {/* Formulário de Nova Recepcionista */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Nova Recepcionista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Nome completo"
                  value={novaRecepcionista.nome}
                  onChange={(e) => setNovaRecepcionista(prev => ({ ...prev, nome: e.target.value }))}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={novaRecepcionista.email}
                  onChange={(e) => setNovaRecepcionista(prev => ({ ...prev, email: e.target.value }))}
                />
                <Select value={novaRecepcionista.unidade_id} onValueChange={handleUnidadeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleCriar} 
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={criarMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {criarMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Recepcionistas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recepcionistas.map(recep => (
            <Card key={recep.id} className="border-2 hover:border-purple-400 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">{recep.nome}</h3>
                    <p className="text-sm text-gray-600">{recep.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletar(recep.id, recep.nome)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-700 font-semibold mb-1">Unidade</p>
                  <p className="text-sm text-purple-900">{recep.unidade_nome}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {recepcionistas.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhuma recepcionista cadastrada</p>
            <p className="text-gray-400 text-sm mt-2">Adicione recepcionistas usando o formulário acima</p>
          </div>
        )}
      </div>
    </div>
  );
}