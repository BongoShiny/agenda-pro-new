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
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, MapPin, Clock, Tag, FileText, ArrowLeft } from "lucide-react";

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
  agendamentos = []
}) {
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);

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

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          {agendamentoSelecionado ? (
            <>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setAgendamentoSelecionado(null)}
                className="h-10 w-10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold text-gray-900">Detalhes</h2>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Filter className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Filtros</h2>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {agendamentoSelecionado ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Badge className={`${statusLabels[agendamentoSelecionado.status]?.color || 'bg-gray-500'} text-white border-0`}>
                {statusLabels[agendamentoSelecionado.status]?.label || agendamentoSelecionado.status}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-500">Cliente</div>
                  <div className="font-semibold">{agendamentoSelecionado.cliente_nome}</div>
                  {agendamentoSelecionado.cliente_telefone && (
                    <div className="text-sm text-gray-600 mt-1">📱 {agendamentoSelecionado.cliente_telefone}</div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-500">Profissional</div>
                  <div className="font-medium">{agendamentoSelecionado.profissional_nome}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-500">Serviço</div>
                  <div className="font-medium">{agendamentoSelecionado.servico_nome}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-500">Unidade</div>
                  <div className="font-medium">{agendamentoSelecionado.unidade_nome}</div>
                  {agendamentoSelecionado.sala && <div className="text-sm text-gray-600">Sala {agendamentoSelecionado.sala}</div>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-500">Data</div>
                  <div className="font-medium">{formatarDataExibicao(agendamentoSelecionado.data)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-500">Horário</div>
                  <div className="font-medium">{agendamentoSelecionado.hora_inicio} - {agendamentoSelecionado.hora_fim}</div>
                </div>
              </div>

              {agendamentoSelecionado.vendedor_nome && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Vendedor</div>
                    <div className="font-medium">{agendamentoSelecionado.vendedor_nome}</div>
                  </div>
                </div>
              )}

              {agendamentoSelecionado.health_score && (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                    {agendamentoSelecionado.health_score === "insatisfeito" && "😡"}
                    {agendamentoSelecionado.health_score === "neutro" && "😑"}
                    {agendamentoSelecionado.health_score === "recuperado" && "🩹"}
                    {agendamentoSelecionado.health_score === "satisfeito" && "😁"}
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Health Score</div>
                    <div className="font-medium">
                      {agendamentoSelecionado.health_score === "insatisfeito" && "😡 INSATISFEITO"}
                      {agendamentoSelecionado.health_score === "neutro" && "😑 NEUTRO"}
                      {agendamentoSelecionado.health_score === "recuperado" && "🩹 RECUPERADO"}
                      {agendamentoSelecionado.health_score === "satisfeito" && "😁 SATISFEITO"}
                    </div>
                  </div>
                </div>
              )}

              {agendamentoSelecionado.observacoes && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Observações</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{agendamentoSelecionado.observacoes}</div>
                  </div>
                </div>
              )}

              {agendamentoSelecionado.observacoes_vendedores && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Obs. Vendedores</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{agendamentoSelecionado.observacoes_vendedores}</div>
                  </div>
                </div>
              )}

              {agendamentoSelecionado.observacoes_terapeuta && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Obs. Terapeuta</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{agendamentoSelecionado.observacoes_terapeuta}</div>
                  </div>
                </div>
              )}

              {agendamentoSelecionado.observacoes_recepcionista && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Obs. Recepcionista</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{agendamentoSelecionado.observacoes_recepcionista}</div>
                  </div>
                </div>
              )}

              {agendamentoSelecionado.observacoes_pos_venda && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Obs. Pós Venda</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{agendamentoSelecionado.observacoes_pos_venda}</div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-blue-600 font-medium">Criado por</div>
                      <div className="text-sm text-blue-800">{agendamentoSelecionado.criador_email || "Não disponível"}</div>
                      {agendamentoSelecionado.created_date && (
                        <div className="text-xs text-blue-600 mt-1">
                          {new Date(agendamentoSelecionado.created_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        </div>
                      )}
                    </div>
                  </div>
                  {agendamentoSelecionado.editor_email && agendamentoSelecionado.editor_email !== agendamentoSelecionado.criador_email && (
                    <div className="flex items-start gap-3 pt-2 border-t border-blue-200">
                      <User className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-blue-600 font-medium">Última edição por</div>
                        <div className="text-sm text-blue-800">{agendamentoSelecionado.editor_email}</div>
                        {agendamentoSelecionado.updated_date && (
                          <div className="text-xs text-blue-600 mt-1">
                            {new Date(agendamentoSelecionado.updated_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
          <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-3 block">Cliente ou Telefone</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Buscar cliente ou telefone..."
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

          {filters.cliente && agendamentosCliente.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Agendamentos Encontrados ({agendamentosCliente.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {agendamentosCliente.slice(0, 10).map(ag => (
                  <button
                    key={ag.id}
                    onClick={() => setAgendamentoSelecionado(ag)}
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
        )}
      </div>

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
              />
    </div>
  );
}