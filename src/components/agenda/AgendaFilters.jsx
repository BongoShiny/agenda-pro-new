import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Calendar as CalendarIcon, Filter, X, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import HistoricoClienteDialog from "./HistoricoClienteDialog";
import DetalhesAgendamentoDialog from "./DetalhesAgendamentoDialog";
import AutocompleteInput from "./AutocompleteInput";
import FiltrosSalvosDialog from "./FiltrosSalvosDialog";
import { Badge } from "@/components/ui/badge";
import { Bookmark } from "lucide-react";

// Mesma lógica em todos os componentes
const formatarDataPura = (data) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const criarDataPura = (dataString) => {
  if (!dataString) return undefined;
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function AgendaFilters({ 
  filters, 
  onFilterChange,
  clientes = [],
  profissionais = [],
  servicos = [],
  unidades = [],
  agendamentos = [],
  usuarioAtual = null
}) {
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [filtrosSalvosAberto, setFiltrosSalvosAberto] = useState(false);

  const handleDataChange = (date) => {
    if (date) {
      const dataFormatada = formatarDataPura(date);
      console.log("🔍 FILTRO - Data selecionada:", dataFormatada);
      onFilterChange("data", dataFormatada);
    } else {
      onFilterChange("data", null);
    }
  };

  const statusLabels = {
    confirmado: { label: "Confirmado", color: "bg-emerald-500" },
    agendado: { label: "Agendado", color: "bg-amber-400" },
    ausencia: { label: "Ausência", color: "bg-fuchsia-600" },
    cancelado: { label: "Cancelado", color: "bg-red-500" },
    concluido: { label: "Concluído", color: "bg-blue-500" },
    bloqueio: { label: "FECHADO", color: "bg-red-600" }
  };

  const formatarDataExibicao = (dataString) => {
    const dataLocal = criarDataPura(dataString);
    return format(dataLocal, "dd/MM/yyyy", { locale: ptBR });
  };

  // Filtrar agendamentos do cliente pesquisado
  const agendamentosCliente = filters.cliente 
    ? agendamentos.filter(ag => {
        const nomeMatch = ag.cliente_nome?.toLowerCase().includes(filters.cliente.toLowerCase());
        const telefoneMatch = ag.cliente_telefone?.includes(filters.cliente);
        return nomeMatch || telefoneMatch;
      })
    : [];

  const handleVerDetalhes = (ag) => {
    setAgendamentoSelecionado(ag);
    setDetalhesAberto(true);
  };

  const handleCarregarFiltro = (filtrosObj) => {
    Object.keys(filtrosObj).forEach(key => {
      onFilterChange(key, filtrosObj[key]);
    });
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Filter className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Filtros</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-5">
          {/* Botão de Filtros Salvos */}
          <Button
            variant="outline"
            className="w-full h-11 justify-start border-blue-300 hover:bg-blue-50 text-blue-700"
            onClick={() => setFiltrosSalvosAberto(true)}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Filtros Salvos
          </Button>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Cliente ou Telefone</Label>
            <AutocompleteInput
              value={filters.cliente || ""}
              onChange={(value) => onFilterChange("cliente", value)}
              options={clientes}
              placeholder="Buscar cliente..."
              displayField="nome"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-11 border-gray-300">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.data ? format(criarDataPura(filters.data), "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.data ? criarDataPura(filters.data) : undefined}
                  onSelect={handleDataChange}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Unidade</Label>
            <Select value={filters.unidade || "todos"} onValueChange={(value) => onFilterChange("unidade", value === "todos" ? null : value)}>
              <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500">
                <SelectValue placeholder="Todas as unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as unidades</SelectItem>
                {unidades.map(unidade => (
                  <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Profissional</Label>
            <AutocompleteInput
              value={filters.profissional ? profissionais.find(p => p.id === filters.profissional)?.nome || "" : ""}
              onChange={(value) => {
                if (!value) {
                  onFilterChange("profissional", null);
                }
              }}
              options={profissionais}
              placeholder="Buscar profissional..."
              displayField="nome"
              onSelect={(prof) => onFilterChange("profissional", prof.id)}
            />
            {filters.profissional && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange("profissional", null)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Serviço</Label>
            <AutocompleteInput
              value={filters.servico ? servicos.find(s => s.id === filters.servico)?.nome || "" : ""}
              onChange={(value) => {
                if (!value) {
                  onFilterChange("servico", null);
                }
              }}
              options={servicos}
              placeholder="Buscar serviço..."
              displayField="nome"
              onSelect={(srv) => onFilterChange("servico", srv.id)}
            />
            {filters.servico && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange("servico", null)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
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

          {filters.cliente && agendamentosCliente.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Agendamentos Encontrados ({agendamentosCliente.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {agendamentosCliente.slice(0, 10).map(ag => (
                  <button
                    key={ag.id}
                    onClick={() => handleVerDetalhes(ag)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="font-medium text-sm">{ag.cliente_nome}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {formatarDataExibicao(ag.data)} às {ag.hora_inicio}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{ag.profissional_nome}</div>
                    <Badge className={`${statusLabels[ag.status]?.color || 'bg-gray-500'} text-white border-0 mt-2 text-xs`}>
                      {statusLabels[ag.status]?.label || ag.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filters.cliente && (
            <Button
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setHistoricoAberto(true)}
            >
              <History className="w-4 h-4 mr-2" />
              Ver Histórico Completo
            </Button>
          )}

          {(filters.cliente || filters.unidade || filters.profissional || filters.servico || filters.status || filters.data) && (
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
      </div>

      <DetalhesAgendamentoDialog
        open={detalhesAberto}
        onOpenChange={setDetalhesAberto}
        agendamento={agendamentoSelecionado}
        usuarioAtual={{ ...usuarioAtual, cargo: 'administrador' }}
        onDelete={() => {}}
        onEdit={() => {}}
        onConfirmar={() => {}}
        modoVisualizacao={true}
      />

      <FiltrosSalvosDialog
        open={filtrosSalvosAberto}
        onOpenChange={setFiltrosSalvosAberto}
        filtrosAtuais={filters}
        onCarregarFiltro={handleCarregarFiltro}
        usuarioAtual={usuarioAtual}
      />

      <HistoricoClienteDialog
                      open={historicoAberto}
                      onOpenChange={setHistoricoAberto}
                      clienteBusca={filters.cliente}
                      agendamentos={agendamentos}
                      filtroUnidade={filters.unidade}
                      filtroProfissional={filters.profissional}
                      filtroServico={filters.servico}
                      filtroStatus={filters.status}
                      filtroData={filters.data}
                      usuarioAtual={usuarioAtual}
                    />
    </div>
  );
}