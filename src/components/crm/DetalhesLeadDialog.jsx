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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{lead.nome}</DialogTitle>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={`${status.color} text-white`}>
                  {status.label}
                </Badge>
                <span className="text-sm text-gray-500">ID: {lead.id}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Informações Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{lead.telefone}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{lead.unidade_nome}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span>{lead.vendedor_nome}</span>
          </div>
        </div>

        <Tabs defaultValue="detalhes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="conversao">Conversão</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes">
            <AbaDetalhes lead={lead} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="conversao">
            <AbaConversao lead={lead} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="historico">
            <AbaHistorico lead={lead} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}