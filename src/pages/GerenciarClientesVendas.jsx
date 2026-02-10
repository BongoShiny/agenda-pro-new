import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, Search, FileText, Eye, ExternalLink, Trash2, Edit, StickyNote } from "lucide-react";
import DialogEditarAnotacoes from "@/components/DialogEditarAnotacoes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function GerenciarClientesVendasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("todas");
  const [user, setUser] = useState(null);
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoAnotacoes, setEditandoAnotacoes] = useState(false);
  const [anotacoes, setAnotacoes] = useState("");
  const [dialogAnotacoesAberto, setDialogAnotacoesAberto] = useState(false);
  const [registroParaAnotacoes, setRegistroParaAnotacoes] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  // Buscar registros de vendas
  const { data: registros = [] } = useQuery({
    queryKey: ['registros-vendas'],
    queryFn: () => base44.entities.RegistroManualVendas.list("-created_date"),
    initialData: [],
  });

  // Buscar unidades
  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.filter({ ativa: true }),
    initialData: [],
  });

  // Mutation para excluir venda
  const excluirVendaMutation = useMutation({
    mutationFn: async (registroId) => {
      await base44.entities.RegistroManualVendas.delete(registroId);
      
      // Criar log
      await base44.entities.LogAcao.create({
        tipo: "excluiu_agendamento",
        usuario_email: user?.email || "sistema",
        descricao: `Excluiu registro de venda manual`,
        entidade_tipo: "RegistroManualVendas",
        entidade_id: registroId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-vendas'] });
      setDialogAberto(false);
      setRegistroSelecionado(null);
      alert("✅ Venda excluída com sucesso!");
    },
    onError: (error) => {
      alert("❌ Erro ao excluir venda: " + error.message);
    }
  });

  // Mutation para salvar anotações
  const salvarAnotacoesMutation = useMutation({
    mutationFn: async ({ registroId, novasAnotacoes }) => {
      await base44.entities.RegistroManualVendas.update(registroId, {
        anotacoes: novasAnotacoes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-vendas'] });
      setEditandoAnotacoes(false);
      alert("✅ Anotações salvas com sucesso!");
    },
    onError: (error) => {
      alert("❌ Erro ao salvar anotações: " + error.message);
    }
  });

  const handleExcluirVenda = async () => {
    if (!window.confirm("⚠️ Tem certeza que deseja excluir esta venda?\n\nEsta ação não pode ser desfeita!")) {
      return;
    }
    
    excluirVendaMutation.mutate(registroSelecionado.id);
  };

  const handleAbrirDialog = (registro) => {
    setRegistroSelecionado(registro);
    setAnotacoes(registro.anotacoes || "");
    setEditandoAnotacoes(false);
    setDialogAberto(true);
  };

  const handleSalvarAnotacoes = () => {
    salvarAnotacoesMutation.mutate({
      registroId: registroSelecionado.id,
      novasAnotacoes: anotacoes
    });
  };

  const handleSalvarAnotacoesTabela = async (novasAnotacoes) => {
    try {
      await base44.entities.RegistroManualVendas.update(registroParaAnotacoes.id, {
        anotacoes: novasAnotacoes
      });
      queryClient.invalidateQueries({ queryKey: ['registros-vendas'] });
      setDialogAnotacoesAberto(false);
      setRegistroParaAnotacoes(null);
    } catch (error) {
      alert("Erro ao salvar anotações: " + error.message);
    }
  };

  const isAdmin = user?.role === "admin" || user?.cargo === "administrador" || user?.cargo === "superior" || user?.cargo === "gerencia_unidades";

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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-6">Apenas superiores podem acessar esta página.</p>
          <Button onClick={() => navigate(createPageUrl("Agenda"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Função para extrair data do pagamento das informações
  const extrairDataPagamento = (informacoes) => {
    if (!informacoes) return "Data do pagamento não foi adicionada";
    
    // Tenta capturar dd/MM/yyyy ou dd/MM
    const match = informacoes.match(/Data do pagamento:\s*(\d{2}\/\d{2}(?:\/\d{4})?)/i);
    if (match) {
      return match[1];
    }
    return "Data do pagamento não foi adicionada";
  };

  // Filtrar por busca e unidade
  const registrosFiltrados = registros.filter(r => {
    const termo = busca.toLowerCase();
    const buscaMatch = (
      r.informacoes?.toLowerCase().includes(termo) ||
      r.criado_por?.toLowerCase().includes(termo)
    );
    const unidadeMatch = unidadeFiltro === "todas" || r.unidade_id === unidadeFiltro;
    return buscaMatch && unidadeMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate(createPageUrl("Administrador"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Users className="w-8 h-8 text-teal-600" />
                  Gerenciar Lançar Vendas
                </h1>
                <p className="text-gray-600 mt-1">Visualize todos os registros de vendas manuais</p>
              </div>
            </div>
          </div>

          {/* Busca e Filtros */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Buscar por informações ou usuário..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as unidades</SelectItem>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-teal-600" />
                <div>
                  <p className="text-sm text-gray-600">Total de Registros</p>
                  <p className="text-2xl font-bold text-gray-900">{registros.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Vendas Filtradas</p>
                  <p className="text-2xl font-bold text-gray-900">{registrosFiltrados.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total de Vendas</p>
                  <p className="text-2xl font-bold text-gray-900">{registrosFiltrados.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Registro</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Criado Por</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      {busca ? "Nenhum registro encontrado com esses filtros" : "Nenhum registro cadastrado ainda"}
                    </TableCell>
                  </TableRow>
                ) : (
                  registrosFiltrados.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell>
                        {extrairDataPagamento(registro.informacoes)}
                      </TableCell>
                      <TableCell>{registro.unidade_nome || "-"}</TableCell>
                      <TableCell>{registro.criado_por || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {/* Anotações */}
                          {registro.anotacoes ? (
                            <button
                              onClick={() => {
                                setRegistroParaAnotacoes(registro);
                                setDialogAnotacoesAberto(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left w-full"
                            >
                              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="truncate">Anotações</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setRegistroParaAnotacoes(registro);
                                setDialogAnotacoesAberto(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-white border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors w-full"
                            >
                              <FileText className="w-4 h-4 flex-shrink-0" />
                              <span>Anotações</span>
                            </button>
                          )}
                          
                          {/* Informações */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAbrirDialog(registro)}
                            className="w-full"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Informações
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Dialog com Informações */}
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Informações da Venda</DialogTitle>
              </DialogHeader>
              
              {registroSelecionado && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <h3 className="font-semibold mb-2">Unidade:</h3>
                    <p className="text-sm">{registroSelecionado.unidade_nome || "-"}</p>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-semibold mb-2">Informações:</h3>
                    <p className="whitespace-pre-wrap text-sm">{registroSelecionado.informacoes}</p>
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
                    <p><strong>Por:</strong> {registroSelecionado.criado_por}</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setDialogAberto(false)}
                    >
                      Fechar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleExcluirVenda}
                      disabled={excluirVendaMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {excluirVendaMutation.isPending ? "Excluindo..." : "Excluir Venda"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog para editar anotações da tabela */}
          {registroParaAnotacoes && (
            <DialogEditarAnotacoes
              aberto={dialogAnotacoesAberto}
              setAberto={setDialogAnotacoesAberto}
              anotacoesIniciais={registroParaAnotacoes.anotacoes || ""}
              onSalvar={handleSalvarAnotacoesTabela}
              titulo="Anotações da Venda"
            />
          )}
        </div>
      </div>
    </div>
  );
}