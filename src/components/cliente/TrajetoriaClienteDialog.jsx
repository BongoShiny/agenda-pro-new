import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, User, MapPin, DollarSign, Package, TrendingUp, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels = {
  confirmado: { label: "Confirmado", cor: "bg-green-100 text-green-700 border-green-200" },
  agendado: { label: "Agendado", cor: "bg-amber-100 text-amber-700 border-amber-200" },
  ausencia: { label: "Ausência", cor: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
  cancelado: { label: "Cancelado", cor: "bg-red-100 text-red-700 border-red-200" },
  concluido: { label: "Concluído", cor: "bg-blue-100 text-blue-700 border-blue-200" },
};

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function TrajetoriaClienteDialog({ open, onOpenChange, cliente, agendamentos = [] }) {
  if (!cliente) return null;

  // Filtrar agendamentos do cliente
  const agendamentosCliente = agendamentos
    .filter(ag => ag.cliente_id === cliente.id)
    .sort((a, b) => {
      const dataA = new Date(a.data + ' ' + a.hora_inicio);
      const dataB = new Date(b.data + ' ' + b.hora_inicio);
      return dataB - dataA; // Mais recente primeiro
    });

  // Buscar pacote ativo
  const agendamentoComPacote = agendamentosCliente
    .filter(ag => ag.cliente_pacote === "Sim" && ag.quantas_sessoes)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  // Calcular totais financeiros
  const totalCombinado = agendamentosCliente.reduce((sum, ag) => sum + (ag.valor_combinado || 0), 0);
  const totalPago = agendamentosCliente.reduce((sum, ag) => 
    sum + (ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0), 0
  );
  const totalFalta = agendamentosCliente.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);

  // Unidades visitadas
  const unidadesVisitadas = [...new Set(agendamentosCliente.map(ag => ag.unidade_nome))].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Trajetória do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Header com Info do Cliente */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{cliente.nome}</h2>
                {cliente.telefone && (
                  <p className="text-gray-600 mt-1 flex items-center gap-2">
                    📱 {cliente.telefone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total de Sessões</div>
                <div className="text-3xl font-bold text-blue-600">{agendamentosCliente.length}</div>
              </div>
            </div>

            {/* Unidades visitadas */}
            {unidadesVisitadas.length > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 font-medium">Unidades:</span>
                {unidadesVisitadas.map(unidade => (
                  <Badge key={unidade} variant="outline" className="bg-white">
                    {unidade}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Informações de Pacote */}
          {agendamentoComPacote && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-bold text-purple-900">Pacote Ativo</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-purple-700 mb-1">Total de Sessões</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {agendamentoComPacote.quantas_sessoes}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-purple-700 mb-1">Realizadas</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {agendamentoComPacote.sessoes_feitas}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-purple-700 mb-1">Progresso</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {Math.round((agendamentoComPacote.sessoes_feitas / agendamentoComPacote.quantas_sessoes) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="mt-4 bg-purple-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all"
                    style={{ 
                      width: `${Math.round((agendamentoComPacote.sessoes_feitas / agendamentoComPacote.quantas_sessoes) * 100)}%` 
                    }}
                  />
                </div>

                {agendamentoComPacote.valor_combinado > 0 && (
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-700 font-medium">Valor do Pacote</span>
                      <span className="text-xl font-bold text-green-600">
                        R$ {agendamentoComPacote.valor_combinado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resumo Financeiro */}
          {totalCombinado > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-bold text-green-900">Resumo Financeiro</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-green-700 mb-1">Total Combinado</div>
                    <div className="text-xl font-bold text-green-900">
                      R$ {totalCombinado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-green-700 mb-1">Total Pago</div>
                    <div className="text-xl font-bold text-green-900">
                      R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-green-700 mb-1">Falta Pagar</div>
                    <div className="text-xl font-bold text-red-600">
                      R$ {totalFalta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de Sessões */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Histórico de Sessões ({agendamentosCliente.length})
            </h3>

            <div className="space-y-3">
              {agendamentosCliente.map((ag, index) => (
                <Card key={ag.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={statusLabels[ag.status]?.cor || "bg-gray-100"} variant="outline">
                            {statusLabels[ag.status]?.label || ag.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Sessão #{agendamentosCliente.length - index}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{ag.hora_inicio} - {ag.hora_fim}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{ag.profissional_nome}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{ag.unidade_nome}</span>
                          </div>
                        </div>

                        {ag.servico_nome && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Serviço:</span> {ag.servico_nome}
                          </div>
                        )}

                        {(ag.valor_combinado > 0 || ag.sinal > 0) && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm">
                            {ag.valor_combinado > 0 && (
                              <div>
                                <span className="text-gray-500">Valor: </span>
                                <span className="font-bold text-green-600">
                                  R$ {ag.valor_combinado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            {ag.sinal > 0 && (
                              <div>
                                <span className="text-gray-500">Pago: </span>
                                <span className="font-semibold text-blue-600">
                                  R$ {((ag.sinal || 0) + (ag.recebimento_2 || 0) + (ag.final_pagamento || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Observações */}
                        {(ag.observacoes || ag.observacoes_vendedores || ag.observacoes_terapeuta || ag.observacoes_recepcionista || ag.observacoes_pos_venda) && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                            {ag.observacoes && (
                              <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="font-semibold text-amber-900 mb-1 flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Observações Gerais
                                </div>
                                <p className="text-amber-800">{ag.observacoes}</p>
                              </div>
                            )}
                            
                            {ag.observacoes_vendedores && (
                              <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Observações Vendedores
                                </div>
                                <p className="text-blue-800">{ag.observacoes_vendedores}</p>
                              </div>
                            )}
                            
                            {ag.observacoes_terapeuta && (
                              <div className="text-sm bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="font-semibold text-green-900 mb-1 flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Observações Terapeuta
                                </div>
                                <p className="text-green-800">{ag.observacoes_terapeuta}</p>
                              </div>
                            )}
                            
                            {ag.observacoes_recepcionista && (
                              <div className="text-sm bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <div className="font-semibold text-purple-900 mb-1 flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Observações Recepcionista
                                </div>
                                <p className="text-purple-800">{ag.observacoes_recepcionista}</p>
                              </div>
                            )}
                            
                            {ag.observacoes_pos_venda && (
                              <div className="text-sm bg-pink-50 border border-pink-200 rounded-lg p-3">
                                <div className="font-semibold text-pink-900 mb-1 flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Observações Pós Venda
                                </div>
                                <p className="text-pink-800">{ag.observacoes_pos_venda}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}