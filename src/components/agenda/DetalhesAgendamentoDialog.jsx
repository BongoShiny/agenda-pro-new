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
import { Calendar, Clock, User, Briefcase, MapPin, Tag, FileText, Ban, Unlock, CheckCircle, FileImage } from "lucide-react";

const statusLabels = {
  confirmado: { label: "Confirmado", color: "bg-emerald-500" },
  agendado: { label: "Agendado", color: "bg-amber-400" },
  ausencia: { label: "Ausência", color: "bg-fuchsia-600" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
  concluido: { label: "Concluído", color: "bg-blue-500" },
  bloqueio: { label: "FECHADO", color: "bg-red-600" }
};

// Mesma lógica em todos os componentes
const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function DetalhesAgendamentoDialog({ open, onOpenChange, agendamento, onDelete, onEdit, usuarioAtual, onConfirmar }) {
  if (!agendamento) return null;

  const statusInfo = statusLabels[agendamento.status] || statusLabels.agendado;
  const isBloqueio = agendamento.status === "bloqueio" || agendamento.tipo === "bloqueio" || agendamento.cliente_nome === "FECHADO";
  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin" || usuarioAtual?.cargo === "gerencia_unidades";
  const podeConfirmar = agendamento.status === "agendado";

  const handleDelete = () => {
    console.log("🗑️🗑️🗑️ DELETANDO BLOQUEIO 🗑️🗑️🗑️");
    console.log("🆔 ID:", agendamento.id);
    console.log("📅 Data:", agendamento.data);
    console.log("⏰ Horário:", agendamento.hora_inicio, "-", agendamento.hora_fim);
    console.log("👨‍⚕️ Profissional:", agendamento.profissional_nome);
    console.log("🏢 Unidade:", agendamento.unidade_nome);
    
    if (isBloqueio) {
      const confirmacao = window.confirm(
        `Desbloquear horário?\n\n` +
        `Profissional: ${agendamento.profissional_nome}\n` +
        `Horário: ${agendamento.hora_inicio} - ${agendamento.hora_fim}\n\n` +
        `Isso irá liberar todos os slots deste bloqueio.`
      );
      if (!confirmacao) return;
    }
    
    onDelete(agendamento.id);
  };

  const formatarDataExibicao = (dataString) => {
    const dataLocal = criarDataPura(dataString);
    const dataFormatada = format(dataLocal, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    console.log("📅 DETALHES - Exibindo:", dataFormatada, "| Data original:", dataString);
    return dataFormatada;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isBloqueio ? "Horário Fechado" : "Detalhes do Agendamento"}</span>
            <Badge className={`${statusInfo.color} text-white border-0`}>
              {statusInfo.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isBloqueio ? (
          <div className="space-y-4 py-4 overflow-y-auto">
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
                <div className="font-medium">{formatarDataExibicao(agendamento.data)}</div>
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
          <div className="space-y-4 py-4 overflow-y-auto">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Cliente</div>
                <div className="font-semibold text-lg">{agendamento.cliente_nome}</div>
                {agendamento.cliente_telefone && (
                  <div className="text-sm text-gray-600 mt-1">📱 {agendamento.cliente_telefone}</div>
                )}
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
                <div className="font-medium">{formatarDataExibicao(agendamento.data)}</div>
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

            {(agendamento.comprovante_url || agendamento.comprovante_url_2) && (
              <div className="flex items-start gap-3">
                <FileImage className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Comprovantes de Pagamento</div>
                  <div className="flex gap-2 mt-1">
                    {agendamento.comprovante_url && (
                      <a 
                        href={agendamento.comprovante_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <FileImage className="w-4 h-4" />
                        Comprovante 1
                      </a>
                    )}
                    {agendamento.comprovante_url_2 && (
                      <a 
                        href={agendamento.comprovante_url_2} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <FileImage className="w-4 h-4" />
                        Comprovante 2
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <div className="text-xs text-blue-600 font-medium">Criado por</div>
                    <div className="text-sm text-blue-800">{agendamento.criador_email || "Não disponível"}</div>
                  </div>
                </div>
                {agendamento.editor_email && agendamento.editor_email !== agendamento.criador_email && (
                  <div className="flex items-start gap-3 pt-2 border-t border-blue-200">
                    <User className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="text-xs text-blue-600 font-medium">Última edição por</div>
                      <div className="text-sm text-blue-800">{agendamento.editor_email}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
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
          {!isBloqueio && onEdit && (
            <Button 
              variant="outline"
              onClick={() => {
                onEdit(agendamento);
                onOpenChange(false);
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
            >
              ✏️ Editar Agendamento
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