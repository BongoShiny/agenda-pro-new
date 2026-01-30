import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, User, Calendar as CalendarIcon, X } from "lucide-react";
import AbaDetalhes from "./AbaDetalhes";
import AbaConversao from "./AbaConversao";
import AbaHistorico from "./AbaHistorico";

const statusConfig = {
  novo: { label: "Novo", color: "bg-yellow-500" },
  em_contato: { label: "Em Contato", color: "bg-blue-500" },
  negociacao: { label: "Negociação", color: "bg-purple-500" },
  fechado: { label: "Fechado", color: "bg-green-500" },
  perdido: { label: "Perdido", color: "bg-red-500" },
};

export default function DetalhesLeadDialog({ open, onOpenChange, lead, onUpdate }) {
  const status = statusConfig[lead.status] || statusConfig.novo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <Tabs defaultValue="detalhes" className="w-full">
          {/* Header com fundo branco e informações principais */}
          <div className="sticky top-0 bg-white border-b z-10">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">{lead.nome}</DialogTitle>
                <Badge className={`${status.color} text-white text-xs px-3 py-1`}>
                  {status.label}
                </Badge>
              </div>
            </div>

            {/* Cards de informações rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">Telefone</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{lead.telefone}</p>
              </div>

              {lead.email && (
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-purple-600 font-medium">Email</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{lead.email}</p>
                </div>
              )}

              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Unidade</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{lead.unidade_nome}</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">Vendedor</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{lead.vendedor_nome}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger 
              value="detalhes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
            >
              Conversão
            </TabsTrigger>
            <TabsTrigger 
              value="informacoes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
            >
              Informações
            </TabsTrigger>
            <TabsTrigger 
              value="conversao" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
            >
              Sessões
            </TabsTrigger>
            <TabsTrigger 
              value="historico" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
            >
              Histórico
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Conteúdo das tabs */}
        <TabsContent value="detalhes" className="p-6 mt-0">
          <AbaConversao lead={lead} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="informacoes" className="p-6 mt-0">
          <AbaDetalhes lead={lead} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="conversao" className="p-6 mt-0">
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma sessão registrada ainda</p>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="p-6 mt-0">
          <AbaHistorico lead={lead} />
        </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}