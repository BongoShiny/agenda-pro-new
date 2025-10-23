import React from "react";
import AgendamentoCard from "./AgendamentoCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock } from "lucide-react";

export default function AgendaDiaView({ 
  agendamentos, 
  unidadeSelecionada, 
  profissionais, 
  configuracoes,
  onAgendamentoClick, 
  onSlotClick,
  agendaBloqueada,
  usuarioAtual
}) {
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
    return agendamentos.filter(ag => {
      return ag.unidade_id === unidadeSelecionada.id &&
             ag.profissional_id === profissionalId && 
             ag.hora_inicio === horario;
    });
  };

  const calcularDuracaoSlots = (horaInicio, horaFim) => {
    const [hInicio, mInicio] = horaInicio.split(':').map(Number);
    const [hFim, mFim] = horaFim.split(':').map(Number);
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosFim = hFim * 60 + mFim;
    return Math.ceil((minutosFim - minutosInicio) / 30);
  };

  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin";
  const podeEditar = !agendaBloqueada || isAdmin;

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
      {agendaBloqueada && !isAdmin && (
        <div className="absolute inset-0 bg-gray-900/5 z-20 pointer-events-none">
          <div className="absolute top-4 right-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="font-medium">Agenda bloqueada para edição</span>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
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
            {horarios.map((horario, idx) => (
              <div
                key={horario}
                className={`h-16 flex items-start justify-center pt-1 text-xs text-gray-600 font-semibold border-b border-gray-200`}
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

                  return (
                    <div
                      key={horario}
                      className={`h-16 border-b border-gray-200 p-1 relative ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } ${!isOcupado && podeEditar ? 'hover:bg-blue-50/40 cursor-pointer transition-colors' : ''}`}
                      onClick={() => !isOcupado && podeEditar && onSlotClick(unidadeSelecionada.id, terapeuta.id, horario)}
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
                              onClick={podeEditar ? onAgendamentoClick : null}
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
        </div>
      </ScrollArea>
    </div>
  );
}