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
import { Card, CardContent } from "@/components/ui/card";
import { Search, UserPlus, Edit, Trash2, ArrowLeft, Users, Phone, Mail, MapPin, Calendar, Package, DollarSign, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import TrajetoriaClienteDialog from "../components/cliente/TrajetoriaClienteDialog";

export default function GerenciarClientes() {
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [trajetoriaAberta, setTrajetoriaAberta] = useState(false);
  const [clienteTrajetoria, setClienteTrajetoria] = useState(null);
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

  // Análise de dados do cliente
  const getClienteAnalise = (clienteId) => {
    const agendamentosCliente = agendamentos.filter(ag => ag.cliente_id === clienteId);
    
    // Buscar pacote ativo (último com informações de pacote)
    const agendamentoComPacote = agendamentosCliente
      .filter(ag => ag.cliente_pacote === "Sim" && ag.quantas_sessoes)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    const totalSessoes = agendamentoComPacote?.quantas_sessoes || 0;
    const sessoesRealizadas = agendamentoComPacote?.sessoes_feitas || 0;
    const valorPacote = agendamentoComPacote?.valor_combinado || 0;
    const formaPagamento = agendamentoComPacote?.tipo || "";

    // Calcular progresso
    const progresso = totalSessoes > 0 ? Math.round((sessoesRealizadas / totalSessoes) * 100) : 0;

    // Status baseado nos agendamentos recentes
    const agendamentosRecentes = agendamentosCliente
      .filter(ag => new Date(ag.data) >= new Date())
      .sort((a, b) => new Date(a.data) - new Date(b.data));

    const status = agendamentosRecentes.length > 0 ? "Em Andamento" : "Inativo";

    // Unidade mais frequente
    const unidadesCount = {};
    agendamentosCliente.forEach(ag => {
      if (ag.unidade_nome) {
        unidadesCount[ag.unidade_nome] = (unidadesCount[ag.unidade_nome] || 0) + 1;
      }
    });
    const unidadePrincipal = Object.keys(unidadesCount).length > 0 
      ? Object.keys(unidadesCount).reduce((a, b) => unidadesCount[a] > unidadesCount[b] ? a : b)
      : null;

    return {
      totalAgendamentos: agendamentosCliente.length,
      temPacote: !!agendamentoComPacote,
      totalSessoes,
      sessoesRealizadas,
      valorPacote,
      formaPagamento,
      progresso,
      status,
      unidadePrincipal
    };
  };

  const handleVerTrajetoria = (cliente) => {
    setClienteTrajetoria(cliente);
    setTrajetoriaAberta(true);
  };

  // Pegar iniciais do nome
  const getIniciais = (nome) => {
    if (!nome) return "?";
    const palavras = nome.trim().split(" ");
    if (palavras.length === 1) return palavras[0][0].toUpperCase();
    return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
  };

  // Cores aleatórias para avatares
  const getCores = (nome) => {
    const cores = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500"
    ];
    const index = nome ? nome.charCodeAt(0) % cores.length : 0;
    return cores[index];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="ghost" size="sm" className="mb-4 text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Gerenciar Clientes</h1>
                <p className="text-blue-100 mt-1">
                  Sistema CRM completo - {clientesFiltrados.length} clientes cadastrados
                </p>
              </div>
            </div>
            <Button 
              onClick={handleNovoCliente} 
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
              size="lg"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Novo Cliente
            </Button>
          </div>

          {/* Barra de busca */}
          <div className="mt-6">
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-12 h-14 bg-white/95 backdrop-blur-sm border-0 shadow-lg text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="max-w-7xl mx-auto p-6">
        {clientesFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </h3>
            <p className="text-gray-500">
              {busca ? "Tente outra busca" : "Clique em 'Novo Cliente' para começar"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientesFiltrados.map(cliente => {
              const analise = getClienteAnalise(cliente.id);
              
              return (
                <Card 
                  key={cliente.id} 
                  className="hover:shadow-2xl transition-all duration-300 border-0 shadow-lg overflow-hidden group"
                >
                  <CardContent className="p-0">
                    {/* Header do Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`w-14 h-14 ${getCores(cliente.nome)} rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0`}>
                          {getIniciais(cliente.nome)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 truncate">
                            {cliente.nome}
                          </h3>
                          
                          {/* Status e Unidade */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <Badge 
                              className={`${
                                analise.status === "Em Andamento" 
                                  ? "bg-green-100 text-green-700 border-green-200" 
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                              variant="outline"
                            >
                              {analise.status}
                            </Badge>
                            
                            {analise.unidadePrincipal && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <MapPin className="w-3 h-3 mr-1" />
                                {analise.unidadePrincipal}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-6 space-y-4">
                      {/* Informações de Contato */}
                      <div className="space-y-3">
                        {cliente.telefone && (
                          <div className="flex items-center gap-3 text-sm">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-700 font-medium">{cliente.telefone}</span>
                          </div>
                        )}
                        
                        {cliente.email && (
                          <div className="flex items-center gap-3 text-sm">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 truncate">{cliente.email}</span>
                          </div>
                        )}

                        {cliente.data_nascimento && (
                          <div className="flex items-center gap-3 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600">
                              {new Date(cliente.data_nascimento).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Informações de Pacote */}
                      {analise.temPacote && (
                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-semibold text-purple-900">PACOTE</span>
                            </div>
                            <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                              {analise.formaPagamento || "Cartão"}
                            </span>
                          </div>

                          {/* Sessões */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600 font-medium">Sessões</span>
                              <span className="font-bold text-purple-900">
                                {analise.sessoesRealizadas}/{analise.totalSessoes}
                              </span>
                            </div>
                            
                            {/* Barra de Progresso */}
                            <div className="w-full bg-purple-100 rounded-full h-2.5 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${analise.progresso}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">Progresso</span>
                              <span className="text-xs font-semibold text-purple-700">{analise.progresso}%</span>
                            </div>
                          </div>

                          {/* Valor do Pacote */}
                          {analise.valorPacote > 0 && (
                            <div className="flex items-center justify-between pt-3 border-t border-purple-200">
                              <span className="text-sm text-gray-600 font-medium">VALOR DO PACOTE</span>
                              <div className="flex items-center gap-1 text-green-600 font-bold text-lg">
                                <DollarSign className="w-4 h-4" />
                                R$ {analise.valorPacote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Total de Agendamentos (se não tiver pacote) */}
                      {!analise.temPacote && (
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <span className="text-sm text-gray-600">Total de Agendamentos</span>
                          <div className="text-2xl font-bold text-gray-900 mt-1">
                            {analise.totalAgendamentos}
                          </div>
                        </div>
                      )}

                      {/* Botões de Ação */}
                      <div className="space-y-2 pt-2">
                        <Button
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                          onClick={() => handleVerTrajetoria(cliente)}
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Ver Trajetória Completa
                        </Button>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => handleEditarCliente(cliente)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                            onClick={() => handleDeletarCliente(cliente)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de Criar/Editar Cliente */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {clienteEditando ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Nome Completo *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Digite o nome completo"
                className="mt-1.5 h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="mt-1.5 h-11"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="mt-1.5 h-11"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">Data de Nascimento</Label>
              <Input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className="mt-1.5 h-11"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Informações adicionais sobre o cliente..."
                rows={4}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} className="bg-blue-600 hover:bg-blue-700">
              {clienteEditando ? "Salvar Alterações" : "Criar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Trajetória */}
      <TrajetoriaClienteDialog
        open={trajetoriaAberta}
        onOpenChange={setTrajetoriaAberta}
        cliente={clienteTrajetoria}
        agendamentos={agendamentos}
      />
    </div>
  );
}