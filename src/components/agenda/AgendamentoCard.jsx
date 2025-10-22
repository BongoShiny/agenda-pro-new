import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Calendar } from "lucide-react";

const statusColors = {
  confirmado: "bg-emerald-500",
  agendado: "bg-amber-400",
  ausencia: "bg-fuchsia-600",
  cancelado: "bg-red-500",
  concluido: "bg-blue-500"
};

const statusIcons = {
  confirmado: CheckCircle,
  agendado: Clock,
  ausencia: XCircle,
  cancelado: XCircle,
  concluido: CheckCircle
};

const statusLabels = {
  confirmado: "Confirmado",
  agendado: "Agendado",
  ausencia: "Ausência",
  cancelado: "Cancelado",
  concluido: "Concluído"
};

export default function AgendamentoCard({ agendamento, onClick }) {
  const StatusIcon = statusIcons[agendamento.status] || Clock;
  const bgColor = statusColors[agendamento.status] || "bg-gray-500";

  return (
    <Card
      className={`${bgColor} text-white p-3 cursor-pointer hover:shadow-lg transition-all duration-200 border-0 rounded-lg`}
      onClick={() => onClick(agendamento)}
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-semibold text-sm truncate">{agendamento.cliente_nome}</span>
          </div>
          <span className="text-xs font-medium whitespace-nowrap">{agendamento.hora_inicio} - {agendamento.hora_fim}</span>
        </div>
        
        <div className="text-xs opacity-95 space-y-0.5">
          <div className="truncate">{agendamento.servico_nome}</div>
          <div className="truncate font-medium">{agendamento.profissional_nome}</div>
          {agendamento.tipo && (
            <div className="truncate capitalize">{agendamento.tipo.replace(/_/g, ' ')}</div>
          )}
        </div>

        {agendamento.observacoes && (
          <div className="text-xs opacity-90 italic truncate">{agendamento.observacoes}</div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
            {statusLabels[agendamento.status]}
          </Badge>
          {agendamento.sala && (
            <span className="text-xs opacity-90">Sala {agendamento.sala}</span>
          )}
        </div>
      </div>
    </Card>
  );
}