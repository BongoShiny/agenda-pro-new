import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserPlus, Edit, Trash2, ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GerenciarClientes() {
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    data_nascimento: "",
    observacoes: ""
  });

  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list("nome"),
    initialData: [],
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-clientes'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const criarClienteMutation = useMutation({
    mutationFn: (dados) => base44.entities.Cliente.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setDialogAberto(false);
      resetForm();
      alert("✅ Cliente criado com sucesso!");
    },
  });

  const atualizarClienteMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.Cliente.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setDialogAberto(false);
      resetForm();
      alert("✅ Cliente atualizado com sucesso!");
    },
  });

  const deletarClienteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      alert("✅ Cliente removido com sucesso!");
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      telefone: "",
      email: "",
      data_nascimento: "",
      observacoes: ""
    });
    setClienteEditando(null);
  };

  const handleNovoCliente = () => {
    resetForm();
    setDialogAberto(true);
  };

  const handleEditarCliente = (cliente) => {
    setClienteEditando(cliente);
    setFormData({
      nome: cliente.nome || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      data_nascimento: cliente.data_nascimento || "",
      observacoes: cliente.observacoes || ""
    });
    setDialogAberto(true);
  };

  const handleDeletarCliente = async (cliente) => {
    // Verificar se o cliente tem agendamentos
    const agendamentosCliente = agendamentos.filter(ag => ag.cliente_id === cliente.id);
    
    if (agendamentosCliente.length > 0) {
      const confirmar = window.confirm(
        `⚠️ ATENÇÃO!\n\n` +
        `Este cliente possui ${agendamentosCliente.length} agendamento(s) registrado(s).\n\n` +
        `Ao deletar o cliente, os agendamentos NÃO serão excluídos, mas ficarão sem vínculo.\n\n` +
        `Deseja continuar?`
      );
      if (!confirmar) return;
    } else {
      const confirmar = window.confirm(
        `Tem certeza que deseja remover o cliente:\n\n${cliente.nome}?`
      );
      if (!confirmar) return;
    }

    deletarClienteMutation.mutate(cliente.id);
  };

  const handleSalvar = () => {
    if (!formData.nome) {
      alert("⚠️ Nome é obrigatório!");
      return;
    }

    if (clienteEditando) {
      atualizarClienteMutation.mutate({
        id: clienteEditando.id,
        dados: formData
      });
    } else {
      criarClienteMutation.mutate(formData);
    }
  };

  const clientesFiltrados = clientes.filter(cliente => {
    if (!busca) return true;
    const buscaLower = busca.toLowerCase();
    return (
      cliente.nome?.toLowerCase().includes(buscaLower) ||
      cliente.telefone?.toLowerCase().includes(buscaLower) ||
      cliente.email?.toLowerCase().includes(buscaLower)
    );
  });

  // Contar agendamentos por cliente
  const contarAgendamentos = (clienteId) => {
    return agendamentos.filter(ag => ag.cliente_id === clienteId).length;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Gerenciar Clientes (CRM)</CardTitle>
                    <CardDescription>
                      Cadastro completo de clientes - {clientesFiltrados.length} cadastrados
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={handleNovoCliente} className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Clientes */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data Nascimento</TableHead>
                    <TableHead className="text-center">Agendamentos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesFiltrados.map(cliente => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell>{cliente.telefone || "-"}</TableCell>
                        <TableCell>{cliente.email || "-"}</TableCell>
                        <TableCell>
                          {cliente.data_nascimento 
                            ? new Date(cliente.data_nascimento).toLocaleDateString('pt-BR')
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            {contarAgendamentos(cliente.id)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditarCliente(cliente)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletarCliente(cliente)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Criar/Editar Cliente */}
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {clienteEditando ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite o nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais sobre o cliente..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar} className="bg-blue-600 hover:bg-blue-700">
                {clienteEditando ? "Salvar Alterações" : "Criar Cliente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}