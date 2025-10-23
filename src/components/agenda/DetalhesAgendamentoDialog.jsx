import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, User, Briefcase, MapPin, Tag, FileText } from "lucide-react";

const statusLabels = {
  confirmado: { label: "Confirmado", color: "bg-emerald-500" },
  agendado: { label: "Agendado", color: "bg-amber-400" },
  ausencia: { label: "Ausência", color: "bg-fuchsia-600" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
  concluido: { label: "Concluído", color: "bg-blue-500" }
};

export default function DetalhesAgendamentoDialog({ open, onOpenChange, agendamento, onDelete, usuarioAtual }) {
  if (!agendamento) return null;

  const statusInfo = statusLabels[agendamento.status] || statusLabels.agendado;
  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Agendamento</span>
            <Badge className={`${statusInfo.color} text-white border-0`}>
              {statusInfo.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">Cliente</div>
              <div className="font-semibold text-lg">{agendamento.cliente_nome}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">Profissional</div>
              <div className="font-medium">{agendamento.profissional_nome}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">Serviço</div>
              <div className="font-medium">{agendamento.servico_nome}</div>
              {agendamento.tipo && (
                <div className="text-sm text-gray-600 capitalize">{agendamento.tipo.replace(/_/g, ' ')}</div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">Unidade</div>
              <div className="font-medium">{agendamento.unidade_nome}</div>
              {agendamento.sala && <div className="text-sm text-gray-600">Sala {agendamento.sala}</div>}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">Data</div>
              <div className="font-medium">
                {format(new Date(agendamento.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">Horário</div>
              <div className="font-medium">{agendamento.hora_inicio} - {agendamento.hora_fim}</div>
            </div>
          </div>

          {agendamento.equipamento && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Equipamento</div>
                <div className="font-medium">{agendamento.equipamento}</div>
              </div>
            </div>
          )}

          {agendamento.observacoes && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Observações</div>
                <div className="text-gray-700">{agendamento.observacoes}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {isAdmin && (
            <Button variant="destructive" onClick={() => { onDelete(agendamento.id); onOpenChange(false); }}>
              Excluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}