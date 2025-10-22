import React from "react";
import AgendamentoCard from "./AgendamentoCard";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AgendaDiaView({ agendamentos, unidades, onAgendamentoClick, onSlotClick }) {
  const horarios = [];
  for (let h = 8; h <= 20; h++) {
    horarios.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 20) horarios.push(`${h.toString().padStart(2, '0')}:30`);
  }

  const getAgendamentosParaSlot = (unidadeId, horario) => {
    return agendamentos.filter(ag => {
      return ag.unidade_id === unidadeId && ag.hora_inicio === horario;
    });
  };

  const calcularDuracaoSlots = (horaInicio, horaFim) => {
    const [hInicio, mInicio] = horaInicio.split(':').map(Number);
    const [hFim, mFim] = horaFim.split(':').map(Number);
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosFim = hFim * 60 + mFim;
    return Math.ceil((minutosFim - minutosInicio) / 30);
  };

  return (
    <div className="flex-1 bg-gray-50">
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="w-20 flex-shrink-0 border-r border-gray-200"></div>
        {unidades.map(unidade => (
          <div key={unidade.id} className="flex-1 p-4 border-r border-gray-200 last:border-r-0">
            <div className="font-semibold text-gray-900">{unidade.nome}</div>
            <div className="text-sm text-gray-500">{unidade.endereco}</div>
          </div>
        ))}
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="flex">
          <div className="w-20 flex-shrink-0">
            {horarios.map((horario, idx) => (
              <div
                key={horario}
                className={`h-16 flex items-start justify-center pt-1 text-xs text-gray-500 font-medium border-b border-gray-200 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                {horario}
              </div>
            ))}
          </div>

          {unidades.map(unidade => (
            <div key={unidade.id} className="flex-1 border-r border-gray-200 last:border-r-0">
              {horarios.map((horario, idx) => {
                const agendamentosSlot = getAgendamentosParaSlot(unidade.id, horario);
                const isOcupado = agendamentosSlot.length > 0;

                return (
                  <div
                    key={horario}
                    className={`h-16 border-b border-gray-200 p-1 relative ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } ${!isOcupado ? 'hover:bg-blue-50/30 cursor-pointer' : ''}`}
                    onClick={() => !isOcupado && onSlotClick(unidade.id, horario)}
                  >
                    {agendamentosSlot.map(agendamento => {
                      const duracao = calcularDuracaoSlots(agendamento.hora_inicio, agendamento.hora_fim);
                      return (
                        <div
                          key={agendamento.id}
                          style={{ height: `${duracao * 4}rem` }}
                          className="absolute inset-x-1 z-10"
                        >
                          <AgendamentoCard
                            agendamento={agendamento}
                            onClick={onAgendamentoClick}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}