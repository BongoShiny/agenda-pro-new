import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Mesma lógica de data em todos os componentes
const formatarDataPura = (data) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const criarDataPura = (dataString) => {
  if (!dataString || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
    return new Date();
  }
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function NovoAgendamentoDialog({
  open,
  onOpenChange,
  onSave,
  agendamentoInicial = {},
  clientes = [],
  profissionais = [],
  unidades = [],
  servicos = [],
  modoEdicao = false,
  agendamentos = []
}) {
  // unidades já vem filtradas da página principal
  const [formData, setFormData] = useState({
    cliente_id: "",
    cliente_nome: "",
    cliente_telefone: "",
    profissional_id: "",
    profissional_nome: "",
    servico_id: "",
    servico_nome: "",
    unidade_id: "",
    unidade_nome: "",
    data: formatarDataPura(new Date()),
    hora_inicio: "09:00",
    hora_fim: "10:00",
    status: "agendado",
    tipo: "consulta",
    observacoes: "",
    sala: "",
    equipamento: "",
    status_paciente: ""
  });

  const [clientePopoverAberto, setClientePopoverAberto] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [erroHorarioBloqueado, setErroHorarioBloqueado] = useState(false);

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  useEffect(() => {
    if (open) {
      const dados = {
        id: agendamentoInicial.id || undefined,
        cliente_id: agendamentoInicial.cliente_id || "",
        cliente_nome: agendamentoInicial.cliente_nome || "",
        cliente_telefone: agendamentoInicial.cliente_telefone || "",
        profissional_id: agendamentoInicial.profissional_id || "",
        profissional_nome: agendamentoInicial.profissional_nome || "",
        servico_id: agendamentoInicial.servico_id || "",
        servico_nome: agendamentoInicial.servico_nome || "",
        unidade_id: agendamentoInicial.unidade_id || "",
        unidade_nome: agendamentoInicial.unidade_nome || "",
        data: agendamentoInicial.data || formatarDataPura(new Date()),
        hora_inicio: agendamentoInicial.hora_inicio || "09:00",
        hora_fim: agendamentoInicial.hora_fim || "10:00",
        status: agendamentoInicial.status || "agendado",
        tipo: agendamentoInicial.tipo || "consulta",
        observacoes: agendamentoInicial.observacoes || "",
        sala: agendamentoInicial.sala || "",
        equipamento: agendamentoInicial.equipamento || "",
        status_paciente: agendamentoInicial.status_paciente || "",
        valor_combinado: agendamentoInicial.valor_combinado || null,
        valor_pago: agendamentoInicial.valor_pago || null,
        falta_quanto: agendamentoInicial.falta_quanto || null,
        vendedor_id: agendamentoInicial.vendedor_id || "",
        vendedor_nome: agendamentoInicial.vendedor_nome || ""
      };
      
      console.log("📝 DIALOG ABERTO | Modo:", modoEdicao ? "EDIÇÃO" : "NOVO", "| Data:", dados.data);
      setFormData(dados);
      setBuscaCliente(dados.cliente_nome);
    }
  }, [open, agendamentoInicial, modoEdicao]);

  const handleClienteChange = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        cliente_id: clienteId,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone || ""
      }));
      setBuscaCliente(cliente.nome);
      setClientePopoverAberto(false);
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const handleProfissionalChange = (profId) => {
    const prof = profissionais.find(p => p.id === profId);
    setFormData(prev => ({
      ...prev,
      profissional_id: profId,
      profissional_nome: prof ? prof.nome : ""
    }));
  };

  const handleServicoChange = (servicoId) => {
    const servico = servicos.find(s => s.id === servicoId);
    setFormData(prev => ({
      ...prev,
      servico_id: servicoId,
      servico_nome: servico ? servico.nome : ""
    }));
  };

  const handleUnidadeChange = (unidadeId) => {
    const unidade = unidades.find(u => u.id === unidadeId);
    setFormData(prev => ({
      ...prev,
      unidade_id: unidadeId,
      unidade_nome: unidade ? unidade.nome : ""
    }));
  };

  const handleDataChange = (date) => {
    if (date) {
      const dataFormatada = formatarDataPura(date);
      console.log("📅 DIALOG - Data selecionada:", dataFormatada, "| Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
      setFormData(prev => ({ ...prev, data: dataFormatada }));
    }
  };

  const handleSubmit = () => {
    console.log("💾 DIALOG - Salvando com data:", formData.data);
    
    // Verificar se há bloqueio que SOBREPÕE com o horário selecionado
    const [horaInicioNum, minInicioNum] = formData.hora_inicio.split(':').map(Number);
    const [horaFimNum, minFimNum] = formData.hora_fim.split(':').map(Number);
    const inicioMinutos = horaInicioNum * 60 + minInicioNum;
    const fimMinutos = horaFimNum * 60 + minFimNum;
    
    const horarioBloqueado = agendamentos.find(ag => {
      if (ag.data !== formData.data) return false;
      if (ag.profissional_id !== formData.profissional_id) return false;
      if (ag.unidade_id !== formData.unidade_id) return false;
      if (!(ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO")) return false;
      if (ag.id === formData.id) return false;
      
      // Verificar sobreposição de horários
      const [agHoraInicio, agMinInicio] = ag.hora_inicio.split(':').map(Number);
      const [agHoraFim, agMinFim] = ag.hora_fim.split(':').map(Number);
      const agInicioMinutos = agHoraInicio * 60 + agMinInicio;
      const agFimMinutos = agHoraFim * 60 + agMinFim;
      
      // Verifica se há sobreposição: início antes do fim do bloqueio E fim depois do início do bloqueio
      return (inicioMinutos < agFimMinutos && fimMinutos > agInicioMinutos);
    });

    if (horarioBloqueado) {
      setErroHorarioBloqueado(true);
      setTimeout(() => setErroHorarioBloqueado(false), 3000);
      return;
    }
    
    // Calcular automaticamente falta_quanto
    const valorCombinado = formData.valor_combinado || 0;
    const valorPago = formData.valor_pago || 0;
    const dadosComCalculo = {
      ...formData,
      falta_quanto: valorCombinado - valorPago
    };
    
    onSave(dadosComCalculo);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modoEdicao ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Popover open={clientePopoverAberto} onOpenChange={setClientePopoverAberto}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Search className="mr-2 h-4 w-4" />
                  {buscaCliente || "Digite ou selecione o cliente"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Digite o nome do cliente..." 
                    value={buscaCliente}
                    onValueChange={(value) => {
                      setBuscaCliente(value);
                      setFormData(prev => ({ ...prev, cliente_nome: value, cliente_id: "" }));
                    }}
                  />
                  <CommandEmpty>
                    <div className="p-4 text-sm">
                      <p className="mb-2">Cliente não encontrado.</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, cliente_nome: buscaCliente, cliente_id: "" }));
                          setClientePopoverAberto(false);
                        }}
                      >
                        Usar "{buscaCliente}"
                      </Button>
                    </div>
                  </CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-y-auto">
                    {clientesFiltrados.map(cliente => (
                      <CommandItem
                        key={cliente.id}
                        value={cliente.nome}
                        onSelect={() => handleClienteChange(cliente.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{cliente.nome}</span>
                          {cliente.telefone && (
                            <span className="text-xs text-gray-500">{cliente.telefone}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Telefone do Cliente</Label>
            <Input
              value={formData.cliente_telefone}
              onChange={(e) => setFormData(prev => ({ ...prev, cliente_telefone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label>Profissional *</Label>
            <Select value={formData.profissional_id} onValueChange={handleProfissionalChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map(prof => (
                  <SelectItem key={prof.id} value={prof.id}>{prof.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Serviço *</Label>
            <Input
              value={formData.servico_nome}
              onChange={(e) => setFormData(prev => ({ ...prev, servico_nome: e.target.value, servico_id: "" }))}
              placeholder="Digite o serviço (ex: Liberação Miofascial)"
            />
          </div>

          <div className="space-y-2">
            <Label>Unidade *</Label>
            <Select value={formData.unidade_id} onValueChange={handleUnidadeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map(unidade => (
                  <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.data ? format(criarDataPura(formData.data), "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={criarDataPura(formData.data)}
                  onSelect={handleDataChange}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Horário *</Label>
            <div className="flex gap-2">
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
              />
              <span className="flex items-center">até</span>
              <Input
                type="time"
                value={formData.hora_fim}
                onChange={(e) => setFormData(prev => ({ ...prev, hora_fim: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="ausencia">Ausência</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="liberacao_miofascial">Liberação Miofascial</SelectItem>
                <SelectItem value="pacote">Pacote</SelectItem>
                <SelectItem value="avaliacao">Avaliação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status do Paciente</Label>
            <Select value={formData.status_paciente || ""} onValueChange={(value) => setFormData(prev => ({ ...prev, status_paciente: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>-</SelectItem>
                <SelectItem value="paciente_novo">Paciente Novo</SelectItem>
                <SelectItem value="ultima_sessao">Última Sessão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vendedor</Label>
            <Select value={formData.vendedor_id || ""} onValueChange={(value) => {
              const vendedor = vendedores.find(v => v.id === value);
              setFormData(prev => ({ 
                ...prev, 
                vendedor_id: value,
                vendedor_nome: vendedor?.nome || ""
              }));
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Sem vendedor</SelectItem>
                {vendedores.filter(v => v.ativo).map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Equipamento</Label>
            <Select value={formData.equipamento || ""} onValueChange={(value) => setFormData(prev => ({ ...prev, equipamento: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o equipamento..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVULSA">AVULSA</SelectItem>
                <SelectItem value="FUNCIONÁRIO">FUNCIONÁRIO</SelectItem>
                <SelectItem value="PACOTE">PACOTE</SelectItem>
                <SelectItem value="PACOTE DE OUTRO CLIENTE">PACOTE DE OUTRO CLIENTE</SelectItem>
                <SelectItem value="PRIMEIRA SESSÃO DO PACOTE">PRIMEIRA SESSÃO DO PACOTE</SelectItem>
                <SelectItem value="ÚLTIMA SESSÃO DO PACOTE">ÚLTIMA SESSÃO DO PACOTE</SelectItem>
                <SelectItem value="VOUCHER">VOUCHER</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor Combinado</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={formData.valor_combinado || ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                valor_combinado: e.target.value ? parseFloat(e.target.value) : null 
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Pago</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={formData.valor_pago || ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                valor_pago: e.target.value ? parseFloat(e.target.value) : null 
              }))}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais"
              rows={3}
            />
          </div>
        </div>

        {erroHorarioBloqueado && (
          <div className="bg-red-100 border-2 border-red-600 rounded-lg p-4 text-center animate-pulse">
            <div className="text-red-800 font-bold text-lg mb-2">
              🚫 HORÁRIO BLOQUEADO
            </div>
            <div className="text-red-700 text-sm">
              Este horário está bloqueado e não pode ser agendado
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.cliente_nome || !formData.profissional_nome || !formData.unidade_id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {modoEdicao ? "Salvar Alterações" : "Salvar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}