import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Calendar as CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AgendaFilters({ 
  filters, 
  onFilterChange,
  clientes = [],
  profissionais = [],
  unidades = [],
  servicos = []
}) {
  return (
    <div className="w-72 bg-white border-r border-gray-100 p-5 space-y-5 overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">Cliente</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar cliente..."
              value={filters.cliente || ""}
              onChange={(e) => onFilterChange("cliente", e.target.value)}
              className="pl-9 border-gray-200"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.data ? format(new Date(filters.data), "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.data ? new Date(filters.data) : undefined}
                onSelect={(date) => onFilterChange("data", date ? format(date, "yyyy-MM-dd") : null)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">Profissional</Label>
          <Select value={filters.profissional || "todos"} onValueChange={(value) => onFilterChange("profissional", value === "todos" ? null : value)}>
            <SelectTrigger className="border-gray-200">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {profissionais.map(prof => (
                <SelectItem key={prof.id} value={prof.id}>{prof.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">Unidade</Label>
          <Select value={filters.unidade || "todas"} onValueChange={(value) => onFilterChange("unidade", value === "todas" ? null : value)}>
            <SelectTrigger className="border-gray-200">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {unidades.map(unidade => (
                <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">Serviço</Label>
          <Select value={filters.servico || "todos"} onValueChange={(value) => onFilterChange("servico", value === "todos" ? null : value)}>
            <SelectTrigger className="border-gray-200">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {servicos.map(servico => (
                <SelectItem key={servico.id} value={servico.id}>{servico.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">Status</Label>
          <Select value={filters.status || "todos"} onValueChange={(value) => onFilterChange("status", value === "todos" ? null : value)}>
            <SelectTrigger className="border-gray-200">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="ausencia">Ausência</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filters.cliente || filters.profissional || filters.servico || filters.unidade || filters.status ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onFilterChange("limpar", null)}
          >
            Limpar Filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}