import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AgendaFilters({ 
  filters, 
  onFilterChange,
  clientes = [],
  profissionais = [],
  servicos = []
}) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Filter className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Filtros</h2>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-5">
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar cliente..."
                value={filters.cliente || ""}
                onChange={(e) => onFilterChange("cliente", e.target.value)}
                className="pl-10 h-11 border-gray-300 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-11 border-gray-300">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.data ? format(new Date(filters.data), "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Profissional</Label>
            <Select value={filters.profissional || "todos"} onValueChange={(value) => onFilterChange("profissional", value === "todos" ? null : value)}>
              <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500">
                <SelectValue placeholder="Todos os profissionais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os profissionais</SelectItem>
                {profissionais.map(prof => (
                  <SelectItem key={prof.id} value={prof.id}>{prof.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Serviço</Label>
            <Select value={filters.servico || "todos"} onValueChange={(value) => onFilterChange("servico", value === "todos" ? null : value)}>
              <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500">
                <SelectValue placeholder="Todos os serviços" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os serviços</SelectItem>
                {servicos.map(servico => (
                  <SelectItem key={servico.id} value={servico.id}>{servico.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Status</Label>
            <Select value={filters.status || "todos"} onValueChange={(value) => onFilterChange("status", value === "todos" ? null : value)}>
              <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="ausencia">Ausência</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(filters.cliente || filters.profissional || filters.servico || filters.status || filters.data) && (
            <Button
              variant="outline"
              className="w-full h-11 border-gray-300 hover:bg-gray-50"
              onClick={() => onFilterChange("limpar", null)}
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}