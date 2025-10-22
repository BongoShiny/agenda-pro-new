import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function AgendaHeader({ 
  dataAtual, 
  visualizacao, 
  onDataChange, 
  onVisualizacaoChange,
  onNovoAgendamento 
}) {
  const formatarDataExibicao = () => {
    if (visualizacao === "dia") {
      return format(dataAtual, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } else if (visualizacao === "semana") {
      const inicio = startOfWeek(dataAtual, { weekStartsOn: 0 });
      const fim = endOfWeek(dataAtual, { weekStartsOn: 0 });
      return `${format(inicio, "dd MMM", { locale: ptBR })} - ${format(fim, "dd MMM yyyy", { locale: ptBR })}`;
    } else {
      return format(dataAtual, "MMMM 'de' yyyy", { locale: ptBR });
    }
  };

  const navegarAnterior = () => {
    if (visualizacao === "dia") onDataChange(subDays(dataAtual, 1));
    else if (visualizacao === "semana") onDataChange(subWeeks(dataAtual, 1));
    else onDataChange(subMonths(dataAtual, 1));
  };

  const navegarProximo = () => {
    if (visualizacao === "dia") onDataChange(addDays(dataAtual, 1));
    else if (visualizacao === "semana") onDataChange(addWeeks(dataAtual, 1));
    else onDataChange(addMonths(dataAtual, 1));
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Agenda</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navegarAnterior}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => onDataChange(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={navegarProximo}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-lg font-semibold text-gray-700 capitalize">
            {formatarDataExibicao()}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={visualizacao === "dia" ? "default" : "ghost"}
              size="sm"
              onClick={() => onVisualizacaoChange("dia")}
              className={visualizacao === "dia" ? "bg-blue-600" : ""}
            >
              Dia
            </Button>
            <Button
              variant={visualizacao === "semana" ? "default" : "ghost"}
              size="sm"
              onClick={() => onVisualizacaoChange("semana")}
              className={visualizacao === "semana" ? "bg-blue-600" : ""}
            >
              Semana
            </Button>
            <Button
              variant={visualizacao === "mes" ? "default" : "ghost"}
              size="sm"
              onClick={() => onVisualizacaoChange("mes")}
              className={visualizacao === "mes" ? "bg-blue-600" : ""}
            >
              Mês
            </Button>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700" onClick={onNovoAgendamento}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>
    </div>
  );
}