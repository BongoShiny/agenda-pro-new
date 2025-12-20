import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WidgetTarefasPendentes({ agendamentos }) {
  const hoje = new Date().toISOString().split('T')[0];
  
  const agendamentosAConfirmar = agendamentos.filter(ag => 
    ag.status === "agendado" && 
    ag.data >= hoje &&
    ag.status !== "bloqueio" && 
    ag.tipo !== "bloqueio"
  ).length;

  const pagamentosAtrasados = agendamentos.filter(ag => {
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
    return ag.data < hoje && (ag.falta_quanto > 0);
  }).length;

  const pagamentosPendentes = agendamentos.filter(ag => {
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
    return (ag.falta_quanto > 0);
  }).length;

  const tarefas = [
    {
      label: "Agendamentos a Confirmar",
      count: agendamentosAConfirmar,
      icon: CheckCircle,
      color: "blue",
      link: createPageUrl("Agenda")
    },
    {
      label: "Pagamentos Atrasados",
      count: pagamentosAtrasados,
      icon: AlertCircle,
      color: "red",
      link: createPageUrl("RelatoriosFinanceiros")
    },
    {
      label: "Pagamentos Pendentes",
      count: pagamentosPendentes,
      icon: DollarSign,
      color: "orange",
      link: createPageUrl("RelatoriosFinanceiros")
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tarefas.map((tarefa, idx) => {
            const Icon = tarefa.icon;
            const colorClasses = {
              blue: "bg-blue-100 text-blue-700",
              red: "bg-red-100 text-red-700",
              orange: "bg-orange-100 text-orange-700"
            };
            
            return (
              <Link key={idx} to={tarefa.link}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorClasses[tarefa.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{tarefa.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    tarefa.count > 0 ? `text-${tarefa.color}-600` : 'text-gray-400'
                  }`}>
                    {tarefa.count}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}