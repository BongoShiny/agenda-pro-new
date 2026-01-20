import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CRM() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroClinica, setFiltroClinica] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientesCRM"],
    queryFn: () => base44.entities.ClienteCRM.list("-updated_date", 100),
    initialData: [],
  });

  const clientesFiltrados = clientes.filter(cliente => {
    const matchSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefone.includes(searchTerm);
    const matchClinica = filtroClinica === "todas" || cliente.clinica === filtroClinica;
    const matchStatus = filtroStatus === "todos" || cliente.status_pacote === filtroStatus;
    return matchSearch && matchClinica && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-teal-600" />
              CRM Clientes Ativos
            </h1>
            <p className="text-gray-600 mt-1">Gerencie clientes com pacotes ativos</p>
          </div>
          <Link to={createPageUrl("NovoClienteCRM")}>
            <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
              <Plus className="w-4 h-4" />
              Novo Cliente
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10"
              prefix={<Search className="w-4 h-4" />}
            />
          </div>
          
          <Select value={filtroClinica} onValueChange={setFiltroClinica}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Clínicas</SelectItem>
              <SelectItem value="Londrina">Londrina</SelectItem>
              <SelectItem value="Moema">Moema</SelectItem>
              <SelectItem value="Av. Paulista">Av. Paulista</SelectItem>
              <SelectItem value="Pinheiros">Pinheiros</SelectItem>
              <SelectItem value="Alphaville">Alphaville</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Em Andamento">Em Andamento</SelectItem>
              <SelectItem value="Próximo da Renovação">Próximo da Renovação</SelectItem>
              <SelectItem value="Finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contador */}
        <div className="text-sm text-gray-600 mb-4">
          {clientesFiltrados.length} de {clientes.length} clientes
        </div>

        {/* Grid de Clientes */}
        {isLoading ? (
          <div className="text-center py-12">Carregando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum cliente encontrado</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientesFiltrados.map(cliente => (
              <CartaoCliente key={cliente.id} cliente={cliente} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CartaoCliente({ cliente }) {
  const progressoPercentual = cliente.sessoes_total > 0 
    ? Math.round((cliente.sessoes_realizadas / cliente.sessoes_total) * 100)
    : 0;

  const getTagColor = (tag) => {
    const colors = {
      "VIP": "bg-purple-100 text-purple-800",
      "Recorrente": "bg-blue-100 text-blue-800",
      "Risco de Cancelamento": "bg-red-100 text-red-800",
      "Novo": "bg-green-100 text-green-800"
    };
    return colors[tag] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status) => {
    const colors = {
      "Em Andamento": "text-teal-600",
      "Próximo da Renovação": "text-orange-600",
      "Finalizado": "text-gray-600"
    };
    return colors[status] || "text-gray-600";
  };

  return (
    <Link to={createPageUrl(`DetalheClienteCRM?id=${cliente.id}`)}>
      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold">
                {cliente.nome.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{cliente.nome}</h3>
                <p className="text-xs text-gray-500">{cliente.clinica}</p>
              </div>
            </div>
          </div>
          {cliente.tag && (
            <span className={`text-xs px-2 py-1 rounded-full ${getTagColor(cliente.tag)}`}>
              {cliente.tag}
            </span>
          )}
        </div>

        <div className="space-y-2 mb-4 text-sm">
          <p className="text-gray-600">📞 {cliente.telefone}</p>
          <p className="text-gray-600">💼 {cliente.pacote_nome}</p>
          <p className={`font-semibold ${getStatusColor(cliente.status_pacote)}`}>
            {cliente.status_pacote}
          </p>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Sessões</span>
            <span>{cliente.sessoes_realizadas}/{cliente.sessoes_total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-teal-600 h-2 rounded-full" 
              style={{ width: `${progressoPercentual}%` }}
            />
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-teal-600">R$ {cliente.valor_pacote?.toFixed(2) || "0,00"}</p>
        </div>
      </Card>
    </Link>
  );
}