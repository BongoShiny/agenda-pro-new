import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Phone, MapPin, Calendar, Clock, User, Package, DollarSign, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

const statusLabels = {
  confirmado: { label: "Confirmado", color: "bg-emerald-500" },
  agendado: { label: "Agendado", color: "bg-amber-400" },
  ausencia: { label: "Ausência", color: "bg-fuchsia-600" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
  concluido: { label: "Concluído", color: "bg-blue-500" }
};

export default function HistoricoClientes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [dialogEditarAberto, setDialogEditarAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [dadosEdicao, setDadosEdicao] = useState({ nome: "", telefone: "" });

  const { data: usuarioAtual } = useQuery({
    queryKey: ['usuario-atual'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list("nome"),
    initialData: [],
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-historico'],
    queryFn: () => base44.entities.Agendamento.list("-data", 999999),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const atualizarClienteMutation = useMutation({
    mutationFn: async ({ clienteId, nomeAntigo, telefoneAntigo, novoNome, novoTelefone }) => {
      // Atualizar entidade Cliente
      await base44.entities.Cliente.update(clienteId, {
        nome: novoNome,
        telefone: novoTelefone
      });

      // Buscar todos os agendamentos deste cliente
      const todosAgendamentos = await base44.entities.Agendamento.list("-data", 999999);
      const agendamentosCliente = todosAgendamentos.filter(ag => 
        ag.cliente_id === clienteId || 
        (ag.cliente_nome === nomeAntigo && ag.cliente_telefone === telefoneAntigo)
      );

      // Atualizar todos os agendamentos com o novo nome e telefone
      for (const ag of agendamentosCliente) {
        await base44.entities.Agendamento.update(ag.id, {
          cliente_nome: novoNome,
          cliente_telefone: novoTelefone
        });
      }

      return { clienteId, novoNome, novoTelefone };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-historico'] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      setDialogEditarAberto(false);
      setClienteEditando(null);
      alert("✅ Cliente atualizado com sucesso! Todos os agendamentos foram atualizados.");
    },
    onError: (error) => {
      console.error("Erro ao atualizar cliente:", error);
      alert("❌ Erro ao atualizar cliente: " + error.message);
    }
  });

  const handleAbrirEdicao = (cliente) => {
    setClienteEditando(cliente);
    setDadosEdicao({
      nome: cliente.nome || "",
      telefone: cliente.telefone || ""
    });
    setDialogEditarAberto(true);
  };

  const handleSalvarEdicao = () => {
    if (!dadosEdicao.nome.trim()) {
      alert("⚠️ O nome não pode estar vazio!");
      return;
    }

    atualizarClienteMutation.mutate({
      clienteId: clienteEditando.id,
      nomeAntigo: clienteEditando.nome,
      telefoneAntigo: clienteEditando.telefone,
      novoNome: dadosEdicao.nome,
      novoTelefone: dadosEdicao.telefone
    });
  };

  const handleVoltar = () => {
    if (clienteSelecionado) {
      setClienteSelecionado(null);
    } else {
      navigate(createPageUrl("Administrador"));
    }
  };

  // Verificar se usuário é superior/admin
  const isAdmin = usuarioAtual?.cargo === "administrador" || 
                  usuarioAtual?.cargo === "superior" || 
                  usuarioAtual?.role === "admin" ||
                  usuarioAtual?.cargo === "gerencia_unidades";

  const clientesFiltrados = clientes.filter(c => 
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca)
  );

  const handleSelecionarCliente = (cliente) => {
    setClienteSelecionado(cliente);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-bold mb-2">⚠️ Acesso Negado</div>
          <p className="text-gray-600">Apenas superiores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  // Se um cliente está selecionado, mostrar histórico detalhado
  if (clienteSelecionado) {
    const agendamentosCliente = agendamentos.filter(ag => 
      ag.cliente_id === clienteSelecionado.id || 
      ag.cliente_nome === clienteSelecionado.nome
    ).sort((a, b) => new Date(b.data) - new Date(a.data));

    // Buscar pacote ativo
    const agendamentoComPacote = agendamentosCliente.find(ag => ag.cliente_pacote === "Sim");
    const temPacote = agendamentoComPacote?.cliente_pacote === "Sim";
    const totalSessoes = agendamentoComPacote?.quantas_sessoes || 0;
    const sessoesFeitas = agendamentoComPacote?.sessoes_feitas || 0;
    const sessoesRestantes = totalSessoes - sessoesFeitas;
    const progresso = totalSessoes > 0 ? (sessoesFeitas / totalSessoes) * 100 : 0;

    // Calcular valor total do pacote (pegar do primeiro agendamento com pacote)
    const valorPacote = agendamentoComPacote?.valor_combinado || 0;

    // Buscar cidade do cliente (pegar da unidade do último agendamento)
    const ultimoAgendamento = agendamentosCliente[0];
    const unidadeCliente = unidades.find(u => u.id === ultimoAgendamento?.unidade_id);
    const cidade = unidadeCliente?.endereco?.split(',').pop()?.trim() || unidadeCliente?.nome || "";

    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="outline"
            onClick={handleVoltar}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card do Cliente */}
            <div className="md:col-span-1">
              <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-500 rounded-lg flex items-center justify-center text-2xl font-bold">
                      {clienteSelecionado.nome?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{clienteSelecionado.nome}</h2>
                      {cidade && (
                        <div className="flex items-center gap-1 text-sm text-slate-200 mt-1">
                          <MapPin className="w-3 h-3" />
                          {cidade}
                        </div>
                      )}
                    </div>
                  </div>
                  {ultimoAgendamento?.status && (
                    <Badge className={`${statusLabels[ultimoAgendamento.status]?.color || 'bg-gray-500'} text-white border-0 mt-3 w-fit`}>
                      {statusLabels[ultimoAgendamento.status]?.label || ultimoAgendamento.status}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {clienteSelecionado.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{clienteSelecionado.telefone}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-500 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">PACOTE</span>
                      <span className="text-sm font-medium">SESSÕES</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">
                        {temPacote ? agendamentoComPacote.tipo?.replace(/_/g, ' ') || "Pacote Ativo" : "Sem pacote"}
                      </span>
                      <span className="text-lg font-bold">
                        {temPacote ? `${sessoesFeitas}/${totalSessoes}` : "-"}
                      </span>
                    </div>
                    {temPacote && (
                      <>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Progresso</span>
                          <span>{progresso.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-500 rounded-full h-2">
                          <div 
                            className="bg-white rounded-full h-2 transition-all" 
                            style={{ width: `${progresso}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-500 pt-4 mt-4">
                    <div className="text-sm mb-1">VALOR DO PACOTE</div>
                    <div className="text-2xl font-bold text-green-400">
                      R$ {valorPacote.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Histórico de Agendamentos */}
            <div className="md:col-span-2">
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  onClick={() => handleAbrirEdicao(clienteSelecionado)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar Cliente
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Agendamentos ({agendamentosCliente.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {agendamentosCliente.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum agendamento encontrado para este cliente
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {agendamentosCliente.map((ag) => {
                        const statusInfo = statusLabels[ag.status] || statusLabels.agendado;
                        
                        return (
                          <div 
                            key={ag.id} 
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-semibold">
                                  {format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                <Clock className="w-4 h-4 text-gray-500 ml-2" />
                                <span className="text-sm text-gray-600">
                                  {ag.hora_inicio} - {ag.hora_fim}
                                </span>
                              </div>
                              <Badge className={`${statusInfo.color} text-white border-0`}>
                                {statusInfo.label}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-700">
                                  <strong>Profissional:</strong> {ag.profissional_nome}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-700">
                                  <strong>Unidade:</strong> {ag.unidade_nome}
                                </span>
                              </div>

                              {ag.servico_nome && (
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-gray-500" />
                                  <span className="text-gray-700">
                                    <strong>Serviço:</strong> {ag.servico_nome}
                                  </span>
                                </div>
                              )}

                              {ag.cliente_pacote === "Sim" && (
                                <div className="bg-purple-50 border border-purple-200 rounded p-2 mt-2">
                                  <div className="flex items-center gap-2 text-purple-700">
                                    <Package className="w-4 h-4" />
                                    <span className="font-semibold">Pacote:</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                    <div>
                                      <span className="text-purple-600">Total sessões:</span>
                                      <span className="font-medium ml-1">{ag.quantas_sessoes}</span>
                                    </div>
                                    <div>
                                      <span className="text-purple-600">Realizadas:</span>
                                      <span className="font-medium ml-1">{ag.sessoes_feitas}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {(ag.valor_combinado || ag.sinal) && (
                                <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                                  <div className="flex items-center gap-2 text-amber-700 mb-2">
                                    <DollarSign className="w-4 h-4" />
                                    <span className="font-semibold">Valores:</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {ag.valor_combinado && (
                                      <div>
                                        <span className="text-amber-600">Combinado:</span>
                                        <span className="font-medium ml-1">R$ {ag.valor_combinado.toFixed(2)}</span>
                                      </div>
                                    )}
                                    {ag.sinal && (
                                      <div>
                                        <span className="text-amber-600">Sinal:</span>
                                        <span className="font-medium ml-1">R$ {ag.sinal.toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {ag.observacoes && (
                                <div className="bg-gray-50 rounded p-2 mt-2">
                                  <div className="text-xs text-gray-600">
                                    <strong>Observações:</strong> {ag.observacoes}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lista de clientes
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Histórico de Clientes</h1>
            <p className="text-gray-600 mt-1">Visualize o histórico completo de atendimentos</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Administrador"))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar cliente por nome ou telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {clientesFiltrados.map((cliente) => {
            const agendamentosCliente = agendamentos.filter(ag => 
              ag.cliente_id === cliente.id || ag.cliente_nome === cliente.nome
            );
            const totalAgendamentos = agendamentosCliente.length;
            const ultimoAgendamento = agendamentosCliente.sort((a, b) => 
              new Date(b.data) - new Date(a.data)
            )[0];

            return (
              <Card 
                key={cliente.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSelecionarCliente(cliente)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                      {cliente.nome?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
                      {cliente.telefone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          {cliente.telefone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Agendamentos:</span>
                    <span className="font-semibold text-gray-900">{totalAgendamentos}</span>
                  </div>

                  {ultimoAgendamento && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500">Último agendamento:</div>
                      <div className="text-sm text-gray-700 mt-1">
                        {format(criarDataPura(ultimoAgendamento.data), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {clientesFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum cliente encontrado
          </div>
        )}
      </div>

      {/* Dialog para editar cliente */}
      <Dialog open={dialogEditarAberto} onOpenChange={setDialogEditarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={dadosEdicao.nome}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, nome: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={dadosEdicao.telefone}
                onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ⚠️ Ao alterar os dados do cliente, <strong>todos os agendamentos</strong> serão atualizados automaticamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogEditarAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarEdicao}
              disabled={atualizarClienteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {atualizarClienteMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}