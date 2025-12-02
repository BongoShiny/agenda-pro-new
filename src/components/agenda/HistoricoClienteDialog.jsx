import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

const statusLabels = {
  agendado: { label: "Agendado", cor: "bg-amber-100 text-amber-800" },
  confirmado: { label: "Confirmado", cor: "bg-emerald-100 text-emerald-800" },
  ausencia: { label: "Ausência", cor: "bg-fuchsia-100 text-fuchsia-800" },
  cancelado: { label: "Cancelado", cor: "bg-red-100 text-red-800" },
  concluido: { label: "Concluído", cor: "bg-blue-100 text-blue-800" },
};

export default function HistoricoClienteDialog({ 
  open, 
  onOpenChange, 
  clienteBusca,
  agendamentos = []
}) {
  // Filtrar agendamentos pelo cliente/telefone
  const agendamentosCliente = agendamentos
    .filter(ag => {
      if (!clienteBusca) return false;
      if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") return false;
      
      const buscaLower = clienteBusca.toLowerCase();
      return (
        ag.cliente_nome?.toLowerCase().includes(buscaLower) ||
        ag.cliente_telefone?.toLowerCase().includes(buscaLower)
      );
    })
    .sort((a, b) => {
      // Ordenar por data mais recente
      const dataA = a.data + a.hora_inicio;
      const dataB = b.data + b.hora_inicio;
      return dataB.localeCompare(dataA);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Histórico de Sessões: "{clienteBusca}"
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {agendamentosCliente.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">Nenhuma sessão encontrada</p>
              <p className="text-sm mt-1">Não há agendamentos para "{clienteBusca}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>{agendamentosCliente.length}</strong> sessão(ões) encontrada(s)
                </p>
              </div>

              {agendamentosCliente.map(ag => (
                <div 
                  key={ag.id} 
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{ag.cliente_nome}</span>
                        <Badge className={statusLabels[ag.status]?.cor || "bg-gray-100 text-gray-800"}>
                          {statusLabels[ag.status]?.label || ag.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {ag.data ? format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {ag.hora_inicio} - {ag.hora_fim}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {ag.profissional_nome}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {ag.unidade_nome}
                        </div>
                      </div>

                      {ag.servico_nome && (
                        <div className="mt-2 text-sm text-gray-500">
                          <strong>Serviço:</strong> {ag.servico_nome}
                        </div>
                      )}

                      {ag.equipamento && (
                        <div className="mt-1 text-sm text-gray-500">
                          <strong>Tipo:</strong> {ag.equipamento}
                        </div>
                      )}

                      {ag.observacoes && (
                        <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                          <strong>Obs:</strong> {ag.observacoes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}