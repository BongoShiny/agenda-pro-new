import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Package, Search, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const formatarData = (dataString) => {
  if (!dataString) return "-";
  const [ano, mes, dia] = dataString.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return format(data, "dd/MM/yyyy", { locale: ptBR });
};

export default function VenderPacotesPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [dialogVendaAberto, setDialogVendaAberto] = useState(false);
  const [pacoteSelecionado, setPacoteSelecionado] = useState(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [formVenda, setFormVenda] = useState({
    cliente_id: "",
    cliente_nome: "",
    vendedor_id: "",
    vendedor_nome: "",
    valor_pago: 0,
    observacoes: ""
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      }
    };
    carregarUsuario();
  }, [navigate]);

  const { data: pacotes = [] } = useQuery({
    queryKey: ['pacotes-ativos'],
    queryFn: () => base44.entities.Pacote.list("-created_date"),
    select: (data) => data.filter(p => p.ativo),
    initialData: [],
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list("nome"),
    initialData: [],
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  const { data: pacotesClientes = [] } = useQuery({
    queryKey: ['pacotes-clientes'],
    queryFn: () => base44.entities.PacoteCliente.list("-created_date"),
    initialData: [],
  });

  const venderPacoteMutation = useMutation({
    mutationFn: async (dados) => {
      const hoje = new Date();
      const dataCompra = format(hoje, "yyyy-MM-dd");
      const dataValidade = format(addDays(hoje, pacoteSelecionado.validade_dias || 90), "yyyy-MM-dd");

      const pacoteCliente = {
        cliente_id: dados.cliente_id,
        cliente_nome: dados.cliente_nome,
        pacote_id: pacoteSelecionado.id,
        pacote_nome: pacoteSelecionado.nome,
        total_sessoes: pacoteSelecionado.total_sessoes,
        sessoes_utilizadas: 0,
        sessoes_restantes: pacoteSelecionado.total_sessoes,
        data_compra: dataCompra,
        data_validade: dataValidade,
        valor_pago: dados.valor_pago,
        vendedor_id: dados.vendedor_id,
        vendedor_nome: dados.vendedor_nome,
        status: "ativo",
        observacoes: dados.observacoes
      };

      return await base44.entities.PacoteCliente.create(pacoteCliente);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes-clientes'] });
      setDialogVendaAberto(false);
      resetFormVenda();
      setPacoteSelecionado(null);
    },
  });

  const resetFormVenda = () => {
    setFormVenda({
      cliente_id: "",
      cliente_nome: "",
      vendedor_id: "",
      vendedor_nome: "",
      valor_pago: 0,
      observacoes: ""
    });
    setBuscaCliente("");
  };

  const handleVenderPacote = (pacote) => {
    setPacoteSelecionado(pacote);
    setFormVenda(prev => ({ ...prev, valor_pago: pacote.valor_total }));
    setDialogVendaAberto(true);
  };

  const handleSelecionarCliente = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setFormVenda(prev => ({
        ...prev,
        cliente_id: clienteId,
        cliente_nome: cliente.nome
      }));
      setBuscaCliente(cliente.nome);
    }
  };

  const handleConfirmarVenda = async () => {
    if (!formVenda.cliente_id || !formVenda.cliente_nome) {
      alert("Por favor, selecione um cliente");
      return;
    }

    if (!formVenda.valor_pago || formVenda.valor_pago <= 0) {
      alert("Por favor, informe o valor pago");
      return;
    }

    try {
      await venderPacoteMutation.mutateAsync(formVenda);
      alert("✅ Pacote vendido com sucesso!");
    } catch (error) {
      console.error("Erro ao vender pacote:", error);
      alert("❌ Erro ao vender pacote: " + error.message);
    }
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const pacotesAtivos = pacotesClientes.filter(pc => pc.status === "ativo");
  const pacotesFinalizados = pacotesClientes.filter(pc => pc.status !== "ativo");

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
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vender Pacotes</h1>
              <p className="text-sm text-gray-500">{pacotes.length} pacotes disponíveis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Pacotes Disponíveis */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pacotes Disponíveis para Venda</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pacotes.map((pacote) => (
              <Card key={pacote.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{pacote.nome}</span>
                    <Package className="w-5 h-5 text-purple-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pacote.descricao && (
                    <p className="text-sm text-gray-600">{pacote.descricao}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sessões:</span>
                      <span className="font-semibold">{pacote.total_sessoes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Validade:</span>
                      <span className="font-semibold">{pacote.validade_dias} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor:</span>
                      <span className="font-bold text-purple-600">{formatarMoeda(pacote.valor_total)}</span>
                    </div>
                  </div>

                  {pacote.servicos_incluidos?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pacote.servicos_incluidos.map((servico, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {servico}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button 
                    onClick={() => handleVenderPacote(pacote)}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Vender Pacote
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {pacotes.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium text-gray-500">Nenhum pacote disponível</p>
                <p className="text-sm text-gray-400 mt-2">
                  Crie pacotes em "Gerenciar Pacotes"
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pacotes Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Pacotes Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ativos">
              <TabsList>
                <TabsTrigger value="ativos">Ativos ({pacotesAtivos.length})</TabsTrigger>
                <TabsTrigger value="finalizados">Finalizados ({pacotesFinalizados.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="ativos">
                {pacotesAtivos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum pacote ativo</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pacote</TableHead>
                        <TableHead>Sessões</TableHead>
                        <TableHead>Compra</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pacotesAtivos.map((pc) => (
                        <TableRow key={pc.id}>
                          <TableCell className="font-medium">{pc.cliente_nome}</TableCell>
                          <TableCell>{pc.pacote_nome}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div><span className="font-semibold text-green-600">{pc.sessoes_restantes}</span> restantes</div>
                              <div className="text-gray-500">{pc.sessoes_utilizadas} / {pc.total_sessoes}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatarData(pc.data_compra)}</TableCell>
                          <TableCell>{formatarData(pc.data_validade)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatarMoeda(pc.valor_pago)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="finalizados">
                {pacotesFinalizados.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum pacote finalizado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pacote</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sessões</TableHead>
                        <TableHead>Compra</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pacotesFinalizados.map((pc) => (
                        <TableRow key={pc.id}>
                          <TableCell className="font-medium">{pc.cliente_nome}</TableCell>
                          <TableCell>{pc.pacote_nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{pc.status}</Badge>
                          </TableCell>
                          <TableCell>{pc.sessoes_utilizadas} / {pc.total_sessoes}</TableCell>
                          <TableCell>{formatarData(pc.data_compra)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatarMoeda(pc.valor_pago)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Vender Pacote */}
      <Dialog open={dialogVendaAberto} onOpenChange={setDialogVendaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vender Pacote: {pacoteSelecionado?.nome}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-purple-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sessões:</span>
                <span className="font-semibold">{pacoteSelecionado?.total_sessoes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Validade:</span>
                <span className="font-semibold">{pacoteSelecionado?.validade_dias} dias</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-bold text-purple-600">{formatarMoeda(pacoteSelecionado?.valor_total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente *</Label>
              <div className="relative">
                <Input
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  placeholder="Digite o nome do cliente..."
                />
                {buscaCliente && clientesFiltrados.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {clientesFiltrados.map(cliente => (
                      <button
                        key={cliente.id}
                        onClick={() => handleSelecionarCliente(cliente.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        <div className="font-medium">{cliente.nome}</div>
                        {cliente.telefone && (
                          <div className="text-xs text-gray-500">{cliente.telefone}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select 
                value={formVenda.vendedor_id} 
                onValueChange={(value) => {
                  const vendedor = vendedores.find(v => v.id === value);
                  setFormVenda(prev => ({
                    ...prev,
                    vendedor_id: value,
                    vendedor_nome: vendedor?.nome || ""
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.filter(v => v.ativo).map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Pago *</Label>
              <Input
                type="number"
                step="0.01"
                value={formVenda.valor_pago}
                onChange={(e) => setFormVenda(prev => ({ ...prev, valor_pago: parseFloat(e.target.value) || 0 }))}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formVenda.observacoes}
                onChange={(e) => setFormVenda(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Informações adicionais"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogVendaAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarVenda} className="bg-purple-600 hover:bg-purple-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}