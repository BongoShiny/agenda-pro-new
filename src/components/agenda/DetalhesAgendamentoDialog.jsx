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
import { Calendar, Clock, User, Briefcase, MapPin, Tag, FileText, Ban, Unlock } from "lucide-react";

const statusLabels = {
  confirmado: { label: "Confirmado", color: "bg-emerald-500" },
  agendado: { label: "Agendado", color: "bg-amber-400" },
  ausencia: { label: "Ausência", color: "bg-fuchsia-600" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
  concluido: { label: "Concluído", color: "bg-blue-500" },
  bloqueio: { label: "FECHADO", color: "bg-red-600" }
};

// Função para criar data local sem conversão de timezone
const criarDataLocal = (dataString) => {
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export default function DetalhesAgendamentoDialog({ open, onOpenChange, agendamento, onDelete, usuarioAtual }) {
  if (!agendamento) return null;

  const statusInfo = statusLabels[agendamento.status] || statusLabels.agendado;
  const isBloqueio = agendamento.status === "bloqueio" || agendamento.tipo === "bloqueio" || agendamento.cliente_nome === "FECHADO";
  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin";

  const handleDelete = () => {
    onDelete(agendamento.id);
  };

  // Formatar data sem problemas de timezone
  const formatarDataExibicao = (dataString) => {
    const dataLocal = criarDataLocal(dataString);
    return format(dataLocal, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isBloqueio ? "Horário Fechado" : "Detalhes do Agendamento"}</span>
            <Badge className={`${statusInfo.color} text-white border-0`}>
              {statusInfo.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isBloqueio ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Ban className="w-16 h-16 mx-auto mb-4 text-red-600" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">HORÁRIO FECHADO</h3>
                <p className="text-gray-600">Este horário está bloqueado para atendimentos</p>
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
              <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Unidade</div>
                <div className="font-medium">{agendamento.unidade_nome}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Data</div>
                <div className="font-medium">
                  {formatarDataExibicao(agendamento.data)}
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

            {isAdmin && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Unlock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-blue-900">Apenas Administradores</div>
                    <div className="text-sm text-blue-700 mt-1">
                      Você pode desbloquear este horário clicando no botão abaixo
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
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
                  {formatarDataExibicao(agendamento.data)}
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {isBloqueio && isAdmin && (
            <Button 
              variant="default"
              onClick={handleDelete}
              className="bg-green-600 hover:bg-green-700"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Desbloquear Horário
            </Button>
          )}
          {!isBloqueio && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
            >
              Excluir Agendamento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}