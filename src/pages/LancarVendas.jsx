import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, DollarSign, Save, X, Upload, Eye, ExternalLink, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function LancarVendasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [informacoesVenda, setInformacoesVenda] = useState("");
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), "yyyy-MM-dd"));
  const [comprovanteUrl, setComprovanteUrl] = useState("");
  const [mostrarVendasLancadas, setMostrarVendasLancadas] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editandoInformacoes, setEditandoInformacoes] = useState("");
  const [editandoDataPagamento, setEditandoDataPagamento] = useState("");
  const [editandoComprovanteUrl, setEditandoComprovanteUrl] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: minhasVendas = [] } = useQuery({
    queryKey: ['minhas-vendas', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const vendas = await base44.entities.RegistroManualVendas.filter({ criado_por: user.email });
      return vendas.sort((a, b) => new Date(b.data_registro) - new Date(a.data_registro));
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const criarRegistroMutation = useMutation({
    mutationFn: async (dadosRegistro) => {
      return await base44.entities.RegistroManualVendas.create(dadosRegistro);
    },
    onSuccess: () => {
      alert("✅ Venda registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['registros-vendas'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-vendas', user?.email] });
      setInformacoesVenda("");
      setDataPagamento(format(new Date(), "yyyy-MM-dd"));
      setComprovanteUrl("");
    },
    onError: (error) => {
      alert(`❌ Erro ao registrar venda: ${error.message}`);
    },
  });

  const atualizarRegistroMutation = useMutation({
    mutationFn: async ({ id, dados }) => {
      return await base44.entities.RegistroManualVendas.update(id, dados);
    },
    onSuccess: () => {
      alert("✅ Venda atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['registros-vendas'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-vendas', user?.email] });
      setDialogAberto(false);
      setModoEdicao(false);
      setRegistroSelecionado(null);
    },
    onError: (error) => {
      alert(`❌ Erro ao atualizar venda: ${error.message}`);
    },
  });

  const handleUploadComprovante = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingComprovante(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setComprovanteUrl(file_url);
      alert("✅ Comprovante anexado com sucesso!");
    } catch (error) {
      alert(`❌ Erro ao anexar comprovante: ${error.message}`);
    } finally {
      setUploadingComprovante(false);
    }
  };

  const handleUploadComprovanteEdicao = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingComprovante(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditandoComprovanteUrl(file_url);
      alert("✅ Comprovante atualizado com sucesso!");
    } catch (error) {
      alert(`❌ Erro ao atualizar comprovante: ${error.message}`);
    } finally {
      setUploadingComprovante(false);
    }
  };

  const abrirParaEdicao = (venda) => {
    setRegistroSelecionado(venda);
    setEditandoInformacoes(venda.informacoes);
    setEditandoDataPagamento(venda.data_pagamento || "");
    setEditandoComprovanteUrl(venda.comprovante_url || "");
    setModoEdicao(true);
    setDialogAberto(true);
  };

  const salvarEdicao = () => {
    if (!editandoInformacoes.trim()) {
      alert("⚠️ Preencha as informações da venda!");
      return;
    }

    if (!editandoDataPagamento) {
      alert("⚠️ Preencha a data do pagamento!");
      return;
    }

    // Garantir que a data está no formato YYYY-MM-DD
    const dataFormatada = editandoDataPagamento.includes('/') 
      ? editandoDataPagamento.split('/').reverse().join('-')
      : editandoDataPagamento;

    atualizarRegistroMutation.mutate({
      id: registroSelecionado.id,
      dados: {
        informacoes: editandoInformacoes,
        data_pagamento: dataFormatada,
        comprovante_url: editandoComprovanteUrl,
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!informacoesVenda.trim()) {
      alert("⚠️ Preencha as informações da venda!");
      return;
    }

    if (!dataPagamento) {
      alert("⚠️ Preencha a data do pagamento!");
      return;
    }

    criarRegistroMutation.mutate({
      informacoes: informacoesVenda,
      data_pagamento: dataPagamento,
      comprovante_url: comprovanteUrl,
      criado_por: user?.email,
      data_registro: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const isVendedor = user?.cargo === "vendedor";
  const isAdmin = user?.role === "admin" || user?.cargo === "administrador" || user?.cargo === "superior";

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isVendedor && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-6">Esta página é exclusiva para vendedores.</p>
          <Button onClick={() => navigate(createPageUrl("Agenda"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Agenda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate(createPageUrl("Agenda"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  Lançar Vendas
                </h1>
                <p className="text-gray-600 mt-1">Registre vendas nos relatórios financeiros</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setMostrarVendasLancadas(!mostrarVendasLancadas)}
              className="bg-blue-50 border-blue-300 hover:bg-blue-100"
            >
              <List className="w-4 h-4 mr-2" />
              {mostrarVendasLancadas ? "Ocultar" : "Ver vendas lançadas"}
            </Button>
          </div>

          {mostrarVendasLancadas ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Minhas Vendas Lançadas</h2>
                <div className="bg-green-100 border border-green-300 rounded-lg px-4 py-2">
                  <p className="text-sm text-green-700 font-medium">
                    Total de vendas: <span className="text-lg font-bold">{minhasVendas.length}</span>
                  </p>
                </div>
              </div>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Registro</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {minhasVendas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                          Você ainda não lançou nenhuma venda
                        </TableCell>
                      </TableRow>
                    ) : (
                      minhasVendas.map((venda) => (
                        <TableRow key={venda.id}>
                          <TableCell>
                            {venda.data_registro ? format(new Date(venda.data_registro), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell>
                            {venda.data_pagamento ? format(new Date(venda.data_pagamento), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRegistroSelecionado(venda);
                                  setModoEdicao(false);
                                  setDialogAberto(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver detalhes
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-blue-50 border-blue-300 hover:bg-blue-100"
                                onClick={() => abrirParaEdicao(venda)}
                              >
                                Editar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informações da Venda */}
              <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  📝 Insira as informações da sua venda:
                </h3>
                
                <Textarea
                  value={informacoesVenda}
                  onChange={(e) => setInformacoesVenda(e.target.value)}
                  placeholder="Digite todas as informações da venda aqui..."
                  rows={10}
                  className="w-full"
                />
              </div>

              {/* Data do Pagamento */}
              <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  📅 Data do pagamento:
                </h3>
                
                <Input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Anexar Comprovante */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  📎 Anexar Comprovante:
                </h3>
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center gap-3 border-2 border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <Upload className="w-5 h-5 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {comprovanteUrl ? "✅ Comprovante anexado" : "Clique para anexar comprovante"}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadComprovante}
                      className="hidden"
                      disabled={uploadingComprovante}
                    />
                  </label>
                  {comprovanteUrl && (
                    <a href={comprovanteUrl} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" size="sm">
                        Ver Comprovante
                      </Button>
                    </a>
                  )}
                </div>
                {uploadingComprovante && (
                  <p className="text-sm text-blue-600 mt-2">Enviando comprovante...</p>
                )}
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(createPageUrl("Agenda"))}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={criarRegistroMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {criarRegistroMutation.isPending ? "Salvando..." : "Lançar Venda"}
                </Button>
              </div>
            </form>
          )}

          {/* Dialog com Detalhes ou Edição */}
          <Dialog open={dialogAberto} onOpenChange={(open) => {
            setDialogAberto(open);
            if (!open) {
              setModoEdicao(false);
              setRegistroSelecionado(null);
            }
          }}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{modoEdicao ? "Editar Venda" : "Detalhes da Venda"}</DialogTitle>
              </DialogHeader>
              
              {registroSelecionado && (
                modoEdicao ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Informações:</h3>
                      <Textarea
                        value={editandoInformacoes}
                        onChange={(e) => setEditandoInformacoes(e.target.value)}
                        placeholder="Digite as informações da venda..."
                        rows={8}
                        className="w-full"
                      />
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Data do Pagamento:</h3>
                      <Input
                        type="date"
                        value={editandoDataPagamento}
                        onChange={(e) => setEditandoDataPagamento(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Comprovante:</h3>
                      {editandoComprovanteUrl && (
                        <img 
                          src={editandoComprovanteUrl} 
                          alt="Comprovante" 
                          className="w-full max-w-md rounded-lg border mb-3"
                        />
                      )}
                      <label className="cursor-pointer">
                        <div className="flex items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <Upload className="w-5 h-5 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {editandoComprovanteUrl ? "Trocar comprovante" : "Adicionar comprovante"}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadComprovanteEdicao}
                          className="hidden"
                          disabled={uploadingComprovante}
                        />
                      </label>
                      {uploadingComprovante && (
                        <p className="text-sm text-blue-600">Enviando comprovante...</p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setModoEdicao(false);
                          setDialogAberto(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={salvarEdicao}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={atualizarRegistroMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {atualizarRegistroMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-semibold mb-2">Informações:</h3>
                      <p className="whitespace-pre-wrap text-sm">{registroSelecionado.informacoes}</p>
                    </div>

                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h3 className="font-semibold mb-2">Data do Pagamento:</h3>
                      <p className="text-sm">
                        {registroSelecionado.data_pagamento ? format(new Date(registroSelecionado.data_pagamento), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </p>
                    </div>

                    {registroSelecionado.comprovante_url && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Comprovante:</h3>
                        <div className="space-y-3">
                          <img 
                            src={registroSelecionado.comprovante_url} 
                            alt="Comprovante" 
                            className="w-full max-w-md rounded-lg border"
                          />
                          <a 
                            href={registroSelecionado.comprovante_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Abrir em nova guia
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-500">
                      <p><strong>Registrado em:</strong> {registroSelecionado.data_registro ? format(new Date(registroSelecionado.data_registro), "dd/MM/yyyy", { locale: ptBR }) : "-"}</p>
                    </div>
                  </div>
                )
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}