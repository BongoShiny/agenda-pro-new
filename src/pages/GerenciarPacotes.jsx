import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Edit3, Trash2, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function GerenciarPacotesPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [pacoteEditando, setPacoteEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    servicos_incluidos: [],
    total_sessoes: 0,
    valor_total: 0,
    validade_dias: 90,
    ativo: true,
    observacoes: ""
  });
  const [servicoInput, setServicoInput] = useState("");

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        const isAdmin = user?.cargo === "administrador" || user?.role === "admin" || user?.cargo === "gerencia_unidades";
        if (!isAdmin) {
          navigate(createPageUrl("Agenda"));
        }
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      }
    };
    carregarUsuario();
  }, [navigate]);

  const { data: pacotes = [] } = useQuery({
    queryKey: ['pacotes'],
    queryFn: () => base44.entities.Pacote.list("-created_date"),
    initialData: [],
  });

  const criarPacoteMutation = useMutation({
    mutationFn: (dados) => base44.entities.Pacote.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes'] });
      setDialogAberto(false);
      resetForm();
    },
  });

  const atualizarPacoteMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.Pacote.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes'] });
      setDialogAberto(false);
      setPacoteEditando(null);
      resetForm();
    },
  });

  const deletarPacoteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pacote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes'] });
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      servicos_incluidos: [],
      total_sessoes: 0,
      valor_total: 0,
      validade_dias: 90,
      ativo: true,
      observacoes: ""
    });
    setServicoInput("");
  };

  const handleNovoPacote = () => {
    resetForm();
    setPacoteEditando(null);
    setDialogAberto(true);
  };

  const handleEditarPacote = (pacote) => {
    setPacoteEditando(pacote);
    setFormData({
      nome: pacote.nome || "",
      descricao: pacote.descricao || "",
      servicos_incluidos: pacote.servicos_incluidos || [],
      total_sessoes: pacote.total_sessoes || 0,
      valor_total: pacote.valor_total || 0,
      validade_dias: pacote.validade_dias || 90,
      ativo: pacote.ativo ?? true,
      observacoes: pacote.observacoes || ""
    });
    setDialogAberto(true);
  };

  const handleAdicionarServico = () => {
    if (servicoInput.trim()) {
      setFormData(prev => ({
        ...prev,
        servicos_incluidos: [...prev.servicos_incluidos, servicoInput.trim()]
      }));
      setServicoInput("");
    }
  };

  const handleRemoverServico = (index) => {
    setFormData(prev => ({
      ...prev,
      servicos_incluidos: prev.servicos_incluidos.filter((_, i) => i !== index)
    }));
  };

  const handleSalvar = async () => {
    if (!formData.nome || !formData.total_sessoes || !formData.valor_total) {
      alert("Por favor, preencha os campos obrigatórios: Nome, Total de Sessões e Valor Total");
      return;
    }

    try {
      if (pacoteEditando) {
        await atualizarPacoteMutation.mutateAsync({
          id: pacoteEditando.id,
          dados: formData
        });
        alert("✅ Pacote atualizado com sucesso!");
      } else {
        await criarPacoteMutation.mutateAsync(formData);
        alert("✅ Pacote criado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao salvar pacote:", error);
      alert("❌ Erro ao salvar pacote: " + error.message);
    }
  };

  const handleDeletar = async (pacote) => {
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir o pacote "${pacote.nome}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmacao) return;

    try {
      await deletarPacoteMutation.mutateAsync(pacote.id);
      alert("✅ Pacote excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir pacote:", error);
      alert("❌ Erro ao excluir pacote: " + error.message);
    }
  };

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
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Pacotes</h1>
              <p className="text-sm text-gray-500">{pacotes.length} pacotes cadastrados</p>
            </div>
          </div>
          <Button onClick={handleNovoPacote} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Pacote
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Pacotes Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            {pacotes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">Nenhum pacote cadastrado</p>
                <p className="text-sm mt-2">Clique em "Novo Pacote" para criar o primeiro</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Sessões</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacotes.map((pacote) => (
                    <TableRow key={pacote.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pacote.nome}</div>
                          {pacote.descricao && (
                            <div className="text-xs text-gray-500 mt-1">{pacote.descricao}</div>
                          )}
                          {pacote.servicos_incluidos?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {pacote.servicos_incluidos.map((servico, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {servico}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{pacote.total_sessoes}</span> sessões
                      </TableCell>
                      <TableCell>{pacote.validade_dias} dias</TableCell>
                      <TableCell className="text-right font-semibold text-purple-600">
                        {formatarMoeda(pacote.valor_total)}
                      </TableCell>
                      <TableCell>
                        {pacote.ativo ? (
                          <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditarPacote(pacote)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletar(pacote)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Criar/Editar Pacote */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pacoteEditando ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Nome do Pacote *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Pacote 10 Sessões"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do pacote"
                rows={2}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Serviços Incluídos</Label>
              <div className="flex gap-2">
                <Input
                  value={servicoInput}
                  onChange={(e) => setServicoInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdicionarServico()}
                  placeholder="Digite o nome do serviço e pressione Enter"
                />
                <Button type="button" onClick={handleAdicionarServico} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.servicos_incluidos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.servicos_incluidos.map((servico, idx) => (
                    <Badge key={idx} className="bg-purple-100 text-purple-800">
                      {servico}
                      <button
                        onClick={() => handleRemoverServico(idx)}
                        className="ml-2 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Total de Sessões *</Label>
              <Input
                type="number"
                value={formData.total_sessoes}
                onChange={(e) => setFormData(prev => ({ ...prev, total_sessoes: parseInt(e.target.value) || 0 }))}
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                value={formData.validade_dias}
                onChange={(e) => setFormData(prev => ({ ...prev, validade_dias: parseInt(e.target.value) || 90 }))}
                placeholder="90"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Total *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_total}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_total: parseFloat(e.target.value) || 0 }))}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Pacote Ativo</Label>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Informações adicionais sobre o pacote"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} className="bg-purple-600 hover:bg-purple-700">
              {pacoteEditando ? "Salvar Alterações" : "Criar Pacote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}