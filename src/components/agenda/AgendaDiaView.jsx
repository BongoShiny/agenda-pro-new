import React, { useState } from "react";
import AgendamentoCard from "./AgendamentoCard";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SlotMenu from "./SlotMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AgendaDiaView({ 
  agendamentos, 
  unidadeSelecionada, 
  profissionais, 
  configuracoes,
  onAgendamentoClick, 
  onNovoAgendamento,
  onBloquearHorario,
  onStatusChange,
  onStatusPacienteChange,
  usuarioAtual,
  dataAtual,
  excecoesHorario = []
}) {
  // Buscar prontuários
  const { data: prontuarios = [] } = useQuery({
    queryKey: ['prontuarios-agenda'],
    queryFn: () => base44.entities.Prontuario.list(),
    initialData: [],
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });

  // Buscar configurações de sábado
   const { data: configuracoesSabado = [] } = useQuery({
     queryKey: ['configuracoes-sabado'],
     queryFn: () => base44.entities.ConfiguracaoSabado.list(),
     initialData: [],
   });

   // Buscar configurações de terapeutas para sábado
   const { data: configuracoesTerapeutaSabado = [] } = useQuery({
     queryKey: ['configuracoes-terapeuta-sabado'],
     queryFn: () => base44.entities.ConfiguracaoTerapeutaSabado.list(),
     initialData: [],
   });
  const [slotMenuAberto, setSlotMenuAberto] = useState(null);
      const [dialogBloquearAberto, setDialogBloquearAberto] = useState(false);
      const [profissionalBloquear, setProfissionalBloquear] = useState(null);
      const [horariosBloquear, setHorariosBloquear] = useState({
        hora_inicio: "08:00",
        hora_fim: "10:00"
      });

      const headerScrollRef = React.useRef(null);
      const bodyScrollRef = React.useRef(null);
      const horariosScrollRef = React.useRef(null);
  
  // Sincronizar scroll horizontal entre header e body
  const handleHeaderScroll = (e) => {
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };
  
  const handleBodyScroll = (e) => {
        if (headerScrollRef.current) {
          headerScrollRef.current.scrollLeft = e.target.scrollLeft;
        }
      };

      const handleBodyScrollSync = (e) => {
        handleBodyScroll(e);
        if (horariosScrollRef.current) {
          horariosScrollRef.current.scrollTop = e.target.scrollTop;
        }
      };

  // Gerar horários de 08:00 até 21:00 (apenas horários cheios)
  const gerarTodosHorarios = () => {
    const horarios = [];
    for (let h = 8; h <= 22; h++) {
      horarios.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return horarios;
  };

  // Obter horário do profissional para a data selecionada (considerando exceções)
   const getHorarioProfissional = (profissional) => {
     const dataFormatada = dataAtual.toISOString().split('T')[0];

     // Verificar se é sábado (dia da semana 6)
     const diaDaSemana = dataAtual.getDay();
     const isSabado = diaDaSemana === 6;

     // Procurar exceção para esta data (EXCLUINDO horário de almoço)
     const excecao = excecoesHorario.find(e => 
       e.profissional_id === profissional.id && 
       e.data === dataFormatada &&
       e.motivo !== "Horário de Almoço"
     );

     if (excecao) {
       // Verificar se é folga (00:00 - 00:00)
       const isFolga = excecao.horario_inicio === "00:00" && excecao.horario_fim === "00:00";
       return {
         horario_inicio: excecao.horario_inicio,
         horario_fim: excecao.horario_fim,
         isExcecao: true,
         isFolga: isFolga,
         motivo: excecao.motivo
       };
     }

     // Se for sábado, buscar configuração específica do terapeuta
     if (isSabado) {
       // Buscar configuração específica para este sábado
       const configEspecifica = configuracoesTerapeutaSabado.find(c => 
         c.profissional_id === profissional.id &&
         c.unidade_id === unidadeSelecionada.id &&
         (c.data_sabado === dataFormatada || c.data_sabado === "") &&
         c.ativo
       );

       if (configEspecifica) {
         return {
           horario_inicio: configEspecifica.horario_inicio || "08:00",
           horario_fim: configEspecifica.horario_fim || "18:00",
           isExcecao: false,
           isFolga: false
         };
       }

       // Se não tem configuração específica, o terapeuta não trabalha sábado
       return {
         horario_inicio: "00:00",
         horario_fim: "00:00",
         isExcecao: false,
         isFolga: true
       };
     }

     // Usar horário padrão
     return {
       horario_inicio: profissional.horario_inicio || "08:00",
       horario_fim: profissional.horario_fim || "18:00",
       isExcecao: false,
       isFolga: false
     };
   };

  // Verificar se horário está no período de almoço
  const estaNoHorarioAlmoco = (horario, profissional) => {
    const dataFormatada = dataAtual.toISOString().split('T')[0];
    
    // Procurar exceção de horário de almoço para esta data
    const almocoExcecao = excecoesHorario.find(e => 
      e.profissional_id === profissional.id && 
      e.data === dataFormatada &&
      e.motivo === "Horário de Almoço"
    );

    if (!almocoExcecao) {
      return false;
    }

    const [h, m] = horario.split(':').map(Number);
    const minutos = h * 60 + m;

    const [hAlmocoInicio, mAlmocoInicio] = almocoExcecao.horario_inicio.split(':').map(Number);
    const minutosAlmocoInicio = hAlmocoInicio * 60 + mAlmocoInicio;

    const [hAlmocoFim, mAlmocoFim] = almocoExcecao.horario_fim.split(':').map(Number);
    const minutosAlmocoFim = hAlmocoFim * 60 + mAlmocoFim;

    return minutos >= minutosAlmocoInicio && minutos < minutosAlmocoFim;
  };

  // Verificar se horário está dentro do expediente do profissional
  const horarioDentroDoPeriodo = (horario, profissional) => {
    const horarioDia = getHorarioProfissional(profissional);
    
    // Se é folga, nenhum horário está disponível
    if (horarioDia.isFolga) {
      return false;
    }
    
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
    // Retornar apenas agendamentos que INICIAM neste horário
    // EXCLUIR apenas "cancelado" para liberar o horário (manter "ausencia")
    const agendamentosSlot = agendamentos.filter(ag => 
      ag.unidade_id === unidadeSelecionada.id &&
      ag.profissional_id === profissionalId && 
      ag.hora_inicio === horario &&
      ag.status !== "cancelado"
    );
    
    return agendamentosSlot;
  };

  // Verificar se um horário em sábado atingiu o limite de atendimentos
  const verificarLimiteSabado = (horario) => {
    const diaDaSemana = dataAtual.getDay();
    
    // Se não for sábado, não tem limite
    if (diaDaSemana !== 6) return false;
    
    // Usar a mesma formatação de data do resto do sistema
    const formatarDataPura = (data) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };
    
    const dataFormatada = formatarDataPura(dataAtual);
    
    // Buscar configuração do sábado para esta unidade e data
    const configSabado = configuracoesSabado.find(c => 
      c.unidade_id === unidadeSelecionada.id &&
      c.data_sabado === dataFormatada &&
      c.ativo
    );
    
    // Se não tem configuração, não bloquear
    if (!configSabado) {
      return false;
    }
    
    // Converter horário para minutos para comparação
    const [hHorario, mHorario] = horario.split(':').map(Number);
    const minutosHorario = hHorario * 60 + mHorario;
    
    // Contar TODOS os agendamentos que OCUPAM este horário (incluindo os que começam antes e terminam depois)
    const totalAgendamentosHorario = agendamentos.filter(ag => {
      // Mesma unidade
      if (ag.unidade_id !== unidadeSelecionada.id) return false;
      // Mesma data
      if (ag.data !== dataFormatada) return false;
      // Não contar ausências, cancelados e bloqueios
      if (ag.status === "ausencia" || ag.status === "cancelado") return false;
      if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") return false;
      
      // Verificar se o horário está DENTRO do período do agendamento
      const [hInicio, mInicio] = ag.hora_inicio.split(':').map(Number);
      const [hFim, mFim] = ag.hora_fim.split(':').map(Number);
      const minutosInicio = hInicio * 60 + mInicio;
      const minutosFim = hFim * 60 + mFim;
      
      // O horário está ocupado se está entre início (inclusive) e fim (exclusive)
      return minutosHorario >= minutosInicio && minutosHorario < minutosFim;
    }).length;
    
    const bloqueado = totalAgendamentosHorario >= configSabado.limite_atendimentos_por_hora;
    
    if (bloqueado) {
      console.log(`🚫 SÁBADO LOTADO - ${horario}: ${totalAgendamentosHorario}/${configSabado.limite_atendimentos_por_hora} atendimentos`);
    }
    
    // Se atingiu ou ultrapassou o limite, bloquear
    return bloqueado;
  };

  // Verificar se um slot está coberto por um agendamento (para não mostrar slot vazio)
  // Retorna o agendamento que cobre o slot, ou null
  const getAgendamentoQueCobreSlot = (profissionalId, horario) => {
    const [hSlot] = horario.split(':').map(Number);
    const minutosSlot = hSlot * 60;
    
    return agendamentos.find(ag => {
      if (ag.unidade_id !== unidadeSelecionada.id || ag.profissional_id !== profissionalId) return false;
      
      // EXCLUIR apenas "cancelado" para liberar o horário (manter "ausencia")
      if (ag.status === "cancelado") return false;
      
      const [hInicio] = ag.hora_inicio.split(':').map(Number);
      const [hFim] = ag.hora_fim.split(':').map(Number);
      const minutosInicio = hInicio * 60;
      const minutosFim = hFim * 60;
      
      // Slot está coberto se está entre início (exclusive do primeiro) e fim do agendamento
      return minutosSlot > minutosInicio && minutosSlot < minutosFim;
    }) || null;
  };

  const calcularDuracaoSlots = (horaInicio, horaFim) => {
    const [hInicio, mInicio] = horaInicio.split(':').map(Number);
    const [hFim, mFim] = horaFim.split(':').map(Number);
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosFim = hFim * 60 + mFim;
    const diferencaMinutos = minutosFim - minutosInicio;
    // Cada slot de 1 hora = 64px (h-16) no mobile ou 80px (h-20) no desktop
    // Retornamos em pixels para maior precisão
    const horas = diferencaMinutos / 60;
    return horas; // Retorna número de horas
  };

  // Calcular posição top baseada no horário de início do agendamento vs horário do slot
  const calcularPosicaoTop = (horaInicioAgendamento, horaSlot) => {
    const [hAgendamento, mAgendamento] = horaInicioAgendamento.split(':').map(Number);
    const [hSlot, mSlot] = horaSlot.split(':').map(Number);
    const minutosAgendamento = hAgendamento * 60 + mAgendamento;
    const minutosSlot = hSlot * 60 + mSlot;
    const diferencaMinutos = minutosAgendamento - minutosSlot;
    // Converter diferença em rem (4rem por hora)
    return (diferencaMinutos / 60) * 4;
  };

  const handleSlotClick = (unidadeId, profissionalId, horario) => {
    setSlotMenuAberto({ unidadeId, profissionalId, horario });
  };

  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin" || usuarioAtual?.cargo === "gerencia_unidades";

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
        <div className="flex-1 bg-gray-50 relative flex flex-col overflow-hidden">
          <div className="border-b border-gray-200 bg-white sticky top-0 z-10 flex">
            <div className="w-12 md:w-20 flex-shrink-0 border-r border-gray-200 bg-white"></div>
            <div 
              ref={headerScrollRef}
              className="flex-1 overflow-x-hidden"
            >
              <div className="flex min-w-max">
                {terapeutasAtivos.map(terapeuta => {
                  const horarioTerapeuta = getHorarioProfissional(terapeuta);
                  return (
                    <div key={terapeuta.id} className="w-[160px] md:w-[280px] flex-shrink-0 p-2 md:p-3 border-r border-gray-200 last:border-r-0">
                      <div className="flex items-center justify-center gap-1 md:gap-2">
                        <div className="text-xs md:text-sm font-bold text-gray-900 truncate text-center">{terapeuta.nome}</div>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setProfissionalBloquear(terapeuta);
                              setDialogBloquearAberto(true);
                            }}
                            className="text-base md:text-lg hover:scale-110 transition-transform"
                            title="Bloquear horários"
                          >
                            🚫
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-500 truncate text-center mt-1">{terapeuta.especialidade}</div>
                      {horarioTerapeuta.isFolga ? (
                        <div className="text-[8px] md:text-[10px] text-orange-700 bg-orange-100 px-1 md:px-2 py-0.5 rounded mt-1 text-center font-semibold">
                          🏖️ FOLGA
                        </div>
                      ) : horarioTerapeuta.isExcecao && (
                        <div className="text-[8px] md:text-[10px] text-blue-600 bg-blue-50 px-1 md:px-2 py-0.5 rounded mt-1 text-center">
                          📅 {horarioTerapeuta.horario_inicio} - {horarioTerapeuta.horario_fim}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div 
              ref={horariosScrollRef}
              className="w-12 md:w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-hidden"
            >
              {todosHorarios.map((horario) => (
                <div
                  key={horario}
                  className="h-16 md:h-20 flex items-start justify-center pt-1 text-[10px] md:text-xs text-gray-600 font-semibold border-b border-gray-200 bg-gray-50"
                >
                  {horario}
                </div>
              ))}
            </div>

            <div 
              ref={bodyScrollRef}
              onScroll={handleBodyScrollSync}
              className="flex-1 overflow-x-auto overflow-y-auto"
            >
          <div className="flex min-w-max">
            {terapeutasAtivos.map(terapeuta => (
              <div key={terapeuta.id} className="w-[160px] md:w-[280px] flex-shrink-0 border-r border-gray-200 last:border-r-0">
                {todosHorarios.map((horario, idx) => {
                  const dentroDoHorario = horarioDentroDoPeriodo(horario, terapeuta);
                  const horarioTerapeuta = getHorarioProfissional(terapeuta);
                  const isHorarioAlmoco = estaNoHorarioAlmoco(horario, terapeuta);

                  // Se está no horário de almoço, mostrar como bloqueio de almoço
                  if (dentroDoHorario && isHorarioAlmoco) {
                    return (
                      <div
                        key={horario}
                        className={`h-16 md:h-20 border-b border-gray-200 p-0.5 md:p-1 ${
                          idx % 2 === 0 ? 'bg-orange-50' : 'bg-orange-100'
                        }`}
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-full rounded flex items-center justify-center bg-orange-200 md:cursor-default md:pointer-events-none">
                              <div className="text-center">
                                <div className="text-[10px] md:text-xs text-orange-800 font-bold">
                                  <span className="md:hidden">🍽️</span>
                                  <span className="hidden md:block">🍽️ ALMOÇO</span>
                                </div>
                                <div className="text-[8px] md:text-[10px] text-orange-700 hidden md:block">Horário de almoço</div>
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="md:hidden w-auto p-3">
                            <div className="text-sm font-semibold text-orange-900 mb-1">🍽️ Horário de Almoço</div>
                            <div className="text-xs text-orange-700">Terapeuta está em horário de almoço</div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  }

                  if (!dentroDoHorario) {
                    // Se é exceção com folga explícita, mostrar folga
                    const isFolgaExplicita = horarioTerapeuta.isExcecao && horarioTerapeuta.isFolga;

                    if (isFolgaExplicita) {
                      return (
                        <div
                          key={horario}
                          className={`h-16 md:h-20 border-b border-gray-200 p-0.5 md:p-1 ${
                            idx % 2 === 0 ? 'bg-orange-50' : 'bg-orange-100'
                          }`}
                        >
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="w-full h-full rounded flex items-center justify-center bg-orange-200 md:cursor-default md:pointer-events-none">
                                <div className="text-center">
                                  <div className="text-[10px] md:text-xs text-orange-700 font-bold">
                                    <span className="md:hidden">🏖️</span>
                                    <span className="hidden md:block">🏖️ FOLGA</span>
                                  </div>
                                  <div className="text-[8px] md:text-[10px] text-orange-600 hidden md:block">Terapeuta de folga</div>
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="md:hidden w-auto p-3">
                              <div className="text-sm font-semibold text-orange-900 mb-1">🏖️ Dia de Folga</div>
                              <div className="text-xs text-orange-700">O terapeuta está de folga neste dia</div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      );
                    }

                    // Fora do horário normal - não mostrar nada especial, apenas vazio
                    return (
                      <div
                        key={horario}
                        className={`h-16 md:h-20 border-b border-gray-200 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      />
                    );
                  }

                  const agendamentosSlot = getAgendamentosParaSlot(terapeuta.id, horario);
                  const isOcupado = agendamentosSlot.length > 0;
                  const agendamentoQueCobreSlot = getAgendamentoQueCobreSlot(terapeuta.id, horario);
                  const horarioPassou = horarioJaPassou(horario);
                  const limiteSabadoAtingido = verificarLimiteSabado(horario);
                  const isMenuAberto = slotMenuAberto?.unidadeId === unidadeSelecionada.id && 
                                    slotMenuAberto?.profissionalId === terapeuta.id && 
                                    slotMenuAberto?.horario === horario;

                  // Se o slot está coberto por um agendamento de múltiplas horas
                  // Renderizar área clicável com fundo do bloqueio
                  if (agendamentoQueCobreSlot) {
                    const isBloqueio = agendamentoQueCobreSlot.status === "bloqueio" || 
                                       agendamentoQueCobreSlot.tipo === "bloqueio" || 
                                       agendamentoQueCobreSlot.cliente_nome === "FECHADO";
                    
                    return (
                      <div
                        key={horario}
                        className={`h-16 md:h-20 border-b border-gray-200 ${
                          isBloqueio ? 'bg-red-600' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')
                        }`}
                      >
                        {/* Área clicável para acessar o agendamento/bloqueio */}
                        <button
                          className="w-full h-full cursor-pointer"
                          onClick={() => onAgendamentoClick(agendamentoQueCobreSlot)}
                        />
                      </div>
                    );
                  }

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
                      ) : !isOcupado && limiteSabadoAtingido ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-full bg-orange-200 rounded flex items-center justify-center md:cursor-default md:pointer-events-none">
                              <div className="text-center">
                                <div className="text-[10px] md:text-xs text-orange-700 font-bold">
                                  <span className="md:hidden">LOTE</span>
                                  <span className="hidden md:block">LOTADO</span>
                                </div>
                                <div className="text-[8px] md:text-[10px] text-orange-600 hidden md:block">Limite atingido</div>
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="md:hidden w-auto p-3">
                            <div className="text-sm font-semibold text-orange-900 mb-1">⚠️ Horário Lotado</div>
                            <div className="text-xs text-orange-700">Limite de atendimentos atingido neste horário</div>
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
                          const duracaoHoras = calcularDuracaoSlots(agendamento.hora_inicio, agendamento.hora_fim);
                          // h-16 = 4rem = 64px, h-20 = 5rem = 80px
                          // Usar CSS calc com variáveis para responsividade
                          const alturaStyle = {
                            '--duracao-horas': duracaoHoras,
                            height: `calc(${duracaoHoras} * 4rem)`, // mobile default
                          };

                          return (
                            <div
                              key={agendamento.id}
                              style={alturaStyle}
                              className="absolute inset-x-0.5 md:inset-x-1 z-10 top-0 md:!h-[calc(var(--duracao-horas)*5rem)]"
                            >
                              <AgendamentoCard
                                agendamento={agendamento}
                                onClick={onAgendamentoClick}
                                onStatusChange={onStatusChange}
                                onStatusPacienteChange={onStatusPacienteChange}
                                prontuarios={prontuarios}
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
      </div>

      {/* Dialog para bloquear horários específicos */}
      <Dialog open={dialogBloquearAberto} onOpenChange={setDialogBloquearAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🚫 Bloquear Horários - {profissionalBloquear?.nome}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <strong>Data:</strong> {dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
              <div className="text-sm text-blue-800 mt-1">
                <strong>Unidade:</strong> {unidadeSelecionada.nome}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Horário para Bloquear</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="time"
                  value={horariosBloquear.hora_inicio}
                  onChange={(e) => setHorariosBloquear(prev => ({ ...prev, hora_inicio: e.target.value }))}
                  className="flex-1"
                />
                <span className="text-gray-500">até</span>
                <Input
                  type="time"
                  value={horariosBloquear.hora_fim}
                  onChange={(e) => setHorariosBloquear(prev => ({ ...prev, hora_fim: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBloquearAberto(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (profissionalBloquear) {
                  onBloquearHorario(
                    unidadeSelecionada.id,
                    profissionalBloquear.id,
                    horariosBloquear.hora_inicio,
                    horariosBloquear.hora_fim
                  );
                  setDialogBloquearAberto(false);
                  setHorariosBloquear({ hora_inicio: "08:00", hora_fim: "10:00" });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              🚫 Bloquear Horários
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}