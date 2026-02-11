import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function MobileReportCard({ agendamento, statusLabels, type = "client" }) {
  if (type === "financial") {
    const totalPago = (agendamento.sinal || 0) + (agendamento.recebimento_2 || 0) + (agendamento.final_pagamento || 0);
    
    return (
      <Card className="p-4 space-y-3 bg-white dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-white">
              {agendamento.cliente_nome}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{agendamento.cliente_telefone || "-"}</p>
          </div>
          <Badge className={`${statusLabels[agendamento.status]?.cor || "bg-gray-100 text-gray-800"}`}>
            {statusLabels[agendamento.status]?.label || agendamento.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Profissional</p>
            <p className="font-medium text-gray-900 dark:text-white">{agendamento.profissional_nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Unidade</p>
            <p className="font-medium text-gray-900 dark:text-white">{agendamento.unidade_nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Data</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {agendamento.data ? format(criarDataPura(agendamento.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Horário</p>
            <p className="font-medium text-gray-900 dark:text-white">{agendamento.hora_inicio} - {agendamento.hora_fim}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Combinado</p>
            <p className="font-bold text-blue-600 dark:text-blue-400">{formatarMoeda(agendamento.valor_combinado)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pago</p>
            <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatarMoeda(totalPago)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">A Receber</p>
            <p className="font-bold text-orange-600 dark:text-orange-400">{formatarMoeda(agendamento.falta_quanto)}</p>
          </div>
        </div>
      </Card>
    );
  }

  // Client report type
  return (
    <Card className="p-4 space-y-3 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base text-gray-900 dark:text-white">
            {agendamento.cliente_nome}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{agendamento.cliente_telefone || "-"}</p>
        </div>
        <Badge className={`${statusLabels[agendamento.status]?.cor || "bg-gray-100 text-gray-800"}`}>
          {statusLabels[agendamento.status]?.label || agendamento.status}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Profissional</p>
          <p className="font-medium text-gray-900 dark:text-white">{agendamento.profissional_nome}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Serviço</p>
          <p className="font-medium text-gray-900 dark:text-white">{agendamento.servico_nome || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Data</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {agendamento.data ? format(criarDataPura(agendamento.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Horário</p>
          <p className="font-medium text-gray-900 dark:text-white">{agendamento.hora_inicio} - {agendamento.hora_fim}</p>
        </div>
      </div>

      {(agendamento.cliente_pacote === "Sim" || agendamento.equipamento) && (
        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {agendamento.cliente_pacote === "Sim" && (
            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
              Pacote: {agendamento.sessoes_feitas || 0}/{agendamento.quantas_sessoes || 0}
            </Badge>
          )}
          {agendamento.equipamento && (
            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
              {agendamento.equipamento}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}