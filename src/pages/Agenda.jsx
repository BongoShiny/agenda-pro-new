import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays, subDays, startOfDay } from "date-fns";

import AgendaHeader from "../components/agenda/AgendaHeader";
import AgendaFilters from "../components/agenda/AgendaFilters";
import AgendaDiaView from "../components/agenda/AgendaDiaView";
import NovoAgendamentoDialog from "../components/agenda/NovoAgendamentoDialog";
import DetalhesAgendamentoDialog from "../components/agenda/DetalhesAgendamentoDialog";

// Função para formatar data sem problemas de timezone - SEMPRE usar esta função
const formatarDataLocal = (data) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export default function AgendaPage() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [dialogNovoAberto, setDialogNovoAberto] = useState(false);
  const [dialogDetalhesAberto, setDialogDetalhesAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [agendamentoInicial, setAgendamentoInicial] = useState({});
  const [filters, setFilters] = useState({});
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [contadorBloqueios, setContadorBloqueios] = useState(0);

  const queryClient = useQueryClient();

  useEffect(() => {
    const carregarUsuario = async () => {
      const user = await base44.auth.me();
      setUsuarioAtual(user);
    };
    carregarUsuario();
  }, []);

  // Monitorar mudanças nos agendamentos para forçar reload a cada 3 bloqueios
  useEffect(() => {
    const ultimoTotalBloqueios = parseInt(localStorage.getItem('total_bloqueios') || '0');
    const bloqueiosAtuais = agendamentos.filter(ag => 
      ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO"
    ).length;

    if (bloqueiosAtuais > ultimoTotalBloqueios) {
      const diferenca = bloqueiosAtuais - ultimoTotalBloqueios;
      const novoContador = contadorBloqueios + diferenca;
      setContadorBloqueios(novoContador);

      console.log(`Bloqueios detectados: ${diferenca}, Total acumulado: ${novoContador}`);

      if (novoContador >= 3) {
        console.log("3 bloqueios atingidos! Recarregando página para todos...");
        localStorage.setItem('total_bloqueios', bloqueiosAtuais.toString());
        setContadorBloqueios(0);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        localStorage.setItem('total_bloqueios', bloqueiosAtuais.toString());
      }
    }
  }, [agendamentos]);

  const { data: agendamentos = [], refetch: refetchAgendamentos } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
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
    onSuccess: async (data) => {
      console.log("MUTATION SUCCESS: Recarregando agendamentos");
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    },
    onError: (error) => {
      console.error("MUTATION ERROR:", error);
      alert("Erro ao criar agendamento: " + error.message);
    }
  });

  const deletarAgendamentoMutation = useMutation({
    mutationFn: (id) => base44.entities.Agendamento.delete(id),
    onSuccess: async () => {
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
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
      data: formatarDataLocal(dataAtual),
      hora_inicio: horario,
      hora_fim: horaFim
    });
    setDialogNovoAberto(true);
  };

  const handleBloquearHorario = async (unidadeId, profissionalId, horario) => {
    console.log("=== INICIANDO BLOQUEIO ===");
    console.log("Data atual (Brasília):", dataAtual);
    console.log("Data formatada:", formatarDataLocal(dataAtual));
    console.log("Horário:", horario);
    
    const unidade = unidades.find(u => u.id === unidadeId);
    const profissional = profissionais.find(p => p.id === profissionalId);
    
    const [hora, minuto] = horario.split(':').map(Number);
    const horaFim = `${(hora + (minuto === 30 ? 1 : 0)).toString().padStart(2, '0')}:${(minuto === 30 ? '00' : '30')}`;
    
    const bloqueio = {
      cliente_nome: "FECHADO",
      profissional_id: profissionalId,
      profissional_nome: profissional?.nome || "",
      unidade_id: unidadeId,
      unidade_nome: unidade?.nome || "",
      servico_nome: "Horário Bloqueado",
      data: formatarDataLocal(dataAtual),
      hora_inicio: horario,
      hora_fim: horaFim,
      status: "bloqueio",
      tipo: "bloqueio",
      observacoes: "Horário fechado para atendimentos"
    };

    console.log("Dados do bloqueio:", bloqueio);
    
    try {
      const resultado = await criarAgendamentoMutation.mutateAsync(bloqueio);
      console.log("Bloqueio criado com sucesso:", resultado);
      
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      
      alert(`Horário ${horario} bloqueado! A agenda atualizará automaticamente.`);
      
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
    
    try {
      await base44.entities.Agendamento.delete(id);
      
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      
      setDialogDetalhesAberto(false);
      alert("Horário desbloqueado com sucesso!");
      
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao desbloquear horário: " + error.message);
    }
  };

  console.log("=== RENDERIZAÇÃO DA AGENDA (Horário Brasília-DF) ===");
  console.log("Data atual:", dataAtual);
  console.log("Data formatada:", formatarDataLocal(dataAtual));
  console.log("Total de agendamentos:", agendamentos.length);

  const agendamentosFiltrados = agendamentos.filter(ag => {
    const dataAgendamento = ag.data;
    const dataFiltro = formatarDataLocal(dataAtual);
    
    if (dataAgendamento !== dataFiltro) {
      return false;
    }
    if (unidadeSelecionada && ag.unidade_id !== unidadeSelecionada.id) {
      return false;
    }
    if (filters.cliente && ag.cliente_nome && !ag.cliente_nome.toLowerCase().includes(filters.cliente.toLowerCase())) {
      return false;
    }
    if (filters.profissional && ag.profissional_id !== filters.profissional) {
      return false;
    }
    if (filters.servico && ag.servico_id !== filters.servico) {
      return false;
    }
    if (filters.status && ag.status !== filters.status) {
      return false;
    }
    if (filters.data && ag.data !== filters.data) {
      return false;
    }
    
    return true;
  });

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

      {/* Indicador de sincronização */}
      {contadorBloqueios > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="text-sm font-medium">
            Bloqueios detectados: {contadorBloqueios}/3
          </div>
          <div className="text-xs opacity-90">
            Recarregará automaticamente após 3 bloqueios
          </div>
        </div>
      )}
    </div>
  );
}