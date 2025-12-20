import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WidgetProximosAgendamentos({ agendamentos }) {
  const hoje = format(new Date(), "yyyy-MM-dd");
  
  const proximosAgendamentos = agendamentos
    .filter(ag => {
      if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.status === "cancelado") return false;
      return ag.data >= hoje;
    })
    .sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return a.hora_inicio.localeCompare(b.hora_inicio);
    })
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Próximos Agendamentos</CardTitle>
        <Calendar className="h-4 w-4 text-blue-600" />
      </CardHeader>
      <CardContent>
        {proximosAgendamentos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum agendamento próximo</p>
        ) : (
          <div className="space-y-3">
            {proximosAgendamentos.map(ag => (
              <div key={ag.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{ag.cliente_nome}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(ag.data + 'T12:00:00'), "dd/MM", { locale: ptBR })} às {ag.hora_inicio}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>{ag.profissional_nome}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                  ag.status === "confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {ag.status === "confirmado" ? "Confirmado" : "Agendado"}
                </span>
              </div>
            ))}
            <Link to={createPageUrl("Agenda")}>
              <Button variant="outline" className="w-full mt-2" size="sm">
                Ver Todos os Agendamentos
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}