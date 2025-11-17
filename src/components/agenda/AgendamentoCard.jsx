import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Ban, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function AgendamentoCard({ agendamento, onClick, onStatusChange }) {
  const isBloqueio = agendamento.status === "bloqueio" || agendamento.tipo === "bloqueio" || agendamento.cliente_nome === "FECHADO";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
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
            <span className="font-semibold text-[10px] md:text-sm">{agendamento.cliente_nome}</span>
          </div>
          <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">{agendamento.hora_inicio}</span>
        </div>
        
        <div className="text-[9px] md:text-xs opacity-95 space-y-0.5">
          <div>{agendamento.servico_nome}</div>
          <div className="font-medium">{agendamento.profissional_nome}</div>
          {agendamento.tipo && agendamento.tipo !== "bloqueio" && (
            <div className="capitalize">{agendamento.tipo.replace(/_/g, ' ')}</div>
          )}
        </div>

        {agendamento.observacoes && (
          <div className="text-[9px] md:text-xs opacity-90 italic">{agendamento.observacoes}</div>
        )}

        <div className="flex items-center justify-between pt-0.5 md:pt-1">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Badge 
                variant="secondary" 
                className="bg-white/20 text-white border-0 text-[9px] md:text-xs px-1 md:px-2 py-0 md:py-1 cursor-pointer hover:bg-white/30 transition-all flex items-center gap-1"
              >
                {statusLabels[agendamento.status]}
                <ChevronDown className="w-3 h-3" />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStatusChange) onStatusChange(agendamento, "agendado");
                  setDropdownOpen(false);
                }}
                className={agendamento.status === "agendado" ? "bg-gray-100" : ""}
              >
                {agendamento.status === "agendado" && "✓ "}Agendado
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStatusChange) onStatusChange(agendamento, "confirmado");
                  setDropdownOpen(false);
                }}
                className={agendamento.status === "confirmado" ? "bg-gray-100" : ""}
              >
                {agendamento.status === "confirmado" && "✓ "}Confirmado
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStatusChange) onStatusChange(agendamento, "ausencia");
                  setDropdownOpen(false);
                }}
                className={agendamento.status === "ausencia" ? "bg-gray-100" : ""}
              >
                {agendamento.status === "ausencia" && "✓ "}Ausência
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStatusChange) onStatusChange(agendamento, "cancelado");
                  setDropdownOpen(false);
                }}
                className={agendamento.status === "cancelado" ? "bg-gray-100" : ""}
              >
                {agendamento.status === "cancelado" && "✓ "}Cancelado
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStatusChange) onStatusChange(agendamento, "concluido");
                  setDropdownOpen(false);
                }}
                className={agendamento.status === "concluido" ? "bg-gray-100" : ""}
              >
                {agendamento.status === "concluido" && "✓ "}Concluído
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {agendamento.sala && (
            <span className="text-[9px] md:text-xs opacity-90">Sala {agendamento.sala}</span>
          )}
        </div>
      </div>
    </Card>
  );
}