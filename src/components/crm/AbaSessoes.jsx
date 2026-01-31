import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, User, MapPin, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DetalhesAgendamentoDialog from "../agenda/DetalhesAgendamentoDialog";

const statusConfig = {
  agendado: { label: "Agendado", color: "bg-blue-500 text-white" },
  confirmado: { label: "Confirmado", color: "bg-green-500 text-white" },
  concluido: { label: "Concluído", color: "bg-emerald-600 text-white" },
  cancelado: { label: "Cancelado", color: "bg-red-500 text-white" },
  ausencia: { label: "Ausência", color: "bg-orange-500 text-white" },
};

export default function AbaSessoes({ lead }) {
  const navigate = useNavigate();
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [dialogAberto, setDialogAberto] = useState(false);

  // Buscar agendamentos do lead pelo telefone
  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-lead', lead.telefone],
    queryFn: async () => {
      const todos = await base44.entities.Agendamento.list("-data");
      // Filtrar apenas agendamentos deste cliente (por telefone)
      return todos.filter(ag => ag.cliente_telefone === lead.telefone);
    },
    initialData: [],
  });

  const handleNovaSessao = () => {
    // Redirecionar para agenda
    navigate(createPageUrl("Agenda"));
  };

  const handleAbrirDetalhes = (agendamento) => {
    setAgendamentoSelecionado(agendamento);
    setDialogAberto(true);
  };

  if (agendamentos.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Histórico de Sessões</h2>
          <Button onClick={handleNovaSessao} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Sessão
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma sessão registrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Histórico de Sessões</h2>
        <Button onClick={handleNovaSessao} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Sessão
        </Button>
      </div>

      <div className="space-y-3">
        {agendamentos.map((agendamento) => {
          const statusInfo = statusConfig[agendamento.status] || statusConfig.agendado;
          
          return (
            <div 
              key={agendamento.id}
              onClick={() => handleAbrirDetalhes(agendamento)}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {agendamento.tipo && agendamento.tipo !== "consulta" && (
                        <span className="capitalize">{agendamento.tipo.replace("_", " ")}</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{format(new Date(agendamento.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{agendamento.hora_inicio} - {agendamento.hora_fim}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{agendamento.profissional_nome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{agendamento.unidade_nome}</span>
                    </div>
                  </div>

                  {agendamento.servico_nome && (
                    <div className="mt-2 text-sm text-gray-700">
                      <span className="font-medium">Serviço:</span> {agendamento.servico_nome}
                    </div>
                  )}

                  {agendamento.observacoes && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                      {agendamento.observacoes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {agendamentoSelecionado && (
        <DetalhesAgendamentoDialog
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          agendamento={agendamentoSelecionado}
          usuarioAtual={{ role: 'admin' }}
        />
      )}
    </div>
  );
}