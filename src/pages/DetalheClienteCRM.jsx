import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DetalheClienteCRM() {
  const urlParams = new URLSearchParams(window.location.search);
  const clienteId = urlParams.get("id");

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["clienteCRM", clienteId],
    queryFn: () => clienteId ? base44.entities.ClienteCRM.filter({ id: clienteId }).then(r => r[0]) : null,
    enabled: !!clienteId,
  });

  const { data: anotacoes = [] } = useQuery({
    queryKey: ["anotacoes", clienteId],
    queryFn: () => clienteId ? base44.entities.AnotacaoCRM.filter({ cliente_id: clienteId }) : [],
    enabled: !!clienteId,
  });

  const { data: anexos = [] } = useQuery({
    queryKey: ["anexos", clienteId],
    queryFn: () => clienteId ? base44.entities.AnexoCRM.filter({ cliente_id: clienteId }) : [],
    enabled: !!clienteId,
  });

  if (isLoading || !cliente) return <div className="p-6">Carregando...</div>;

  const progressoPercentual = cliente.sessoes_total > 0 
    ? Math.round((cliente.sessoes_realizadas / cliente.sessoes_total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("CRM")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{cliente.nome}</h1>
            <p className="text-gray-600">{cliente.clinica}</p>
          </div>
          <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">{cliente.sessoes_total}</p>
            <p className="text-sm text-gray-600">Sessões Total</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">{cliente.sessoes_realizadas}</p>
            <p className="text-sm text-gray-600">Realizadas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{cliente.sessoes_total - cliente.sessoes_realizadas}</p>
            <p className="text-sm text-gray-600">Restantes</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{cliente.renovacoes}</p>
            <p className="text-sm text-gray-600">Renovações</p>
          </Card>
        </div>

        {/* Progress */}
        <Card className="p-6 mb-8">
          <h3 className="font-bold text-lg mb-4">Progresso do Pacote</h3>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-teal-600 h-3 rounded-full" 
              style={{ width: `${progressoPercentual}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">{progressoPercentual}% concluído</p>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="informacoes" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="informacoes">Informações</TabsTrigger>
            <TabsTrigger value="conversao">Conversão</TabsTrigger>
            <TabsTrigger value="anotacoes">Anotações</TabsTrigger>
            <TabsTrigger value="anexos">Anexos</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="informacoes" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">👤 Dados Pessoais</h3>
                <div className="space-y-3 text-sm">
                  <p><span className="text-gray-600">Telefone:</span> {cliente.telefone}</p>
                  <p><span className="text-gray-600">E-mail:</span> {cliente.email}</p>
                  <p><span className="text-gray-600">Data Nascimento:</span> {cliente.data_nascimento}</p>
                  <p><span className="text-gray-600">CPF:</span> {cliente.cpf || "Não informado"}</p>
                  <p><span className="text-gray-600">Origem:</span> {cliente.origem_lead}</p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">💼 Dados Comerciais</h3>
                <div className="space-y-3 text-sm">
                  <p><span className="text-gray-600">Clínica:</span> {cliente.clinica}</p>
                  <p><span className="text-gray-600">Data 1ª Sessão:</span> {cliente.data_primeira_sessao}</p>
                  <p><span className="text-gray-600">Vendedor:</span> {cliente.vendedor}</p>
                  <p><span className="text-gray-600">Canal:</span> {cliente.canal_venda}</p>
                  <p><span className="text-gray-600">Pacote:</span> {cliente.pacote_nome}</p>
                  <p><span className="text-gray-600">Valor:</span> R$ {cliente.valor_pacote?.toFixed(2)}</p>
                  <p><span className="text-gray-600">Pagamento:</span> {cliente.forma_pagamento}</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversao" className="mt-6">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">📊 Conversão de Pacote</h3>
              <p className="text-gray-600 text-sm">Informações de fechamento e motivos da conversão</p>
            </Card>
          </TabsContent>

          <TabsContent value="anotacoes" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">📝 Anotações Internas</h3>
                <Button className="bg-teal-600 hover:bg-teal-700">+ Nova Anotação</Button>
              </div>
              {anotacoes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma anotação</p>
              ) : (
                <div className="space-y-4">
                  {anotacoes.map(anotacao => (
                    <div key={anotacao.id} className="border-l-4 border-teal-600 pl-4 py-2">
                      <p className="text-xs text-gray-500">{anotacao.tipo} • {anotacao.data}</p>
                      <p className="text-sm text-gray-900">{anotacao.conteudo}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="anexos" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">📎 Anexos</h3>
                <Button className="bg-teal-600 hover:bg-teal-700">+ Novo Anexo</Button>
              </div>
              {anexos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum anexo</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {anexos.map(anexo => (
                    <a key={anexo.id} href={anexo.url} target="_blank" rel="noopener noreferrer" className="p-4 border rounded hover:bg-gray-50">
                      <p className="font-semibold text-sm text-gray-900">{anexo.nome_arquivo}</p>
                      <p className="text-xs text-gray-500">{anexo.tipo}</p>
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">⏱️ Histórico</h3>
              <p className="text-gray-500 text-center py-8">Histórico de eventos será exibido aqui</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}