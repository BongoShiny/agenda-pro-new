import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Ban, ChevronDown, FileText, AlertTriangle, AlertCircle, MessageCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

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

const statusPacienteLabels = {
  "": "-",
  "ultima_sessao": "Última Sessão",
  "paciente_novo": "Paciente Novo",
  "voucher": "Voucher"
};

const statusPacienteColors = {
  "": null,
  "paciente_novo": "#ec4899",
  "ultima_sessao": "#dc2626",
  "voucher": "#000000"
};

export default function AgendamentoCard({ agendamento, onClick, onStatusChange, onStatusPacienteChange, prontuarios = [], registrosWhatsApp = [], usuarioAtual, readOnly = false }) {
  const isBloqueio = agendamento.status === "bloqueio" || agendamento.tipo === "bloqueio" || agendamento.cliente_nome === "FECHADO";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPacienteOpen, setDropdownPacienteOpen] = useState(false);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState(null);
  const [optimisticStatusPaciente, setOptimisticStatusPaciente] = useState(null);
  const queryClient = useQueryClient();
  
  // Verificar se usuário pode enviar lembretes (pós venda ou superior)
  const podeEnviarLembrete = usuarioAtual?.cargo === "pos_venda" || usuarioAtual?.cargo === "superior";
  
  console.log(`🎴 CARD | ${agendamento.cliente_nome} | Data: ${agendamento.data} | ${agendamento.hora_inicio}`);
  
  // Calcular status do prontuário
  const getStatusProntuario = () => {
    const temProntuario = prontuarios.some(p => p.agendamento_id === agendamento.id);
    
    if (temProntuario) {
      return { icon: CheckCircle, cor: 'text-green-400', label: 'Preenchido' };
    }
    
    // Verificar se está atrasado (1 hora após o término)
    const agora = new Date();
    const [ano, mes, dia] = agendamento.data.split('-').map(Number);
    const [horaFim, minutoFim] = agendamento.hora_fim.split(':').map(Number);
    const dataFimSessao = new Date(ano, mes - 1, dia, horaFim, minutoFim);
    const umaHoraDepois = new Date(dataFimSessao.getTime() + 60 * 60 * 1000);
    
    if (agora > umaHoraDepois) {
      return { icon: AlertTriangle, cor: 'text-red-400', label: 'Atrasado' };
    }
    
    return { icon: FileText, cor: 'text-yellow-300', label: 'Pendente' };
  };

  const statusProntuario = getStatusProntuario();

  // Verificar status do WhatsApp
  const getStatusWhatsApp = () => {
    const registroEnviado = registrosWhatsApp.find(r => r.agendamento_id === agendamento.id && r.status === 'enviado');
    
    if (registroEnviado) {
      return { 
        icon: CheckCircle, 
        cor: 'text-green-400', 
        label: 'Confirmação enviada',
        enviado: true
      };
    }
    
    return { 
      icon: MessageCircle, 
      cor: 'text-gray-300', 
      label: 'Não enviado',
      enviado: false
    };
  };

  const statusWhatsApp = getStatusWhatsApp();

  const handleEnviarWhatsApp = async (e) => {
    e.stopPropagation();
    
    if (!agendamento.cliente_telefone) {
      alert('Cliente não possui telefone cadastrado');
      return;
    }

    if (statusWhatsApp.enviado) {
      const confirmar = confirm('Uma confirmação já foi enviada. Deseja enviar novamente?');
      if (!confirmar) return;
    }

    setEnviandoWhatsApp(true);

    try {
      const response = await base44.functions.invoke('enviarWhatsAppManual', {
        agendamento_id: agendamento.id
      });

      if (response.data.success) {
        alert(response.data.message);
        // Atualizar apenas os registros de WhatsApp
        queryClient.invalidateQueries({ queryKey: ['registrosWhatsApp'] });
      } else {
        alert(`Erro: ${response.data.error}`);
      }
    } catch (error) {
      alert(`Erro ao enviar: ${error.message}`);
    } finally {
      setEnviandoWhatsApp(false);
    }
  };
  
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

  const currentStatus = optimisticStatus || agendamento.status;
  const currentStatusPaciente = optimisticStatusPaciente !== null ? optimisticStatusPaciente : agendamento.status_paciente;
  
  const StatusIcon = statusIcons[currentStatus] || Clock;
  const bgColorStatus = statusColors[currentStatus] || "bg-gray-500";
  const bgColorPaciente = statusPacienteColors[currentStatusPaciente];

  return (
    <Card
      className={`${bgColorStatus} text-white p-1.5 md:p-2 cursor-pointer hover:shadow-lg transition-all duration-200 border-0 rounded-lg h-full flex flex-col overflow-hidden relative`}
      onClick={() => onClick(agendamento)}
    >
      <div className="flex flex-col h-full">
        {/* Header com nome e hora */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <StatusIcon className="w-2.5 md:w-3 h-2.5 md:h-3 flex-shrink-0" />
            <span className="font-semibold text-[9px] md:text-xs truncate">{agendamento.cliente_nome}</span>
            {agendamento.health_score && (
              <span className="text-xs md:text-sm flex-shrink-0" title={
                agendamento.health_score === "insatisfeito" ? "Insatisfeito" :
                agendamento.health_score === "neutro" ? "Neutro" :
                agendamento.health_score === "recuperado" ? "Recuperado" :
                agendamento.health_score === "satisfeito" ? "Satisfeito" : ""
              }>
                {agendamento.health_score === "insatisfeito" && "😡"}
                {agendamento.health_score === "neutro" && "😑"}
                {agendamento.health_score === "recuperado" && "🩹"}
                {agendamento.health_score === "satisfeito" && "😁"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {podeEnviarLembrete && (
              <button
                onClick={handleEnviarWhatsApp}
                disabled={enviandoWhatsApp}
                className="p-0.5 hover:bg-white/20 rounded transition-colors"
                title={statusWhatsApp.label}
              >
                {enviandoWhatsApp ? (
                  <Loader2 className="w-3 md:w-4 h-3 md:h-4 animate-spin text-white" />
                ) : (
                  <statusWhatsApp.icon className={`w-3 md:w-4 h-3 md:h-4 flex-shrink-0 ${statusWhatsApp.cor}`} />
                )}
              </button>
            )}
            <statusProntuario.icon className={`w-4 md:w-5 h-4 md:h-5 flex-shrink-0 ${statusProntuario.cor}`} title={`Prontuário ${statusProntuario.label}`} />
            <span className="text-[8px] md:text-[10px] font-medium whitespace-nowrap">{agendamento.hora_inicio}</span>
          </div>
        </div>
        
        {/* Info central - flex grow para ocupar espaço */}
        <div className="text-[8px] md:text-[10px] opacity-95 flex-1 min-h-0 overflow-hidden">
          <div className="truncate">{agendamento.servico_nome}</div>
          <div className="font-medium truncate">{agendamento.profissional_nome}</div>
          {agendamento.tipo && agendamento.tipo !== "bloqueio" && (
            <div className="capitalize truncate">{agendamento.tipo.replace(/_/g, ' ')}</div>
          )}
        </div>
        
        {/* Status dropdowns - sempre no final */}
        <div className="mt-auto pt-0.5 flex justify-between gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Status do agendamento */}
          {readOnly ? (
            <div className="bg-white/20 text-white border-0 text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded min-h-[28px] md:min-h-[32px] flex items-center">
              {statusLabels[currentStatus] || currentStatus}
            </div>
          ) : (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(!dropdownOpen);
                  }}
                  className="bg-white/20 text-white border-0 text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 cursor-pointer hover:bg-white/30 transition-all flex items-center gap-0.5 rounded min-h-[28px] md:min-h-[32px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  {statusLabels[currentStatus] || currentStatus}
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()} className="z-50">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatus("agendado");
                  if (onStatusChange) onStatusChange(agendamento, "agendado");
                  setDropdownOpen(false);
                  setTimeout(() => setOptimisticStatus(null), 2000);
                }}
                className={currentStatus === "agendado" ? "bg-gray-100" : ""}
                style={{ minHeight: '44px' }}
              >
                {currentStatus === "agendado" && "✓ "}Agendado
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatus("confirmado");
                  if (onStatusChange) onStatusChange(agendamento, "confirmado");
                  setDropdownOpen(false);
                  setTimeout(() => setOptimisticStatus(null), 2000);
                }}
                className={currentStatus === "confirmado" ? "bg-gray-100" : ""}
                style={{ minHeight: '44px' }}
              >
                {currentStatus === "confirmado" && "✓ "}Confirmado
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatus("ausencia");
                  if (onStatusChange) onStatusChange(agendamento, "ausencia");
                  setDropdownOpen(false);
                  setTimeout(() => setOptimisticStatus(null), 2000);
                }}
                className={currentStatus === "ausencia" ? "bg-gray-100" : ""}
                style={{ minHeight: '44px' }}
              >
                {currentStatus === "ausencia" && "✓ "}Ausência
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatus("cancelado");
                  if (onStatusChange) onStatusChange(agendamento, "cancelado");
                  setDropdownOpen(false);
                  setTimeout(() => setOptimisticStatus(null), 2000);
                }}
                className={currentStatus === "cancelado" ? "bg-gray-100" : ""}
                style={{ minHeight: '44px' }}
              >
                {currentStatus === "cancelado" && "✓ "}Cancelado
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatus("concluido");
                  if (onStatusChange) onStatusChange(agendamento, "concluido");
                  setDropdownOpen(false);
                  setTimeout(() => setOptimisticStatus(null), 2000);
                }}
                className={currentStatus === "concluido" ? "bg-gray-100" : ""}
                style={{ minHeight: '44px' }}
              >
                {currentStatus === "concluido" && "✓ "}Concluído
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          {/* Status do paciente */}
          {readOnly ? (
            <div 
              className="text-white border-0 text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded min-h-[28px] md:min-h-[32px] flex items-center"
              style={{ backgroundColor: bgColorPaciente || 'rgba(255,255,255,0.2)' }}
            >
              {statusPacienteLabels[currentStatusPaciente] || "-"}
            </div>
          ) : (
            <DropdownMenu open={dropdownPacienteOpen} onOpenChange={setDropdownPacienteOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownPacienteOpen(!dropdownPacienteOpen);
                  }}
                  className="text-white border-0 text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 cursor-pointer hover:opacity-80 transition-all flex items-center gap-0.5 rounded min-h-[28px] md:min-h-[32px]"
                  style={{ backgroundColor: bgColorPaciente || 'rgba(255,255,255,0.2)', touchAction: 'manipulation' }}
                >
                  {statusPacienteLabels[currentStatusPaciente] || "-"}
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="z-50">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatusPaciente("");
                  if (onStatusPacienteChange) onStatusPacienteChange(agendamento, "");
                  setDropdownPacienteOpen(false);
                  setTimeout(() => setOptimisticStatusPaciente(null), 2000);
                }}
                className={!currentStatusPaciente ? "bg-gray-100" : ""}
                style={{ minHeight: '44px' }}
              >
                {!currentStatusPaciente && "✓ "}-
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatusPaciente("paciente_novo");
                  if (onStatusPacienteChange) onStatusPacienteChange(agendamento, "paciente_novo");
                  setDropdownPacienteOpen(false);
                  setTimeout(() => setOptimisticStatusPaciente(null), 2000);
                }}
                className={currentStatusPaciente === "paciente_novo" ? "bg-gray-100" : ""}
                style={{ minHeight: '44px' }}
              >
                {currentStatusPaciente === "paciente_novo" && "✓ "}Paciente Novo
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatusPaciente("ultima_sessao");
                  if (onStatusPacienteChange) onStatusPacienteChange(agendamento, "ultima_sessao");
                  setDropdownPacienteOpen(false);
                  setTimeout(() => setOptimisticStatusPaciente(null), 2000);
                }}
                className={currentStatusPaciente === "ultima_sessao" ? "bg-gray-100" : ""}
                style={{ minHeight: '44px' }}
              >
                {currentStatusPaciente === "ultima_sessao" && "✓ "}Última Sessão
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatusPaciente("voucher");
                  if (onStatusPacienteChange) onStatusPacienteChange(agendamento, "voucher");
                  setDropdownPacienteOpen(false);
                  setTimeout(() => setOptimisticStatusPaciente(null), 2000);
                }}
                className={currentStatusPaciente === "voucher" ? "bg-black text-white font-semibold" : ""}
                style={{ minHeight: '44px' }}
              >
                {currentStatusPaciente === "voucher" && "✓ "}Voucher
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
        </div>
      </Card>
  );
}