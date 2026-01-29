import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, MapPin, ChevronRight, ArrowLeft, UserPlus, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DetalhesAgendamentoDialog from "./DetalhesAgendamentoDialog";

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
  agendamentos = [],
  filtroUnidade = null,
  filtroProfissional = null,
  filtroServico = null,
  filtroStatus = null,
  filtroData = null,
  usuarioAtual = null
}) {
  const [sessaoSelecionada, setSessaoSelecionada] = useState(null);
  const [detalhesAberto, setDetalhesAberto] = useState(false);

  // Filtrar agendamentos pelo cliente/telefone E pelos outros filtros ativos
  const agendamentosCliente = agendamentos
    .filter(ag => {
      if (!clienteBusca) return false;
      if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") return false;
      
      const buscaLower = clienteBusca.toLowerCase();
      const matchCliente = (
        ag.cliente_nome?.toLowerCase().includes(buscaLower) ||
        ag.cliente_telefone?.toLowerCase().includes(buscaLower)
      );
      
      if (!matchCliente) return false;
      
      // Aplicar filtros adicionais se estiverem ativos
      if (filtroUnidade && ag.unidade_id !== filtroUnidade) return false;
      if (filtroProfissional && ag.profissional_id !== filtroProfissional) return false;
      if (filtroServico && ag.servico_id !== filtroServico) return false;
      if (filtroStatus && ag.status !== filtroStatus) return false;
      if (filtroData && ag.data !== filtroData) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Ordenar por data mais recente
      const dataA = a.data + a.hora_inicio;
      const dataB = b.data + b.hora_inicio;
      return dataB.localeCompare(dataA);
    });

  // Resetar sessão selecionada quando fechar o dialog
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setSessaoSelecionada(null);
    }
    onOpenChange(isOpen);
  };

  const handleVerDetalhesCompletos = (ag) => {
    setSessaoSelecionada(ag);
    setDetalhesAberto(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sessaoSelecionada ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSessaoSelecionada(null)}
                  className="mr-2 p-1 h-auto"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                Detalhes da Sessão
              </>
            ) : (
              <>
                <User className="w-5 h-5 text-blue-600" />
                Histórico de Sessões: "{clienteBusca}"
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {sessaoSelecionada ? (
            // Vista de detalhes da sessão
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl font-bold text-gray-900">{sessaoSelecionada.cliente_nome}</span>
                  <Badge className={statusLabels[sessaoSelecionada.status]?.cor || "bg-gray-100 text-gray-800"}>
                    {statusLabels[sessaoSelecionada.status]?.label || sessaoSelecionada.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-xs text-gray-500">Data</div>
                        <div className="font-medium">
                          {sessaoSelecionada.data ? format(criarDataPura(sessaoSelecionada.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-xs text-gray-500">Horário</div>
                        <div className="font-medium">{sessaoSelecionada.hora_inicio} - {sessaoSelecionada.hora_fim}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-xs text-gray-500">Profissional</div>
                        <div className="font-medium">{sessaoSelecionada.profissional_nome}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-xs text-gray-500">Unidade</div>
                        <div className="font-medium">{sessaoSelecionada.unidade_nome}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {sessaoSelecionada.cliente_telefone && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">Telefone</div>
                        <div className="font-medium">{sessaoSelecionada.cliente_telefone}</div>
                      </div>
                    )}

                    {sessaoSelecionada.servico_nome && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">Serviço</div>
                        <div className="font-medium">{sessaoSelecionada.servico_nome}</div>
                      </div>
                    )}

                    {sessaoSelecionada.equipamento && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">Tipo / Equipamento</div>
                        <div className="font-medium">{sessaoSelecionada.equipamento}</div>
                      </div>
                    )}

                    {sessaoSelecionada.sala && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">Sala</div>
                        <div className="font-medium">{sessaoSelecionada.sala}</div>
                      </div>
                    )}
                  </div>
                </div>

                {sessaoSelecionada.observacoes && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs text-amber-700 font-medium mb-1">Observações</div>
                    <div className="text-sm text-amber-900">{sessaoSelecionada.observacoes}</div>
                  </div>
                )}

                {/* Informações de criação e edição */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 font-medium mb-2">Informações do Sistema</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {sessaoSelecionada.criador_email && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <UserPlus className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="text-xs text-green-700">Criado por</div>
                          <div className="font-medium text-green-900">{sessaoSelecionada.criador_email}</div>
                        </div>
                      </div>
                    )}

                    {sessaoSelecionada.created_by && !sessaoSelecionada.criador_email && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <UserPlus className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="text-xs text-green-700">Criado por</div>
                          <div className="font-medium text-green-900">{sessaoSelecionada.created_by}</div>
                        </div>
                      </div>
                    )}

                    {sessaoSelecionada.editor_email && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-xs text-blue-700">Última edição por</div>
                          <div className="font-medium text-blue-900">{sessaoSelecionada.editor_email}</div>
                        </div>
                      </div>
                    )}

                    {sessaoSelecionada.created_date && (
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">Data de criação</div>
                        <div className="font-medium text-gray-700">
                          {format(new Date(sessaoSelecionada.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    )}

                    {sessaoSelecionada.updated_date && (
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">Última atualização</div>
                        <div className="font-medium text-gray-700">
                          {format(new Date(sessaoSelecionada.updated_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Lista de sessões
            <>
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
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                      onClick={() => handleVerDetalhesCompletos(ag)}
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
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DetalhesAgendamentoDialog
          open={detalhesAberto}
          onOpenChange={setDetalhesAberto}
          agendamento={sessaoSelecionada}
          usuarioAtual={{ ...usuarioAtual, cargo: 'administrador' }}
          onDelete={() => {}}
          onEdit={() => {}}
          onConfirmar={() => {}}
          modoVisualizacao={true}
        />
      </DialogContent>
    </Dialog>
  );
}