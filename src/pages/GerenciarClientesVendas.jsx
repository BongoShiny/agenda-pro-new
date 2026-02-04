import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Search, FileText, Eye, ExternalLink } from "lucide-react";
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
  const [busca, setBusca] = useState("");
  const [user, setUser] = useState(null);
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [dialogAberto, setDialogAberto] = useState(false);

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

  // Filtrar por busca
  const registrosFiltrados = registros.filter(r => {
    const termo = busca.toLowerCase();
    return (
      r.informacoes?.toLowerCase().includes(termo) ||
      r.criado_por?.toLowerCase().includes(termo)
    );
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por informações ou usuário..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
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
                  <TableHead>Criado Por</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      {busca ? "Nenhum registro encontrado com esses filtros" : "Nenhum registro cadastrado ainda"}
                    </TableCell>
                  </TableRow>
                ) : (
                  registrosFiltrados.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell>
                        {registro.data_registro ? format(new Date(registro.data_registro), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </TableCell>
                      <TableCell>{registro.criado_por || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRegistroSelecionado(registro);
                            setDialogAberto(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Informações da venda
                        </Button>
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
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}