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
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Função para formatar data sem problemas de timezone
const formatarDataLocal = (data) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

// Função para criar data local sem conversão de timezone
const criarDataLocal = (dataString) => {
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
  servicos = []
}) {
  const [formData, setFormData] = useState({
    cliente_id: "",
    cliente_nome: "",
    profissional_id: "",
    profissional_nome: "",
    servico_id: "",
    servico_nome: "",
    unidade_id: "",
    unidade_nome: "",
    data: formatarDataLocal(new Date()),
    hora_inicio: "09:00",
    hora_fim: "10:00",
    status: "agendado",
    tipo: "consulta",
    observacoes: "",
    sala: "",
    equipamento: ""
  });

  useEffect(() => {
    if (open) {
      setFormData({
        cliente_id: agendamentoInicial.cliente_id || "",
        cliente_nome: agendamentoInicial.cliente_nome || "",
        profissional_id: agendamentoInicial.profissional_id || "",
        profissional_nome: agendamentoInicial.profissional_nome || "",
        servico_id: agendamentoInicial.servico_id || "",
        servico_nome: agendamentoInicial.servico_nome || "",
        unidade_id: agendamentoInicial.unidade_id || "",
        unidade_nome: agendamentoInicial.unidade_nome || "",
        data: agendamentoInicial.data || formatarDataLocal(new Date()),
        hora_inicio: agendamentoInicial.hora_inicio || "09:00",
        hora_fim: agendamentoInicial.hora_fim || "10:00",
        status: agendamentoInicial.status || "agendado",
        tipo: agendamentoInicial.tipo || "consulta",
        observacoes: agendamentoInicial.observacoes || "",
        sala: agendamentoInicial.sala || "",
        equipamento: agendamentoInicial.equipamento || ""
      });
    }
  }, [open, agendamentoInicial]);

  const handleClienteChange = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      cliente_nome: cliente ? cliente.nome : ""
    }));
  };

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
      const dataFormatada = formatarDataLocal(date);
      console.log("=== DIALOG - DATA SELECIONADA ===");
      console.log("Date object:", date);
      console.log("Data formatada (YYYY-MM-DD):", dataFormatada);
      setFormData(prev => ({ ...prev, data: dataFormatada }));
    }
  };

  const handleSubmit = () => {
    console.log("=== DIALOG - SALVANDO AGENDAMENTO ===");
    console.log("Data (string YYYY-MM-DD):", formData.data);
    console.log("Dados completos:", formData);
    onSave(formData);
    onOpenChange(false);
  };

  const dataSelecionada = formData.data ? criarDataLocal(formData.data) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={formData.cliente_id} onValueChange={handleClienteChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(cliente => (
                  <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select value={formData.servico_id} onValueChange={handleServicoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {servicos.map(servico => (
                  <SelectItem key={servico.id} value={servico.id}>{servico.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  {formData.data ? format(criarDataLocal(formData.data), "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dataSelecionada}
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
            <Label>Sala</Label>
            <Input
              value={formData.sala}
              onChange={(e) => setFormData(prev => ({ ...prev, sala: e.target.value }))}
              placeholder="Ex: Sala 1"
            />
          </div>

          <div className="space-y-2">
            <Label>Equipamento</Label>
            <Input
              value={formData.equipamento}
              onChange={(e) => setFormData(prev => ({ ...prev, equipamento: e.target.value }))}
              placeholder="Equipamento necessário"
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.cliente_nome || !formData.profissional_nome || !formData.unidade_id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Salvar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}