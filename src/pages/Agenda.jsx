import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, subDays } from "date-fns";

import AgendaHeader from "../components/agenda/AgendaHeader";
import AgendaFilters from "../components/agenda/AgendaFilters";
import AgendaDiaView from "../components/agenda/AgendaDiaView";
import NovoAgendamentoDialog from "../components/agenda/NovoAgendamentoDialog";
import DetalhesAgendamentoDialog from "../components/agenda/DetalhesAgendamentoDialog";

// Função DEFINITIVA para formatar data - sempre retorna YYYY-MM-DD como STRING PURA
const formatarDataLocal = (data) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

// Função para normalizar qualquer data que venha do banco
const normalizarDataDoBanco = (dataString) => {
  if (!dataString) return null;
  
  // Se já está no formato correto, retorna direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
    return dataString;
  }
  
  // Se vier com timestamp/timezone (ex: "2025-11-11T00:00:00.000Z"), extrair apenas a parte da data
  if (dataString.includes('T')) {
    return dataString.split('T')[0];
  }
  
  // Último recurso: tentar fazer parse
  try {
    const data = new Date(dataString + 'T12:00:00'); // Força meio-dia UTC para evitar shifts
    return formatarDataLocal(data);
  } catch (e) {
    console.error("❌ Erro ao normalizar data:", dataString, e);
    return null;
  }
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
      console.log("✅ USUÁRIO:", user.email, "| TIMEZONE:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    };
    carregarUsuario();
  }, []);

  const { data: agendamentos = [], refetch: refetchAgendamentos } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: async () => {
      const lista = await base44.entities.Agendamento.list("-data");
      
      // Normalizar TODAS as datas assim que chegam do banco
      const listaNormalizada = lista.map(ag => ({
        ...ag,
        data: normalizarDataDoBanco(ag.data)
      }));
      
      console.log("📅 AGENDAMENTOS CARREGADOS E NORMALIZADOS:", listaNormalizada.length);
      listaNormalizada.forEach(ag => {
        if (ag.cliente_nome === "FECHADO") {
          console.log("🔒 Bloqueio ID:", ag.id, "| Data normalizada:", ag.data, "| Profissional:", ag.profissional_nome);
        }
      });
      
      return listaNormalizada;
    },
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

  useEffect(() => {
    const ultimoTotalBloqueios = parseInt(localStorage.getItem('total_bloqueios') || '0');
    const bloqueiosAtuais = agendamentos.filter(ag => 
      ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO"
    ).length;

    if (bloqueiosAtuais > ultimoTotalBloqueios) {
      const diferenca = bloqueiosAtuais - ultimoTotalBloqueios;
      const novoContador = contadorBloqueios + diferenca;
      setContadorBloqueios(novoContador);

      if (novoContador >= 3) {
        console.log("🔄 3 bloqueios atingidos! Recarregando...");
        localStorage.setItem('total_bloqueios', bloqueiosAtuais.toString());
        setContadorBloqueios(0);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        localStorage.setItem('total_bloqueios', bloqueiosAtuais.toString());
      }
    }
  }, [agendamentos, contadorBloqueios]);

  const criarAgendamentoMutation = useMutation({
    mutationFn: async (taskData) => {
      console.log("📝 SALVANDO | Data:", taskData.data, "| Cliente:", taskData.cliente_nome, "| Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
      
      const resultado = await base44.entities.Agendamento.create(taskData);
      
      console.log("✅ SALVO | ID:", resultado.id, "| Data retornada:", resultado.data);
      
      return resultado;
    },
    onSuccess: async (data) => {
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    },
    onError: (error) => {
      console.error("❌ ERRO ao criar:", error);
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
    const dataFormatada = formatarDataLocal(dataAtual);
    
    console.log("🔒 BLOQUEANDO | Data:", dataFormatada, "| Horário:", horario, "| User:", usuarioAtual?.email);
    
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
      data: dataFormatada,
      hora_inicio: horario,
      hora_fim: horaFim,
      status: "bloqueio",
      tipo: "bloqueio",
      observacoes: "Horário fechado para atendimentos"
    };
    
    try {
      const resultado = await criarAgendamentoMutation.mutateAsync(bloqueio);
      console.log("✅ BLOQUEADO | Data salva:", resultado.data);
      
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      
      alert(`Horário ${horario} bloqueado no dia ${dataFormatada}!`);
      
    } catch (error) {
      console.error("❌ Erro ao bloquear:", error);
      alert("Erro ao bloquear horário: " + error.message);
    }
  };

  const handleAgendamentoClick = (agendamento) => {
    setAgendamentoSelecionado(agendamento);
    setDialogDetalhesAberto(true);
  };

  const handleSalvarAgendamento = async (dados) => {
    await criarAgendamentoMutation.mutateAsync(dados);
    setDialogNovoAberto(false);
  };

  const handleDeletarAgendamento = async (id) => {
    try {
      await base44.entities.Agendamento.delete(id);
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      setDialogDetalhesAberto(false);
      alert("Horário desbloqueado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao deletar:", error);
      alert("Erro ao desbloquear horário: " + error.message);
    }
  };

  // FILTRO DE DATA - Comparação direta de strings YYYY-MM-DD
  const dataFiltro = formatarDataLocal(dataAtual);
  
  console.log("🔍 FILTRANDO | Data do filtro:", dataFiltro, "| Total agendamentos:", agendamentos.length);

  const agendamentosFiltrados = agendamentos.filter(ag => {
    // Comparação DIRETA de strings - SEM conversão de timezone
    if (ag.data !== dataFiltro) {
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

  console.log("✅ FILTRADOS:", agendamentosFiltrados.length, "agendamentos");
  agendamentosFiltrados.forEach(ag => {
    if (ag.cliente_nome === "FECHADO") {
      console.log("🔒 Bloqueio visível | Data:", ag.data, "| Horário:", ag.hora_inicio);
    }
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