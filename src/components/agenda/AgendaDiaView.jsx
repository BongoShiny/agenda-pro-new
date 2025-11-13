import React, { useState } from "react";
import AgendamentoCard from "./AgendamentoCard";
import SlotMenu from "./SlotMenu";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AgendaDiaView({ 
  agendamentos, 
  unidadeSelecionada, 
  profissionais, 
  configuracoes,
  onAgendamentoClick, 
  onNovoAgendamento,
  onBloquearHorario,
  usuarioAtual
}) {
  const [slotMenuAberto, setSlotMenuAberto] = useState(null);

  const horarios = [];
  for (let h = 8; h <= 20; h++) {
    horarios.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 20) horarios.push(`${h.toString().padStart(2, '0')}:30`);
  }

  const terapeutasAtivos = configuracoes
    .filter(config => config.unidade_id === unidadeSelecionada.id && config.ativo)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    .map(config => profissionais.find(p => p.id === config.profissional_id))
    .filter(Boolean);

  const getAgendamentosParaSlot = (profissionalId, horario) => {
    const profissional = profissionais.find(p => p.id === profissionalId);
    
    const agendamentosSlot = agendamentos.filter(ag => 
      ag.unidade_id === unidadeSelecionada.id &&
      ag.profissional_id === profissionalId && 
      ag.hora_inicio === horario
    );
    
    // Log detalhado de cada slot
    if (agendamentosSlot.length > 0) {
      agendamentosSlot.forEach(ag => {
        const isBloqueio = ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO";
        console.log(`📍 SLOT ${horario}:`, {
          cliente: ag.cliente_nome,
          data: ag.data,
          profissional: profissional?.nome,
          unidade: unidadeSelecionada.nome,
          isBloqueio: isBloqueio,
          status: ag.status,
          tipo: ag.tipo
        });
      });
    }
    
    return agendamentosSlot;
  };

  const calcularDuracaoSlots = (horaInicio, horaFim) => {
    const [hInicio, mInicio] = horaInicio.split(':').map(Number);
    const [hFim, mFim] = horaFim.split(':').map(Number);
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosFim = hFim * 60 + mFim;
    return Math.ceil((minutosFim - minutosInicio) / 30);
  };

  const handleSlotClick = (unidadeId, profissionalId, horario) => {
    setSlotMenuAberto({ unidadeId, profissionalId, horario });
  };

  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin";

  if (terapeutasAtivos.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">Nenhum terapeuta ativo nesta unidade</p>
          <p className="text-sm mt-2">Configure os terapeutas na página de configuração</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 relative">
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="w-20 flex-shrink-0 border-r border-gray-200"></div>
        
        <div className="flex overflow-x-auto">
          {terapeutasAtivos.map(terapeuta => (
            <div key={terapeuta.id} className="min-w-[200px] flex-1 p-3 border-r border-gray-200 last:border-r-0">
              <div className="text-sm font-bold text-gray-900 truncate text-center">{terapeuta.nome}</div>
              <div className="text-xs text-gray-500 truncate text-center mt-1">{terapeuta.especialidade}</div>
            </div>
          ))}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="flex">
          <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {horarios.map((horario) => (
              <div
                key={horario}
                className="h-16 flex items-start justify-center pt-1 text-xs text-gray-600 font-semibold border-b border-gray-200"
              >
                {horario}
              </div>
            ))}
          </div>

          <div className="flex overflow-x-auto">
            {terapeutasAtivos.map(terapeuta => (
              <div key={terapeuta.id} className="min-w-[200px] flex-1 border-r border-gray-200 last:border-r-0">
                {horarios.map((horario, idx) => {
                  const agendamentosSlot = getAgendamentosParaSlot(terapeuta.id, horario);
                  const isOcupado = agendamentosSlot.length > 0;
                  const isMenuAberto = slotMenuAberto?.unidadeId === unidadeSelecionada.id && 
                                      slotMenuAberto?.profissionalId === terapeuta.id && 
                                      slotMenuAberto?.horario === horario;

                  return (
                    <div
                      key={horario}
                      className={`h-16 border-b border-gray-200 p-1 relative ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      {!isOcupado ? (
                        <SlotMenu
                          open={isMenuAberto}
                          onOpenChange={(open) => {
                            if (!open) setSlotMenuAberto(null);
                          }}
                          onNovoAgendamento={() => onNovoAgendamento(unidadeSelecionada.id, terapeuta.id, horario)}
                          onBloquearHorario={() => onBloquearHorario(unidadeSelecionada.id, terapeuta.id, horario)}
                          isAdmin={isAdmin}
                        >
                          <button
                            className="w-full h-full hover:bg-blue-50/40 cursor-pointer transition-colors rounded"
                            onClick={() => handleSlotClick(unidadeSelecionada.id, terapeuta.id, horario)}
                          />
                        </SlotMenu>
                      ) : (
                        agendamentosSlot.map(agendamento => {
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
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}