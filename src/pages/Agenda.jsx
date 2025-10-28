import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import AgendaHeader from "../components/agenda/AgendaHeader";
import AgendaFilters from "../components/agenda/AgendaFilters";
import AgendaDiaView from "../components/agenda/AgendaDiaView";
import NovoAgendamentoDialog from "../components/agenda/NovoAgendamentoDialog";
import DetalhesAgendamentoDialog from "../components/agenda/DetalhesAgendamentoDialog";

export default function AgendaPage() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [dialogNovoAberto, setDialogNovoAberto] = useState(false);
  const [dialogDetalhesAberto, setDialogDetalhesAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [agendamentoInicial, setAgendamentoInicial] = useState({});
  const [filters, setFilters] = useState({});
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const carregarUsuario = async () => {
      const user = await base44.auth.me();
      setUsuarioAtual(user);
    };
    carregarUsuario();
  }, []);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list("nome"),
    initialData: [],
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list("nome"),
    initialData: [],
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.ConfiguracaoTerapeuta.list("ordem"),
    initialData: [],
  });

  const criarAgendamentoMutation = useMutation({
    mutationFn: async (taskData) => {
      console.log("MUTATION: Criando agendamento com dados:", taskData);
      const resultado = await base44.entities.Agendamento.create(taskData);
      console.log("MUTATION: Agendamento criado com sucesso:", resultado);
      return resultado;
    },
    onSuccess: (data) => {
      console.log("MUTATION SUCCESS: Invalidando queries");
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    },
    onError: (error) => {
      console.error("MUTATION ERROR:", error);
      alert("Erro ao criar agendamento: " + error.message);
    }
  });

  const deletarAgendamentoMutation = useMutation({
    mutationFn: (id) => base44.entities.Agendamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    },
  });

  const handleFilterChange = (field, value) => {
    if (field === "limpar") {
      setFilters({});
    } else {
      setFilters(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleNovoAgendamento = () => {
    setAgendamentoInicial({});
    setDialogNovoAberto(true);
  };

  const handleNovoAgendamentoSlot = (unidadeId, profissionalId, horario) => {
    const unidade = unidades.find(u => u.id === unidadeId);
    const profissional = profissionais.find(p => p.id === profissionalId);
    
    const [hora, minuto] = horario.split(':').map(Number);
    const horaFim = `${(hora + 1).toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
    
    setAgendamentoInicial({
      unidade_id: unidadeId,
      unidade_nome: unidade?.nome || "",
      profissional_id: profissionalId,
      profissional_nome: profissional?.nome || "",
      data: format(dataAtual, "yyyy-MM-dd"),
      hora_inicio: horario,
      hora_fim: horaFim
    });
    setDialogNovoAberto(true);
  };

  const handleBloquearHorario = async (unidadeId, profissionalId, horario) => {
    console.log("=== INICIANDO BLOQUEIO ===");
    console.log("Unidade ID:", unidadeId);
    console.log("Profissional ID:", profissionalId);
    console.log("Horário:", horario);
    
    const unidade = unidades.find(u => u.id === unidadeId);
    const profissional = profissionais.find(p => p.id === profissionalId);
    
    console.log("Unidade encontrada:", unidade);
    console.log("Profissional encontrado:", profissional);
    
    const [hora, minuto] = horario.split(':').map(Number);
    const horaFim = `${(hora + (minuto === 30 ? 1 : 0)).toString().padStart(2, '0')}:${(minuto === 30 ? '00' : '30')}`;
    
    const bloqueio = {
      cliente_nome: "FECHADO",
      profissional_id: profissionalId,
      profissional_nome: profissional?.nome || "",
      unidade_id: unidadeId,
      unidade_nome: unidade?.nome || "",
      servico_nome: "Horário Bloqueado",
      data: format(dataAtual, "yyyy-MM-dd"),
      hora_inicio: horario,
      hora_fim: horaFim,
      status: "bloqueio",
      tipo: "bloqueio",
      observacoes: "Horário fechado para atendimentos"
    };

    console.log("Dados do bloqueio a serem criados:", bloqueio);
    
    try {
      await criarAgendamentoMutation.mutateAsync(bloqueio);
      console.log("Bloqueio criado com sucesso!");
      alert(`Horário ${horario} bloqueado com sucesso!`);
    } catch (error) {
      console.error("Erro ao bloquear:", error);
      alert("Erro ao bloquear horário: " + error.message);
    }
  };

  const handleAgendamentoClick = (agendamento) => {
    console.log("Agendamento clicado:", agendamento);
    setAgendamentoSelecionado(agendamento);
    setDialogDetalhesAberto(true);
  };

  const handleSalvarAgendamento = async (dados) => {
    await criarAgendamentoMutation.mutateAsync(dados);
    setDialogNovoAberto(false);
  };

  const handleDeletarAgendamento = async (id) => {
    console.log("Deletando agendamento ID:", id);
    await deletarAgendamentoMutation.mutateAsync(id);
    setDialogDetalhesAberto(false);
    alert("Horário desbloqueado com sucesso!");
  };

  console.log("=== RENDERIZAÇÃO DA AGENDA ===");
  console.log("Total de agendamentos carregados:", agendamentos.length);
  console.log("Agendamentos:", agendamentos);

  const agendamentosFiltrados = agendamentos.filter(ag => {
    const dataAgendamento = format(new Date(ag.data), "yyyy-MM-dd");
    const dataFiltro = format(dataAtual, "yyyy-MM-dd");
    
    if (dataAgendamento !== dataFiltro) return false;
    if (unidadeSelecionada && ag.unidade_id !== unidadeSelecionada.id) return false;
    if (filters.cliente && !ag.cliente_nome.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
    if (filters.profissional && ag.profissional_id !== filters.profissional) return false;
    if (filters.servico && ag.servico_id !== filters.servico) return false;
    if (filters.status && ag.status !== filters.status) return false;
    if (filters.data && ag.data !== filters.data) return false;
    
    return true;
  });

  console.log("Agendamentos filtrados:", agendamentosFiltrados.length);
  console.log("Bloqueios encontrados:", agendamentosFiltrados.filter(ag => ag.status === "bloqueio" || ag.cliente_nome === "FECHADO"));

  const unidadeAtual = unidadeSelecionada || unidades[0];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <AgendaHeader
        dataAtual={dataAtual}
        unidades={unidades}
        unidadeSelecionada={unidadeSelecionada}
        onUnidadeChange={setUnidadeSelecionada}
        onDataChange={setDataAtual}
        onNovoAgendamento={handleNovoAgendamento}
        usuarioAtual={usuarioAtual}
      />

      <div className="flex-1 flex overflow-hidden">
        <AgendaFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          clientes={clientes}
          profissionais={profissionais}
          servicos={servicos}
        />

        {unidadeAtual && (
          <AgendaDiaView
            agendamentos={agendamentosFiltrados}
            unidadeSelecionada={unidadeAtual}
            profissionais={profissionais}
            configuracoes={configuracoes}
            onAgendamentoClick={handleAgendamentoClick}
            onNovoAgendamento={handleNovoAgendamentoSlot}
            onBloquearHorario={handleBloquearHorario}
            usuarioAtual={usuarioAtual}
          />
        )}
      </div>

      <NovoAgendamentoDialog
        open={dialogNovoAberto}
        onOpenChange={setDialogNovoAberto}
        onSave={handleSalvarAgendamento}
        agendamentoInicial={agendamentoInicial}
        clientes={clientes}
        profissionais={profissionais}
        unidades={unidades}
        servicos={servicos}
      />

      <DetalhesAgendamentoDialog
        open={dialogDetalhesAberto}
        onOpenChange={setDialogDetalhesAberto}
        agendamento={agendamentoSelecionado}
        onDelete={handleDeletarAgendamento}
        usuarioAtual={usuarioAtual}
      />
    </div>
  );
}