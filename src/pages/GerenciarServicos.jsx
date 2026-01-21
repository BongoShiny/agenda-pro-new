import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Edit, Trash2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GerenciarServicosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    duracao_minutos: 60,
    cor: "#8B5CF6",
    ativo: true
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        const isAdmin = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin";
        if (!isAdmin) {
          navigate(createPageUrl("Agenda"));
        }
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();
  }, [navigate]);

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos-admin'],
    queryFn: () => base44.entities.Servico.list("nome"),
    initialData: [],
  });

  const criarServicoMutation = useMutation({
    mutationFn: async (dados) => {
      return await base44.entities.Servico.create(dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      setDialogAberto(false);
      resetForm();
      alert("✅ Serviço criado com sucesso!");
    },
  });

  const atualizarServicoMutation = useMutation({
    mutationFn: async ({ id, dados }) => {
      return await base44.entities.Servico.update(id, dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      setDialogAberto(false);
      resetForm();
      alert("✅ Serviço atualizado com sucesso!");
    },
  });

  const deletarServicoMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Servico.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      alert("✅ Serviço excluído com sucesso!");
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      duracao_minutos: 60,
      cor: "#8B5CF6",
      ativo: true
    });
    setServicoEditando(null);
  };

  const handleNovoServico = () => {
    resetForm();
    setDialogAberto(true);
  };

  const handleEditarServico = (servico) => {
    setServicoEditando(servico);
    setFormData({
      nome: servico.nome,
      duracao_minutos: servico.duracao_minutos,
      cor: servico.cor || "#8B5CF6",
      ativo: servico.ativo !== false
    });
    setDialogAberto(true);
  };

  const handleSalvar = () => {
    if (!formData.nome) {
      alert("⚠️ Nome do serviço é obrigatório!");
      return;
    }

    if (servicoEditando) {
      atualizarServicoMutation.mutate({
        id: servicoEditando.id,
        dados: formData
      });
    } else {
      criarServicoMutation.mutate(formData);
    }
  };

  const handleDeletar = async (id) => {
    if (!confirm("⚠️ Tem certeza que deseja excluir este serviço?")) {
      return;
    }
    deletarServicoMutation.mutate(id);
  };

  const handleToggleAtivo = async (servico) => {
    await atualizarServicoMutation.mutateAsync({
      id: servico.id,
      dados: { ...servico, ativo: !servico.ativo }
    });
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💆</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Serviços</h1>
              <p className="text-sm text-gray-500">Administre os serviços da Vibe Terapias</p>
            </div>
          </div>
          <Button onClick={handleNovoServico} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicos.map(servico => (
            <Card key={servico.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: servico.cor }}
                    />
                    <CardTitle className="text-lg">{servico.nome}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditarServico(servico)}
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletar(servico.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Duração:</span>
                    <span className="font-medium">{servico.duracao_minutos} minutos</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAtivo(servico)}
                      className={servico.ativo !== false ? "border-green-600 text-green-700 hover:bg-green-50" : "border-gray-300 text-gray-500"}
                    >
                      {servico.ativo !== false ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Inativo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {servicos.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💆</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-gray-500 mb-4">Comece criando seu primeiro serviço</p>
            <Button onClick={handleNovoServico} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Serviço
            </Button>
          </div>
        )}
      </div>

      {/* Dialog Novo/Editar Serviço */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {servicoEditando ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Serviço *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Liberação Miofascial"
              />
            </div>

            <div className="space-y-2">
              <Label>Duração (minutos) *</Label>
              <Input
                type="number"
                min="15"
                step="15"
                value={formData.duracao_minutos}
                onChange={(e) => setFormData(prev => ({ ...prev, duracao_minutos: parseInt(e.target.value) || 60 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  className="w-20 h-10"
                />
                <span className="text-sm text-gray-600">{formData.cor}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="ativo">Serviço ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} className="bg-purple-600 hover:bg-purple-700">
              {servicoEditando ? "Salvar Alterações" : "Criar Serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}