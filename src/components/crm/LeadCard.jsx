import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, User, Flame, Snowflake, Sun, X, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const statusConfig = {
  lead: { label: "Lead", color: "bg-green-500" },
  avulso: { label: "Avulso", color: "bg-yellow-500" },
  plano_terapeutico: { label: "Plano Terapêutico", color: "bg-amber-700" },
  renovacao: { label: "Renovação", color: "bg-blue-500" },
};

const temperaturaConfig = {
  quente: { icon: Flame, color: "text-red-500", bg: "bg-red-50" },
  morno: { icon: Sun, color: "text-yellow-500", bg: "bg-yellow-50" },
  frio: { icon: Snowflake, color: "text-blue-500", bg: "bg-blue-50" },
};

export default function LeadCard({ lead, onClick, modoRemover, onRemover, isDuplicado, onClickSessoes }) {
  const status = statusConfig[lead.status] || statusConfig.lead;
  const temp = temperaturaConfig[lead.temperatura] || temperaturaConfig.morno;
  const TempIcon = temp.icon;

  // Buscar agendamentos do lead
  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-lead-card', lead.telefone],
    queryFn: async () => {
      const todos = await base44.entities.Agendamento.list();
      return todos.filter(ag => ag.cliente_telefone === lead.telefone);
    },
    initialData: [],
    enabled: !!lead.telefone
  });

  return (
    <Card 
      className={`hover:shadow-xl transition-all border-2 ${isDuplicado ? 'border-orange-500 bg-orange-50/30' : 'hover:border-blue-400'} relative ${modoRemover ? 'cursor-default' : 'cursor-pointer'}`}
      onClick={onClick}
    >
      {modoRemover && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemover();
          }}
          className="absolute -top-2 -right-2 z-10 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-all hover:scale-110"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 mb-1">{lead.nome}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{lead.vendedor_nome}</span>
            </div>
          </div>
          <div className={`p-2 rounded-lg ${temp.bg}`}>
            <TempIcon className={`w-5 h-5 ${temp.color}`} />
          </div>
        </div>

        {/* Status */}
        <div className="mb-4 flex items-center gap-2">
          <Badge className={`${status.color} text-white`}>
            {status.label}
          </Badge>
          {isDuplicado && (
            <Badge className="bg-orange-500 text-white">
              ⚠️ Duplicado
            </Badge>
          )}
        </div>

        {/* Informações */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{lead.telefone}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{lead.unidade_nome}</span>
          </div>
        </div>

        {/* Interesse */}
        {lead.interesse && (
          <div className="bg-blue-50 rounded-lg p-2 mb-3">
            <p className="text-xs text-blue-700 font-semibold">Interesse:</p>
            <p className="text-sm text-blue-900">{lead.interesse}</p>
          </div>
        )}

        {/* Sessões */}
        {agendamentos.length > 0 && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onClickSessoes && onClickSessoes(lead);
            }}
            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-3 mb-3 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold text-sm">Sessões</span>
              </div>
              <Badge className="bg-blue-600 text-white">
                {agendamentos.length}
              </Badge>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
          <span>
            Criado {format(new Date(lead.created_date), "dd/MM/yyyy", { locale: ptBR })}
          </span>
          {lead.tentativas_contato > 0 && (
            <span className="bg-gray-100 px-2 py-1 rounded">
              {lead.tentativas_contato} tentativa{lead.tentativas_contato > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}