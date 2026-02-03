import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, User, Briefcase, MapPin, Tag, FileText, Ban, Unlock, CheckCircle, FileImage, DollarSign, Package, Users } from "lucide-react";
import AbaProntuario from "./AbaProntuario";
import AbaContrato from "./AbaContrato";
import AbaAvaliacaoTermal from "./AbaAvaliacaoTermal";
import AbaConversaoAgendamento from "./AbaConversaoAgendamento";

const statusLabels = {
  confirmado: { label: "Confirmado", color: "bg-emerald-500" },
  agendado: { label: "Agendado", color: "bg-amber-400" },
  ausencia: { label: "Ausência", color: "bg-fuchsia-600" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
  concluido: { label: "Concluído", color: "bg-blue-500" },
  bloqueio: { label: "FECHADO", color: "bg-red-600" }
};

const statusPacienteLabels = {
  paciente_novo: { label: "Paciente Novo", color: "bg-blue-500" },
  primeira_sessao: { label: "Primeira Sessão", color: "bg-cyan-500" },
  ultima_sessao: { label: "Última Sessão", color: "bg-orange-500" },
  cliente_retornou: { label: "Cliente Retornou", color: "bg-purple-500" }
};

// Mesma lógica em todos os componentes
const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function DetalhesAgendamentoDialog({ open, onOpenChange, agendamento, onDelete, onEdit, usuarioAtual, onConfirmar, modoVisualizacao = false }) {
   const [abaAtiva, setAbaAtiva] = useState("detalhes");

   if (!agendamento) return null;

   const statusInfo = statusLabels[agendamento.status] || statusLabels.agendado;
   const isBloqueio = agendamento.status === "bloqueio" || agendamento.tipo === "bloqueio" || agendamento.cliente_nome === "FECHADO";
   const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin" || usuarioAtual?.cargo === "gerencia_unidades";
   const isTerapia = usuarioAtual?.cargo === "terapeuta";
   const temAcessoProntuario = isAdmin || usuarioAtual?.cargo === "financeiro" || usuarioAtual?.cargo === "recepcao";
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
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) setAbaAtiva("detalhes"); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
           <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="flex-1 flex flex-col overflow-hidden">
             <TabsList className="grid w-full grid-cols-5">
               <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
               <TabsTrigger value="conversao">Conversão</TabsTrigger>
               <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
               <TabsTrigger value="contrato">Contrato 30%</TabsTrigger>
               <TabsTrigger value="avaliacao-termal">Aval. Termal</TabsTrigger>
             </TabsList>
            
            <TabsContent value="detalhes" className="flex-1 overflow-y-auto">
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                 <div className="text-sm text-gray-500">Cliente</div>
                 <div className="font-semibold text-lg">{agendamento.cliente_nome}</div>
                 {agendamento.cliente_telefone && !isTerapia && (
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

            {agendamento.health_score && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                  {agendamento.health_score === "insatisfeito" && "😡"}
                  {agendamento.health_score === "neutro" && "😑"}
                  {agendamento.health_score === "recuperado" && "🩹"}
                  {agendamento.health_score === "satisfeito" && "😁"}
                </div>
                <div>
                  <div className="text-sm text-gray-500">Health Score</div>
                  <div className="font-medium">
                    {agendamento.health_score === "insatisfeito" && "😡 INSATISFEITO"}
                    {agendamento.health_score === "neutro" && "😑 NEUTRO"}
                    {agendamento.health_score === "recuperado" && "🩹 RECUPERADO"}
                    {agendamento.health_score === "satisfeito" && "😁 SATISFEITO"}
                  </div>
                </div>
              </div>
            )}

            {agendamento.status_paciente && (
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Status do Paciente</div>
                  <Badge className={`${statusPacienteLabels[agendamento.status_paciente]?.color || 'bg-gray-500'} text-white border-0 w-fit`}>
                    {statusPacienteLabels[agendamento.status_paciente]?.label || agendamento.status_paciente.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            )}

            {!isTerapia && agendamento.observacoes && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Observações</div>
                  <div className="text-gray-700">{agendamento.observacoes}</div>
                </div>
              </div>
            )}

            {!isTerapia && agendamento.observacoes_vendedores && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Observações Vendedores</div>
                  <div className="text-gray-700">{agendamento.observacoes_vendedores}</div>
                </div>
              </div>
            )}

            {!isTerapia && agendamento.observacoes_terapeuta && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Observações Terapeuta</div>
                  <div className="text-gray-700">{agendamento.observacoes_terapeuta}</div>
                </div>
              </div>
            )}

            {!isTerapia && agendamento.observacoes_recepcionista && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Observações Recepcionista</div>
                  <div className="text-gray-700">{agendamento.observacoes_recepcionista}</div>
                </div>
              </div>
            )}

            {!isTerapia && agendamento.observacoes_pos_venda && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Observações Pós Venda</div>
                  <div className="text-gray-700">{agendamento.observacoes_pos_venda}</div>
                </div>
              </div>
            )}

            {!isTerapia && (agendamento.valor_combinado || agendamento.sinal || agendamento.vendedor_nome) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">Valores e Pagamento (Avulso)</h4>
                </div>
                <div className="space-y-2">
                  {agendamento.valor_combinado && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Valor Combinado:</span>
                      <span className="font-medium">R$ {agendamento.valor_combinado.toFixed(2)}</span>
                    </div>
                  )}
                  {agendamento.sinal && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sinal:</span>
                      <span className="font-medium">R$ {agendamento.sinal.toFixed(2)}</span>
                    </div>
                  )}
                  {agendamento.falta_quanto !== null && agendamento.falta_quanto !== undefined && (
                    <div className="flex justify-between border-t border-amber-300 pt-2">
                      <span className="text-sm text-gray-600">Falta Quanto:</span>
                      <span className="font-bold text-amber-900">
                        {agendamento.falta_quanto > 0 
                          ? `R$ ${agendamento.falta_quanto.toFixed(2)}` 
                          : agendamento.falta_quanto < 0 
                            ? `PAGO A MAIS R$ ${Math.abs(agendamento.falta_quanto).toFixed(2)}`
                            : "R$ 0,00"
                        }
                      </span>
                    </div>
                  )}
                  {agendamento.vendedor_nome && (
                    <div className="flex justify-between border-t border-amber-300 pt-2 mt-2">
                      <span className="text-sm text-gray-600">Vendedor:</span>
                      <span className="font-medium">{agendamento.vendedor_nome}</span>
                    </div>
                  )}
                  {agendamento.data_pagamento && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Data Pagamento:</span>
                      <span className="font-medium">{format(criarDataPura(agendamento.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
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
                    {agendamento.created_date && (
                      <div className="text-xs text-blue-600 mt-1">
                        {format(new Date(agendamento.created_date), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </div>
                    )}
                  </div>
                </div>
                {agendamento.editor_email && agendamento.editor_email !== agendamento.criador_email && (
                  <div className="flex items-start gap-3 pt-2 border-t border-blue-200">
                    <User className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="text-xs text-blue-600 font-medium">Última edição por</div>
                      <div className="text-sm text-blue-800">{agendamento.editor_email}</div>
                      {agendamento.updated_date && (
                        <div className="text-xs text-blue-600 mt-1">
                          {format(new Date(agendamento.updated_date), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conversao" className="flex-1 overflow-y-auto">
          <AbaConversaoAgendamento agendamento={agendamento} onUpdate={() => {}} />
        </TabsContent>

        <TabsContent value="prontuario" className="flex-1 overflow-y-auto">
          <AbaProntuario agendamento={agendamento} usuarioAtual={usuarioAtual} />
        </TabsContent>

        <TabsContent value="contrato" className="flex-1 overflow-y-auto">
          <AbaContrato agendamento={agendamento} usuarioAtual={usuarioAtual} />
        </TabsContent>

        <TabsContent value="avaliacao-termal" className="flex-1 overflow-y-auto">
          <AbaAvaliacaoTermal agendamento={agendamento} usuarioAtual={usuarioAtual} />
        </TabsContent>
        </Tabs>
    )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {!modoVisualizacao && (
            <>
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
              {!isBloqueio && onEdit && !isTerapia && (
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}