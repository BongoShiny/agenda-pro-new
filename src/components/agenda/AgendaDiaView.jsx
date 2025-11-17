import React, { useState } from "react";
import AgendamentoCard from "./AgendamentoCard";
import SlotMenu from "./SlotMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function AgendaDiaView({ 
  agendamentos, 
  unidadeSelecionada, 
  profissionais, 
  configuracoes,
  onAgendamentoClick, 
  onNovoAgendamento,
  onBloquearHorario,
  usuarioAtual,
  dataAtual,
  excecoesHorario = []
}) {
  const [slotMenuAberto, setSlotMenuAberto] = useState(null);

  // Gerar horários de 08:00 até 22:30
  const gerarTodosHorarios = () => {
    const horarios = [];
    for (let h = 8; h <= 22; h++) {
      horarios.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 22) horarios.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return horarios;
  };

  // Obter horário do profissional para a data selecionada (considerando exceções)
  const getHorarioProfissional = (profissional) => {
    const dataFormatada = dataAtual.toISOString().split('T')[0];
    
    // Procurar exceção para esta data
    const excecao = excecoesHorario.find(e => 
      e.profissional_id === profissional.id && 
      e.data === dataFormatada
    );
    
    if (excecao) {
      return {
        horario_inicio: excecao.horario_inicio,
        horario_fim: excecao.horario_fim,
        isExcecao: true
      };
    }
    
    // Usar horário padrão
    return {
      horario_inicio: profissional.horario_inicio || "08:00",
      horario_fim: profissional.horario_fim || "18:00",
      isExcecao: false
    };
  };

  // Verificar se horário está dentro do expediente do profissional
  const horarioDentroDoPeriodo = (horario, profissional) => {
    const horarioDia = getHorarioProfissional(profissional);
    
    if (!horarioDia.horario_inicio || !horarioDia.horario_fim) {
      return true;
    }

    const [h, m] = horario.split(':').map(Number);
    const minutos = h * 60 + m;

    const [hInicio, mInicio] = horarioDia.horario_inicio.split(':').map(Number);
    const minutosInicio = hInicio * 60 + mInicio;

    const [hFim, mFim] = horarioDia.horario_fim.split(':').map(Number);
    const minutosFim = hFim * 60 + mFim;

    return minutos >= minutosInicio && minutos < minutosFim;
  };

  const todosHorarios = gerarTodosHorarios();

  // Verificar se um horário já passou (horário de Brasília)
  const horarioJaPassou = (horario) => {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const dataAtualComparar = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate());
    
    // Se a data selecionada é futura, nenhum horário passou
    if (dataAtualComparar > hoje) return false;
    
    // Se a data selecionada é passada, todos os horários passaram
    if (dataAtualComparar < hoje) return true;
    
    // Se é hoje, verificar horário
    const [hora, minuto] = horario.split(':').map(Number);
    const horarioSlot = hora * 60 + minuto;
    const horarioAgora = agora.getHours() * 60 + agora.getMinutes();
    
    return horarioSlot < horarioAgora;
  };

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
    const slots = Math.ceil((minutosFim - minutosInicio) / 30);
    return slots * 5; // 5rem por slot (h-20 = 5rem)
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
        <div className="w-12 md:w-20 flex-shrink-0 border-r border-gray-200"></div>
        
        <div className="flex overflow-x-auto">
          {terapeutasAtivos.map(terapeuta => {
            const horarioTerapeuta = getHorarioProfissional(terapeuta);
            return (
              <div key={terapeuta.id} className="w-[160px] md:w-[280px] flex-shrink-0 p-2 md:p-3 border-r border-gray-200 last:border-r-0">
                <div className="text-xs md:text-sm font-bold text-gray-900 truncate text-center">{terapeuta.nome}</div>
                <div className="text-[10px] md:text-xs text-gray-500 truncate text-center mt-1">{terapeuta.especialidade}</div>
                {horarioTerapeuta.isExcecao && (
                  <div className="text-[8px] md:text-[10px] text-blue-600 bg-blue-50 px-1 md:px-2 py-0.5 rounded mt-1 text-center">
                    📅 {horarioTerapeuta.horario_inicio} - {horarioTerapeuta.horario_fim}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)] md:h-[calc(100vh-240px)]">
        <div className="flex">
          <div className="w-12 md:w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {todosHorarios.map((horario) => (
              <div
                key={horario}
                className="h-16 md:h-20 flex items-start justify-center pt-1 text-[10px] md:text-xs text-gray-600 font-semibold border-b border-gray-200"
              >
                {horario}
              </div>
            ))}
          </div>

          <div className="flex overflow-x-auto">
            {terapeutasAtivos.map(terapeuta => (
              <div key={terapeuta.id} className="w-[160px] md:w-[280px] flex-shrink-0 border-r border-gray-200 last:border-r-0">
                {todosHorarios.map((horario, idx) => {
                  const dentroDoHorario = horarioDentroDoPeriodo(horario, terapeuta);
                  
                  if (!dentroDoHorario) {
                    return (
                      <div
                        key={horario}
                        className={`h-16 md:h-20 border-b border-gray-200 p-0.5 md:p-1 ${
                          idx % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'
                        }`}
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-full bg-gray-300 rounded flex items-center justify-center md:cursor-default md:pointer-events-none">
                              <div className="text-center">
                                <div className="text-[10px] md:text-xs text-gray-600 font-medium">
                                  <span className="md:hidden">FECH</span>
                                  <span className="hidden md:block">BLOQUEADO</span>
                                </div>
                                <div className="text-[8px] md:text-[10px] text-gray-500 hidden md:block">Fora do horário</div>
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="md:hidden w-auto p-3">
                            <div className="text-sm font-semibold text-gray-900 mb-1">⚠️ Horário Bloqueado</div>
                            <div className="text-xs text-gray-600">Fora do horário de trabalho do profissional</div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  }

                  const agendamentosSlot = getAgendamentosParaSlot(terapeuta.id, horario);
                  const isOcupado = agendamentosSlot.length > 0;
                  const horarioPassou = horarioJaPassou(horario);
                  const isMenuAberto = slotMenuAberto?.unidadeId === unidadeSelecionada.id && 
                                    slotMenuAberto?.profissionalId === terapeuta.id && 
                                    slotMenuAberto?.horario === horario;

                  return (
                    <div
                      key={horario}
                      className={`h-16 md:h-20 border-b border-gray-200 p-0.5 md:p-1 relative ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      {!isOcupado && horarioPassou ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-full bg-gray-200 rounded flex items-center justify-center md:cursor-default md:pointer-events-none">
                              <div className="text-center">
                                <div className="text-[10px] md:text-xs text-gray-500 font-medium">
                                  <span className="md:hidden">FECH</span>
                                  <span className="hidden md:block">FECHADO</span>
                                </div>
                                <div className="text-[8px] md:text-[10px] text-gray-400 hidden md:block">Horário passado</div>
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="md:hidden w-auto p-3">
                            <div className="text-sm font-semibold text-gray-900 mb-1">🕐 Horário Indisponível</div>
                            <div className="text-xs text-gray-600">Este horário já passou</div>
                          </PopoverContent>
                        </Popover>
                      ) : !isOcupado ? (
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
                              style={{ height: `${duracao * 0.8}rem` }}
                              className="absolute inset-x-0.5 md:inset-x-1 z-10"
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