import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Search, Calendar, DollarSign, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function GerenciarClientesVendasPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  // Buscar todos os agendamentos do tipo avulsa e plano_terapeutico (lançamentos de vendas)
  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos-vendas'],
    queryFn: async () => {
      const agendamentos = await base44.entities.Agendamento.list("-created_date");
      // Filtrar apenas os lançamentos de vendas
      // Identificamos pelo formato específico das observações criadas no Lançar Vendas
      return agendamentos.filter(a => 
        (a.tipo === "avulsa" || a.tipo === "plano_terapeutico") && 
        a.status === "concluido" &&
        a.observacoes_vendedores && 
        a.observacoes_vendedores.includes("Motivo:") // Campo específico do Lançar Vendas
      );
    },
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
  const lancamentosFiltrados = lancamentos.filter(l => {
    const termo = busca.toLowerCase();
    return (
      l.cliente_nome?.toLowerCase().includes(termo) ||
      l.cliente_telefone?.toLowerCase().includes(termo) ||
      l.vendedor_nome?.toLowerCase().includes(termo) ||
      l.servico_nome?.toLowerCase().includes(termo)
    );
  });

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "-";
    return `R$ ${parseFloat(valor).toFixed(2).replace(".", ",")}`;
  };

  const formatarData = (data) => {
    if (!data) return "-";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  };

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
                  Clientes do Lançar Vendas
                </h1>
                <p className="text-gray-600 mt-1">Todos os clientes cadastrados no lançamento de vendas</p>
              </div>
            </div>
          </div>

          {/* Busca */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome, telefone, vendedor ou serviço..."
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
                <Users className="w-8 h-8 text-teal-600" />
                <div>
                  <p className="text-sm text-gray-600">Total de Lançamentos</p>
                  <p className="text-2xl font-bold text-gray-900">{lancamentos.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Valor Total Combinado</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatarMoeda(lancamentos.reduce((acc, l) => acc + (l.valor_combinado || 0), 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Recebido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatarMoeda(lancamentos.reduce((acc, l) => acc + ((l.sinal || 0) + (l.final_pagamento || 0)), 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor Combinado</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead className="text-right">Falta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      {busca ? "Nenhum lançamento encontrado com esse termo" : "Nenhum lançamento cadastrado ainda"}
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentosFiltrados.map((lancamento) => {
                    const totalPago = (lancamento.sinal || 0) + (lancamento.final_pagamento || 0);
                    return (
                      <TableRow key={lancamento.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {lancamento.cliente_nome}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {lancamento.cliente_telefone || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{lancamento.servico_nome}</TableCell>
                        <TableCell>{lancamento.vendedor_nome || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatarData(lancamento.data)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            lancamento.tipo === "plano_terapeutico" 
                              ? "bg-purple-100 text-purple-800" 
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {lancamento.tipo === "plano_terapeutico" ? "Plano" : "Avulso"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatarMoeda(lancamento.valor_combinado)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatarMoeda(totalPago)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {formatarMoeda(lancamento.falta_quanto)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}