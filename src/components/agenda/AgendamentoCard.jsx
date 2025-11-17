import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Ban } from "lucide-react";

const statusColors = {
  confirmado: "bg-emerald-500",
  agendado: "bg-amber-400",
  ausencia: "bg-fuchsia-600",
  cancelado: "bg-red-500",
  concluido: "bg-blue-500",
  bloqueio: "bg-red-600"
};

const statusIcons = {
  confirmado: CheckCircle,
  agendado: Clock,
  ausencia: XCircle,
  cancelado: XCircle,
  concluido: CheckCircle,
  bloqueio: Ban
};

const statusLabels = {
  confirmado: "Confirmado",
  agendado: "Agendado",
  ausencia: "Ausência",
  cancelado: "Cancelado",
  concluido: "Concluído",
  bloqueio: "FECHADO"
};

export default function AgendamentoCard({ agendamento, onClick }) {
  const isBloqueio = agendamento.status === "bloqueio" || agendamento.tipo === "bloqueio" || agendamento.cliente_nome === "FECHADO";
  
  console.log(`🎴 CARD | ${agendamento.cliente_nome} | Data: ${agendamento.data} | ${agendamento.hora_inicio}`);
  
  if (isBloqueio) {
    return (
      <Card
        className="bg-red-600 text-white p-1.5 md:p-3 cursor-pointer hover:shadow-lg transition-all duration-200 border-0 rounded-lg flex items-center justify-center h-full"
        onClick={() => onClick(agendamento)}
      >
        <div className="text-center w-full">
          <Ban className="w-6 md:w-10 h-6 md:h-10 mx-auto mb-1 md:mb-2" />
          <div className="text-base md:text-2xl font-bold tracking-wide">FECHADO</div>
          <div className="text-[10px] md:text-sm opacity-90 mt-1 md:mt-2">{agendamento.hora_inicio} - {agendamento.hora_fim}</div>
        </div>
      </Card>
    );
  }

  const StatusIcon = statusIcons[agendamento.status] || Clock;
  const bgColor = statusColors[agendamento.status] || "bg-gray-500";

  return (
    <Card
      className={`${bgColor} text-white p-1.5 md:p-3 cursor-pointer hover:shadow-lg transition-all duration-200 border-0 rounded-lg h-full`}
      onClick={() => onClick(agendamento)}
    >
      <div className="space-y-1 md:space-y-1.5">
        <div className="flex items-start justify-between gap-1 md:gap-2">
          <div className="flex items-center gap-1 md:gap-1.5 min-w-0">
            <StatusIcon className="w-2.5 md:w-3.5 h-2.5 md:h-3.5 flex-shrink-0" />
            <span className="font-semibold text-[10px] md:text-sm truncate">{agendamento.cliente_nome}</span>
          </div>
          <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">{agendamento.hora_inicio}</span>
        </div>
        
        <div className="text-[9px] md:text-xs opacity-95 space-y-0.5">
          <div className="truncate">{agendamento.servico_nome}</div>
          <div className="hidden md:block truncate font-medium">{agendamento.profissional_nome}</div>
          {agendamento.tipo && agendamento.tipo !== "bloqueio" && (
            <div className="hidden md:block truncate capitalize">{agendamento.tipo.replace(/_/g, ' ')}</div>
          )}
        </div>

        {agendamento.observacoes && (
          <div className="hidden md:block text-xs opacity-90 italic truncate">{agendamento.observacoes}</div>
        )}

        <div className="flex items-center justify-between pt-0.5 md:pt-1">
          <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[9px] md:text-xs px-1 md:px-2 py-0 md:py-1">
            {statusLabels[agendamento.status]}
          </Badge>
          {agendamento.sala && (
            <span className="hidden md:inline text-xs opacity-90">Sala {agendamento.sala}</span>
          )}
        </div>
      </div>
    </Card>
  );
}