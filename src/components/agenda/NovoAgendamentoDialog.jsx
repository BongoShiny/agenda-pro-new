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
import { Calendar as CalendarIcon, Search, Upload, X } from "lucide-react";
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
  agendamentos = [],
  isTerapeuta = false,
  excecoesHorario = [],
  configuracoesTerapeutaSabado = []
}) {
  const [formData, setFormData] = useState({
     cliente_id: "",
     cliente_nome: "",
     cliente_telefone: "",
     profissional_id: "",
     profissional_nome: "",
     servicos_selecionados: [],
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
    status_paciente: "",
    health_score: "",
    valor_combinado: null,
    sinal: null,
    recebimento_2: null,
    final_pagamento: null,
    falta_quanto: null,
    forma_pagamento: "-",
    vendedor_id: "",
    vendedor_nome: "",
    comprovante_1: "",
    comprovante_2: "",
    comprovante_3: "",
    comprovante_4: "",
    comprovante_5: "",
    cliente_pacote: "Não",
    quantas_sessoes: null,
    sessoes_feitas: null
  });

  const [clientePopoverAberto, setClientePopoverAberto] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [erroHorarioBloqueado, setErroHorarioBloqueado] = useState(false);
  const [erroHorarioOcupado, setErroHorarioOcupado] = useState(false);
  const [erroHorarioFechado, setErroHorarioFechado] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);

  const { data: vendedores = [] } = useQuery({
     queryKey: ['vendedores'],
     queryFn: () => base44.entities.Vendedor.list("nome"),
     initialData: [],
   });

   const { data: configuracoesTerapeutas = [] } = useQuery({
     queryKey: ['configuracoes-terapeutas', formData.unidade_id],
     queryFn: async () => {
       if (!formData.unidade_id) return [];
       try {
         return await base44.entities.ConfiguracaoTerapeuta.filter({
           unidade_id: formData.unidade_id,
           ativo: true
         }, "ordem");
       } catch (error) {
         console.error("Erro ao buscar configurações:", error);
         return [];
       }
     },
     enabled: !!formData.unidade_id,
   });

   // Filtrar profissionais pela unidade selecionada
   const profissionaisFiltrados = React.useMemo(() => {
     if (!formData.unidade_id) return profissionais.filter(p => p.ativo !== false);

     const idsConfiguracao = configuracoesTerapeutas.map(ct => ct.profissional_id);
     return profissionais.filter(p => 
       idsConfiguracao.includes(p.id) && p.ativo !== false
     );
   }, [profissionais, formData.unidade_id, configuracoesTerapeutas]);

  // Buscar pacote ativo do cliente selecionado
  const { data: pacoteCliente } = useQuery({
    queryKey: ['pacote-cliente', formData.cliente_id],
    queryFn: async () => {
      try {
        if (!formData.cliente_id) return null;
        
        const agendamentosCliente = await base44.entities.Agendamento.filter({
          cliente_id: formData.cliente_id,
          cliente_pacote: "Sim"
        });

        const pacoteAtivo = agendamentosCliente
          .filter(ag => {
            const sessoes = ag.quantas_sessoes || 0;
            const feitas = ag.sessoes_feitas || 0;
            return feitas < sessoes;
          })
          .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))[0];

        return pacoteAtivo || null;
      } catch (error) {
        console.error("Erro ao buscar pacote do cliente:", error);
        return null;
      }
    },
    enabled: !!formData.cliente_id && !modoEdicao && open,
    retry: false,
  });

  useEffect(() => {
    if (open) {
      try {
        const dados = {
          id: agendamentoInicial?.id || undefined,
          cliente_id: agendamentoInicial?.cliente_id || "",
          cliente_nome: agendamentoInicial?.cliente_nome || "",
          cliente_telefone: agendamentoInicial?.cliente_telefone || "",
          profissional_id: agendamentoInicial?.profissional_id || "",
          profissional_nome: agendamentoInicial?.profissional_nome || "",
          servicos_selecionados: agendamentoInicial?.servico_nome ? [agendamentoInicial.servico_nome] : [],
          unidade_id: agendamentoInicial?.unidade_id || "",
          unidade_nome: agendamentoInicial?.unidade_nome || "",
          data: agendamentoInicial?.data || formatarDataPura(new Date()),
          hora_inicio: agendamentoInicial?.hora_inicio || "09:00",
          hora_fim: agendamentoInicial?.hora_fim || "10:00",
          status: agendamentoInicial?.status || "agendado",
          tipo: agendamentoInicial?.tipo || "consulta",
          observacoes: agendamentoInicial?.observacoes || "",
          observacoes_vendedores: agendamentoInicial?.observacoes_vendedores || "",
          observacoes_terapeuta: agendamentoInicial?.observacoes_terapeuta || "",
          observacoes_recepcionista: agendamentoInicial?.observacoes_recepcionista || "",
          observacoes_pos_venda: agendamentoInicial?.observacoes_pos_venda || "",
          sala: agendamentoInicial?.sala || "",
          equipamento: agendamentoInicial?.equipamento || "",
          status_paciente: agendamentoInicial?.status_paciente || "",
          health_score: agendamentoInicial?.health_score || "",
          valor_combinado: agendamentoInicial?.valor_combinado || null,
          sinal: agendamentoInicial?.sinal || null,
          recebimento_2: agendamentoInicial?.recebimento_2 || null,
          final_pagamento: agendamentoInicial?.final_pagamento || null,
          falta_quanto: agendamentoInicial?.falta_quanto || null,
          vendedor_id: agendamentoInicial?.vendedor_id || "",
          vendedor_nome: agendamentoInicial?.vendedor_nome || "",
          comprovante_1: agendamentoInicial?.comprovante_1 || "",
          comprovante_2: agendamentoInicial?.comprovante_2 || "",
          comprovante_3: agendamentoInicial?.comprovante_3 || "",
          comprovante_4: agendamentoInicial?.comprovante_4 || "",
          comprovante_5: agendamentoInicial?.comprovante_5 || "",
          cliente_pacote: agendamentoInicial?.cliente_pacote || "Não",
          quantas_sessoes: agendamentoInicial?.quantas_sessoes || null,
          sessoes_feitas: agendamentoInicial?.sessoes_feitas || null,
          forma_pagamento: agendamentoInicial?.forma_pagamento || "-"
          };
        
        setFormData(dados);
        setBuscaCliente(dados.cliente_nome);
      } catch (error) {
        console.error("Erro ao inicializar formulário:", error);
      }
    }
  }, [open]);

  // Sincronizar dados de pacote quando cliente é selecionado e tem pacote ativo
  useEffect(() => {
    if (pacoteCliente && !modoEdicao && open) {
      console.log("🔄 Sincronizando pacote do cliente:", pacoteCliente);
      
      setFormData(prev => ({
        ...prev,
        cliente_pacote: "Sim",
        quantas_sessoes: pacoteCliente.quantas_sessoes || prev.quantas_sessoes,
        sessoes_feitas: (pacoteCliente.sessoes_feitas || 0) + 1, // Incrementar para próxima sessão
        tipo: "pacote"
      }));
    }
  }, [pacoteCliente, modoEdicao, open]);

  // Sincronizar cliente automaticamente pelo telefone
  useEffect(() => {
    if (!formData.cliente_telefone || formData.cliente_id) return;
    
    // Limpar telefone para comparação (apenas números)
    const telefoneLimpo = formData.cliente_telefone.replace(/\D/g, '');
    
    // Só buscar se tiver pelo menos 10 dígitos
    if (telefoneLimpo.length < 10) return;
    
    // Buscar cliente com esse telefone
    const clienteEncontrado = clientes.find(c => {
      if (!c.telefone) return false;
      const telefoneClienteLimpo = c.telefone.replace(/\D/g, '');
      return telefoneClienteLimpo === telefoneLimpo;
    });
    
    if (clienteEncontrado) {
      setFormData(prev => ({
        ...prev,
        cliente_id: clienteEncontrado.id,
        cliente_nome: clienteEncontrado.nome,
        cliente_telefone: clienteEncontrado.telefone
      }));
      setBuscaCliente(clienteEncontrado.nome);
    }
  }, [formData.cliente_telefone, clientes]);

  // Calcular automaticamente falta_quanto - SEM causar loop
  useEffect(() => {
    try {
      const combinado = parseFloat(formData.valor_combinado) || 0;
      const sinal = parseFloat(formData.sinal) || 0;
      const recebimento2 = parseFloat(formData.recebimento_2) || 0;
      const finalPagamento = parseFloat(formData.final_pagamento) || 0;
      const totalPago = sinal + recebimento2 + finalPagamento;
      const faltaCalculada = combinado - totalPago;
      
      // Só atualizar se o valor mudou (evita loop infinito)
      if (formData.falta_quanto !== faltaCalculada) {
        setFormData(prev => ({ ...prev, falta_quanto: faltaCalculada }));
      }
    } catch (error) {
      console.error("Erro ao calcular falta_quanto:", error);
    }
  }, [formData.valor_combinado, formData.sinal, formData.recebimento_2, formData.final_pagamento]);

  const handleClienteChange = (clienteId) => {
    try {
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
    } catch (error) {
      console.error("Erro ao selecionar cliente:", error);
    }
  };

  const clientesFiltrados = React.useMemo(() => {
    try {
      return clientes.filter(c => 
        c?.nome?.toLowerCase().includes(buscaCliente.toLowerCase())
      );
    } catch (error) {
      console.error("Erro ao filtrar clientes:", error);
      return [];
    }
  }, [clientes, buscaCliente]);

  const handleProfissionalChange = (profId) => {
    try {
      const prof = profissionais.find(p => p.id === profId);
      setFormData(prev => ({
        ...prev,
        profissional_id: profId,
        profissional_nome: prof ? prof.nome : ""
      }));
    } catch (error) {
      console.error("Erro ao selecionar profissional:", error);
    }
  };

  const handleServicoChange = (servicoId) => {
     if (servicoId === "LIMPAR_SERVICOS") {
       setFormData(prev => ({
         ...prev,
         servicos_selecionados: []
       }));
       return;
     }

     const servico = servicos.find(s => s.id === servicoId);
     if (servico) {
       setFormData(prev => ({
         ...prev,
         servicos_selecionados: [...prev.servicos_selecionados, servico.nome]
       }));
     }
   };

   const handleRemoveServico = (index) => {
     setFormData(prev => ({
       ...prev,
       servicos_selecionados: prev.servicos_selecionados.filter((_, i) => i !== index)
     }));
   };

  const handleUnidadeChange = (unidadeId) => {
    try {
      const unidade = unidades.find(u => u.id === unidadeId);
      setFormData(prev => ({
        ...prev,
        unidade_id: unidadeId,
        unidade_nome: unidade ? unidade.nome : ""
      }));
    } catch (error) {
      console.error("Erro ao selecionar unidade:", error);
    }
  };

  const handleDataChange = (date) => {
    try {
      if (date) {
        const dataFormatada = formatarDataPura(date);
        setFormData(prev => ({ ...prev, data: dataFormatada }));
      }
    } catch (error) {
      console.error("Erro ao mudar data:", error);
    }
  };

  const handleFileUpload = async (e, numeroComprovante) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(numeroComprovante);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const campoComprovante = `comprovante_${numeroComprovante}`;
      setFormData(prev => ({ ...prev, [campoComprovante]: file_url }));
      
      alert("✅ Comprovante enviado com sucesso!");
    } catch (error) {
      alert("❌ Erro ao enviar comprovante: " + error.message);
    } finally {
      setUploadingFile(null);
    }
  };

  const handleSubmit = () => {
     try {
       // Preparar dados do serviço para salvamento
       const dataToSave = {
         ...formData,
         servico_id: formData.servicos_selecionados[0] || "",
         servico_nome: formData.servicos_selecionados.join(" + ")
       };

       // Remover campo temporário antes de salvar
       delete dataToSave.servicos_selecionados;

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

        const [agHoraInicio, agMinInicio] = ag.hora_inicio.split(':').map(Number);
        const [agHoraFim, agMinFim] = ag.hora_fim.split(':').map(Number);
        const agInicioMinutos = agHoraInicio * 60 + agMinInicio;
        const agFimMinutos = agHoraFim * 60 + agMinFim;

        return (inicioMinutos < agFimMinutos && fimMinutos > agInicioMinutos);
      });

      if (horarioBloqueado) {
        setErroHorarioBloqueado(true);
        setTimeout(() => setErroHorarioBloqueado(false), 3000);
        return;
      }

      // ✅ Verificar se JÁ HÁ OUTRO AGENDAMENTO neste horário/profissional/unidade (qualquer cliente)
      const horarioOcupado = agendamentos.find(ag => {
        if (ag.data !== dataToSave.data) return false;
        if (ag.profissional_id !== dataToSave.profissional_id) return false;
        if (ag.unidade_id !== dataToSave.unidade_id) return false;
        if (ag.id === dataToSave.id) return false;
        if (ag.status === "cancelado") return false;
        if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") return false;

        const [agHoraInicio, agMinInicio] = ag.hora_inicio.split(':').map(Number);
        const [agHoraFim, agMinFim] = ag.hora_fim.split(':').map(Number);
        const agInicioMinutos = agHoraInicio * 60 + agMinInicio;
        const agFimMinutos = agHoraFim * 60 + agMinFim;

        return (inicioMinutos < agFimMinutos && fimMinutos > agInicioMinutos);
      });

      if (horarioOcupado) {
        setErroHorarioOcupado(true);
        setTimeout(() => setErroHorarioOcupado(false), 4000);
        return;
      }

      // Verificar se horário está dentro do expediente do profissional (considerando exceções e sábados)
      const profissional = profissionais.find(p => p.id === formData.profissional_id);
      if (profissional && formData.data) {
        // Verificar se é sábado
        const dataSelecionada = new Date(formData.data + 'T12:00:00');
        const isSabado = dataSelecionada.getDay() === 6;

        // Buscar exceção de horário para esta data (EXCETO almoço)
        const excecao = excecoesHorario.find(e => 
          e.profissional_id === profissional.id && 
          e.data === formData.data &&
          e.motivo !== "Horário de Almoço"
        );

        let horarioInicio, horarioFim;
        
        if (excecao) {
          // Usar horário da exceção
          horarioInicio = excecao.horario_inicio;
          horarioFim = excecao.horario_fim;
          
          // Se é folga (00:00 - 00:00), bloquear
          if (horarioInicio === "00:00" && horarioFim === "00:00") {
            setErroHorarioFechado(true);
            setTimeout(() => setErroHorarioFechado(false), 3000);
            return;
          }
        } else if (isSabado) {
          // Se é sábado, verificar configuração específica
          const configSabado = configuracoesTerapeutaSabado.find(c => 
            c.profissional_id === profissional.id &&
            c.unidade_id === formData.unidade_id &&
            (c.data_sabado === formData.data || !c.data_sabado || c.data_sabado === "") &&
            c.ativo
          );

          if (configSabado) {
            // Tem configuração de sábado, usar esse horário
            horarioInicio = configSabado.horario_inicio || "08:00";
            horarioFim = configSabado.horario_fim || "18:00";
          } else {
            // Não tem configuração de sábado = não trabalha
            setErroHorarioFechado(true);
            setTimeout(() => setErroHorarioFechado(false), 3000);
            return;
          }
        } else {
          // Usar horário padrão
          horarioInicio = profissional.horario_inicio || "08:00";
          horarioFim = profissional.horario_fim || "18:00";
        }

        const [profHoraInicio, profMinInicio] = horarioInicio.split(':').map(Number);
        const [profHoraFim, profMinFim] = horarioFim.split(':').map(Number);
        const profInicioMinutos = profHoraInicio * 60 + profMinInicio;
        const profFimMinutos = profHoraFim * 60 + profMinFim;

        if (inicioMinutos < profInicioMinutos || fimMinutos > profFimMinutos) {
          setErroHorarioFechado(true);
          setTimeout(() => setErroHorarioFechado(false), 3000);
          return;
        }
      }

      onSave(dataToSave);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      alert("Erro ao salvar agendamento. Por favor, tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

          {!isTerapeuta && (
            <div className="space-y-2">
              <Label>Telefone do Cliente</Label>
              <Input
                value={formData.cliente_telefone || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, cliente_telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          )}

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
            <Label>Profissional *</Label>
            <Select value={formData.profissional_id} onValueChange={handleProfissionalChange} disabled={!formData.unidade_id}>
              <SelectTrigger>
                <SelectValue placeholder={formData.unidade_id ? "Selecione o profissional" : "Selecione uma unidade primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {profissionaisFiltrados.map(prof => (
                  <SelectItem key={prof.id} value={prof.id}>{prof.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Serviço(s) *</Label>
            <Select onValueChange={handleServicoChange} value="">
              <SelectTrigger>
                <SelectValue placeholder="Clique para adicionar serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIMPAR_SERVICOS" className="bg-red-50 text-red-700 font-bold">
                  🗑️ LIMPAR SERVIÇOS
                </SelectItem>
                {servicos.map(servico => (
                  <SelectItem key={servico.id} value={servico.id}>
                    {servico.nome.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.servicos_selecionados.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  {formData.servicos_selecionados.join(" + ")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {formData.servicos_selecionados.map((servico, index) => (
                    <button
                      key={index}
                      onClick={() => handleRemoveServico(index)}
                      className="inline-flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                    >
                      {servico}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            <Select 
              value={formData.tipo} 
              onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  tipo: value,
                  cliente_pacote: value === "pacote" ? "Sim" : prev.cliente_pacote
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="pacote">Pacote</SelectItem>
                <SelectItem value="avaliacao">Avaliação</SelectItem>
                <SelectItem value="avulsa">Avulsa</SelectItem>
                <SelectItem value="funcionario">Funcionário</SelectItem>
                <SelectItem value="pacote_outro_cliente">Pacote de Outro Cliente</SelectItem>
                <SelectItem value="primeira_sessao_pacote">Primeira Sessão do Pacote</SelectItem>
                <SelectItem value="ultima_sessao_pacote">Última Sessão do Pacote</SelectItem>
                <SelectItem value="voucher">Voucher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo === "pacote" && (
            <>
              <div className="space-y-2">
                <Label>Cliente tem Pacote?</Label>
                <Select 
                  value={formData.cliente_pacote} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_pacote: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {formData.tipo === "pacote" && formData.cliente_pacote === "Sim" && (
            <>
              <div className="space-y-2">
                <Label>Quantas Sessões (total do pacote)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 10"
                  value={formData.quantas_sessoes || ""}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    quantas_sessoes: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                />
                {pacoteCliente && !modoEdicao && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    ℹ️ Sincronizado automaticamente do pacote anterior do cliente
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sessões Feitas</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 3"
                  value={formData.sessoes_feitas || ""}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    sessoes_feitas: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                />
                {formData.quantas_sessoes && (
                  <p className="text-xs text-gray-500">
                    {formData.sessoes_feitas || 0} de {formData.quantas_sessoes} sessões realizadas
                    {formData.sessoes_feitas >= formData.quantas_sessoes && (
                      <span className="text-green-600 font-bold ml-2">✅ PACOTE CONCLUÍDO</span>
                    )}
                  </p>
                )}
              </div>
            </>
          )}

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
            <Label>Forma de Pagamento</Label>
            <Select value={formData.forma_pagamento || "-"} onValueChange={(value) => setFormData(prev => ({ ...prev, forma_pagamento: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">-</SelectItem>
                <SelectItem value="pago_na_clinica">💳 Pago na Clínica</SelectItem>
                <SelectItem value="pix">📱 PIX</SelectItem>
                <SelectItem value="link_pagamento">🔗 Link de Pagamento</SelectItem>
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
            <Label>Sinal</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={formData.sinal || ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                sinal: e.target.value ? parseFloat(e.target.value) : null 
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Recebimento 2</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={formData.recebimento_2 || ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                recebimento_2: e.target.value ? parseFloat(e.target.value) : null 
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Final de Pagamento</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={formData.final_pagamento || ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                final_pagamento: e.target.value ? parseFloat(e.target.value) : null 
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Falta Quanto</Label>
            <Input
              type="text"
              placeholder="R$ 0,00"
              value={
                formData.falta_quanto > 0 
                  ? `+${formData.falta_quanto}` 
                  : formData.falta_quanto < 0 
                    ? `PAGO A MAIS R$${Math.abs(formData.falta_quanto)}`
                    : (formData.falta_quanto || "")
              }
              readOnly
              className="bg-gray-100"
            />
          </div>

          <div className="col-span-2 space-y-3">
            <Label>Anexar Comprovantes (até 5)</Label>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(num => (
                <div key={num}>
                  <Label className="text-xs text-gray-500">Comprovante {num}</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, num)}
                    disabled={uploadingFile === num}
                  />
                  {uploadingFile === num && (
                    <p className="text-xs text-blue-600 mt-1">Enviando...</p>
                  )}
                  {formData[`comprovante_${num}`] && (
                    <Button
                      type="button"
                      variant="link"
                      className="text-xs p-0 h-auto mt-1"
                      onClick={() => window.open(formData[`comprovante_${num}`], '_blank')}
                    >
                      Ver comprovante {num}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais"
              rows={2}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Observações Vendedores</Label>
            <Textarea
              value={formData.observacoes_vendedores || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes_vendedores: e.target.value }))}
              placeholder="Observações exclusivas dos vendedores"
              rows={2}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Observações Terapeuta</Label>
            <Textarea
              value={formData.observacoes_terapeuta || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes_terapeuta: e.target.value }))}
              placeholder="Observações exclusivas do terapeuta"
              rows={2}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Observações Recepcionista</Label>
            <Textarea
              value={formData.observacoes_recepcionista || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes_recepcionista: e.target.value }))}
              placeholder="Observações exclusivas da recepcionista"
              rows={2}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Observações Pós Venda</Label>
            <Textarea
              value={formData.observacoes_pos_venda || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes_pos_venda: e.target.value }))}
              placeholder="Observações exclusivas do pós venda"
              rows={2}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Health Score do Cliente</Label>
            <Select value={formData.health_score || ""} onValueChange={(value) => setFormData(prev => ({ ...prev, health_score: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>-</SelectItem>
                <SelectItem value="insatisfeito">😡 INSATISFEITO</SelectItem>
                <SelectItem value="neutro">😑 NEUTRO</SelectItem>
                <SelectItem value="recuperado">🩹 RECUPERADO</SelectItem>
                <SelectItem value="satisfeito">😁 SATISFEITO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {erroHorarioFechado && (
          <div className="bg-red-100 border-2 border-red-600 rounded-lg p-4 text-center animate-pulse">
            <div className="text-red-800 font-bold text-lg mb-2">
              🚫 NÃO FOI POSSÍVEL AGENDAR POIS ESTÁ FECHADO
            </div>
            <div className="text-red-700 text-sm">
              Este horário está fora do expediente do profissional
            </div>
          </div>
        )}

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

        {erroHorarioOcupado && agendamentos.find(ag => {
          if (ag.data !== formData.data) return false;
          if (ag.profissional_id !== formData.profissional_id) return false;
          if (ag.unidade_id !== formData.unidade_id) return false;
          if (ag.id === formData.id) return false;
          if (ag.status === "cancelado") return false;
          if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") return false;
          
          const [horaInicioNum, minInicioNum] = formData.hora_inicio.split(':').map(Number);
          const [horaFimNum, minFimNum] = formData.hora_fim.split(':').map(Number);
          const inicioMinutos = horaInicioNum * 60 + minInicioNum;
          const fimMinutos = horaFimNum * 60 + minFimNum;
          
          const [agHoraInicio, agMinInicio] = ag.hora_inicio.split(':').map(Number);
          const [agHoraFim, agMinFim] = ag.hora_fim.split(':').map(Number);
          const agInicioMinutos = agHoraInicio * 60 + agMinInicio;
          const agFimMinutos = agHoraFim * 60 + agMinFim;
          
          return (inicioMinutos < agFimMinutos && fimMinutos > agInicioMinutos);
        }) && (
          <div className="bg-orange-100 border-2 border-orange-600 rounded-lg p-4 text-center animate-pulse">
            <div className="text-orange-800 font-bold text-lg mb-2">
              ⚠️ HORÁRIO JÁ OCUPADO!
            </div>
            <div className="text-orange-700 text-sm">
              {(() => {
                const horarioOcupado = agendamentos.find(ag => {
                  if (ag.data !== formData.data) return false;
                  if (ag.profissional_id !== formData.profissional_id) return false;
                  if (ag.unidade_id !== formData.unidade_id) return false;
                  if (ag.id === formData.id) return false;
                  if (ag.status === "cancelado") return false;
                  if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") return false;
                  
                  const [horaInicioNum, minInicioNum] = formData.hora_inicio.split(':').map(Number);
                  const [horaFimNum, minFimNum] = formData.hora_fim.split(':').map(Number);
                  const inicioMinutos = horaInicioNum * 60 + minInicioNum;
                  const fimMinutos = horaFimNum * 60 + minFimNum;
                  
                  const [agHoraInicio, agMinInicio] = ag.hora_inicio.split(':').map(Number);
                  const [agHoraFim, agMinFim] = ag.hora_fim.split(':').map(Number);
                  const agInicioMinutos = agHoraInicio * 60 + agMinInicio;
                  const agFimMinutos = agHoraFim * 60 + agMinFim;
                  
                  return (inicioMinutos < agFimMinutos && fimMinutos > agInicioMinutos);
                });
                
                return horarioOcupado ? (
                  <>
                    <p className="font-semibold mb-2">👤 {horarioOcupado.cliente_nome}</p>
                    <p>⏰ {horarioOcupado.hora_inicio} - {horarioOcupado.hora_fim}</p>
                    <p className="mt-2">Escolha outro horário ou profissional</p>
                  </>
                ) : null;
              })()}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.cliente_nome || !formData.profissional_id || !formData.unidade_id || formData.servicos_selecionados.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {modoEdicao ? "Salvar Alterações" : "Salvar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}