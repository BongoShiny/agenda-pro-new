import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, subDays } from "date-fns";

import AgendaHeader from "../components/agenda/AgendaHeader";
import AgendaFilters from "../components/agenda/AgendaFilters";
import AgendaDiaView from "../components/agenda/AgendaDiaView";
import NovoAgendamentoDialog from "../components/agenda/NovoAgendamentoDialog";
import DetalhesAgendamentoDialog from "../components/agenda/DetalhesAgendamentoDialog";

// ============================================
// FUNÇÕES UNIVERSAIS DE DATA - USAR EM TODOS OS ARQUIVOS
// ============================================

// FUNÇÃO CRÍTICA: Converte Date object para string YYYY-MM-DD (SEM timezone)
// SEMPRE usar getFullYear, getMonth, getDate (métodos LOCAIS)
// NUNCA usar getUTCFullYear, getUTCMonth, getUTCDate
export const formatarDataPura = (data) => {
  const ano = data.getFullYear(); // LOCAL time
  const mes = String(data.getMonth() + 1).padStart(2, '0'); // LOCAL time
  const dia = String(data.getDate()).padStart(2, '0'); // LOCAL time
  const resultado = `${ano}-${mes}-${dia}`;
  
  console.log("🔧 FUNÇÃO formatarDataPura:", {
    input: data.toString(),
    ano: ano,
    mes: mes,
    dia: dia,
    output: resultado,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  
  return resultado;
};

// FUNÇÃO CRÍTICA: Converte string YYYY-MM-DD para Date object LOCAL
// Criar data com new Date(ano, mes, dia) - isso cria no timezone LOCAL do navegador
export const criarDataPura = (dataString) => {
  if (!dataString || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
    console.warn("⚠️ criarDataPura: string inválida, usando data atual");
    return new Date();
  }
  
  const [ano, mes, dia] = dataString.split('-').map(Number);
  // Criar às 12h LOCAL para evitar problemas de exibição
  const resultado = new Date(ano, mes - 1, dia, 12, 0, 0);
  
  console.log("🔧 FUNÇÃO criarDataPura:", {
    input: dataString,
    output: resultado.toString(),
    ano: ano,
    mes: mes,
    dia: dia,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  
  return resultado;
};

// FUNÇÃO CRÍTICA: Normaliza qualquer formato de data para YYYY-MM-DD
export const normalizarData = (valor) => {
  if (!valor) {
    console.log("⚠️ normalizarData: valor vazio");
    return null;
  }
  
  console.log("🔧 normalizarData INPUT:", valor, "| Tipo:", typeof valor);
  
  // Já está no formato correto YYYY-MM-DD
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    console.log("✅ normalizarData: já está correto:", valor);
    return valor;
  }
  
  // String com timestamp (ex: "2025-11-13T00:00:00.000Z")
  if (typeof valor === 'string' && valor.includes('T')) {
    const resultado = valor.split('T')[0];
    console.log("✅ normalizarData: extraído de timestamp:", resultado);
    return resultado;
  }
  
  // É um Date object - usar métodos LOCAIS
  if (valor instanceof Date) {
    const resultado = formatarDataPura(valor);
    console.log("✅ normalizarData: convertido de Date:", resultado);
    return resultado;
  }
  
  // Último recurso: tentar parsear
  try {
    // Forçar interpretação LOCAL adicionando horário meio-dia
    const data = new Date(valor + 'T12:00:00');
    const resultado = formatarDataPura(data);
    console.log("✅ normalizarData: parseado:", resultado);
    return resultado;
  } catch (e) {
    console.error("❌ normalizarData ERRO:", valor, e);
    return null;
  }
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

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
      console.log("👤 USUÁRIO:", user.email, "| 🌍 TIMEZONE:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    };
    carregarUsuario();
  }, []);

  const { data: agendamentos = [], refetch: refetchAgendamentos } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: async () => {
      console.log("📥📥📥 CARREGANDO AGENDAMENTOS DO BANCO 📥📥📥");
      
      const lista = await base44.entities.Agendamento.list("-data");
      
      console.log("📊 Total bruto do banco:", lista.length);
      
      // NORMALIZAR TODAS AS DATAS NA ENTRADA
      const listaNormalizada = lista.map(ag => {
        const dataNormalizada = normalizarData(ag.data);
        return { ...ag, data: dataNormalizada };
      });
      
      console.log("✅ Todos os agendamentos normalizados:", listaNormalizada.length);
      
      // Mostrar todos os bloqueios
      const bloqueios = listaNormalizada.filter(ag => 
        ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO"
      );
      
      console.log("🔒 BLOQUEIOS NO BANCO:", bloqueios.length);
      bloqueios.forEach(b => {
        console.log(`  🔒 ID: ${b.id} | Data: ${b.data} | Hora: ${b.hora_inicio} | Prof: ${b.profissional_nome} | Unidade: ${b.unidade_nome}`);
      });
      
      return listaNormalizada;
    },
    initialData: [],
    refetchInterval: 3000,
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
    mutationFn: async (dados) => {
      console.log("📤 ENVIANDO AO BANCO:", {
        data: dados.data,
        cliente: dados.cliente_nome,
        horario: `${dados.hora_inicio}-${dados.hora_fim}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      const resultado = await base44.entities.Agendamento.create(dados);
      
      console.log("✅ SALVO NO BANCO:", {
        id: resultado.id,
        dataRetornada: resultado.data,
        dataNormalizada: normalizarData(resultado.data)
      });
      
      return resultado;
    },
    onSuccess: async () => {
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    },
    onError: (error) => {
      console.error("❌ ERRO AO SALVAR:", error);
      alert("Erro ao salvar: " + error.message);
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
    
    const dataFormatada = formatarDataPura(dataAtual);
    
    console.log("🆕 NOVO AGENDAMENTO SLOT:", dataFormatada, horario);
    
    setAgendamentoInicial({
      unidade_id: unidadeId,
      unidade_nome: unidade?.nome || "",
      profissional_id: profissionalId,
      profissional_nome: profissional?.nome || "",
      data: dataFormatada,
      hora_inicio: horario,
      hora_fim: horaFim
    });
    setDialogNovoAberto(true);
  };

  const handleBloquearHorario = async (unidadeId, profissionalId, horario) => {
    console.log("🔒🔒🔒 ==================== INICIANDO BLOQUEIO ==================== 🔒🔒🔒");
    console.log("📊 ESTADO ATUAL:");
    console.log("  - dataAtual (Date object):", dataAtual.toString());
    console.log("  - Timezone do navegador:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("  - Usuário:", usuarioAtual?.email);
    console.log("  - Cargo:", usuarioAtual?.cargo);
    
    // CRÍTICO: usar formatarDataPura que usa métodos LOCAIS do Date
    const dataFormatada = formatarDataPura(dataAtual);
    
    console.log("📅 DATA DO BLOQUEIO (formatada PURA):", dataFormatada);
    
    const unidade = unidades.find(u => u.id === unidadeId);
    const profissional = profissionais.find(p => p.id === profissionalId);
    
    const [hora, minuto] = horario.split(':').map(Number);
    const horaFim = `${(hora + (minuto === 30 ? 1 : 0)).toString().padStart(2, '0')}:${(minuto === 30 ? '00' : '30')}`;
    
    console.log("⏰ HORÁRIO:", horario, "até", horaFim);
    console.log("👨‍⚕️ PROFISSIONAL:", profissional?.nome, "(ID:", profissionalId, ")");
    console.log("🏢 UNIDADE:", unidade?.nome, "(ID:", unidadeId, ")");
    
    // OBJETO BLOQUEIO - data como STRING PURA
    const bloqueio = {
      cliente_nome: "FECHADO",
      profissional_id: profissionalId,
      profissional_nome: profissional?.nome || "",
      unidade_id: unidadeId,
      unidade_nome: unidade?.nome || "",
      servico_nome: "Horário Bloqueado",
      data: dataFormatada, // ⚠️ CRÍTICO: STRING PURA "YYYY-MM-DD"
      hora_inicio: horario,
      hora_fim: horaFim,
      status: "bloqueio",
      tipo: "bloqueio",
      observacoes: "Horário fechado para atendimentos"
    };
    
    console.log("📦 OBJETO COMPLETO A SER SALVO:");
    console.log(JSON.stringify(bloqueio, null, 2));
    
    try {
      console.log("📤 ENVIANDO PARA O BANCO...");
      const resultado = await criarAgendamentoMutation.mutateAsync(bloqueio);
      
      console.log("✅✅✅ BLOQUEIO SALVO NO BANCO ✅✅✅");
      console.log("🆔 ID retornado:", resultado.id);
      console.log("📅 Data retornada (bruta):", resultado.data);
      console.log("📅 Data normalizada:", normalizarData(resultado.data));
      console.log("🔒🔒🔒 ==================== FIM DO BLOQUEIO ==================== 🔒🔒🔒");
      
      alert(`✅ Horário BLOQUEADO com sucesso!\n\n📅 Data: ${dataFormatada}\n⏰ Horário: ${horario}\n👨‍⚕️ Profissional: ${profissional?.nome}`);
      
    } catch (error) {
      console.error("❌❌❌ ERRO AO BLOQUEAR ❌❌❌");
      console.error("Detalhes completos:", error);
      console.error("Stack:", error.stack);
      alert("❌ Erro ao bloquear horário: " + error.message);
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
    console.log("🗑️🗑️🗑️ PROCESSANDO DELEÇÃO 🗑️🗑️🗑️");
    console.log("🆔 ID a deletar:", id);
    
    try {
      await base44.entities.Agendamento.delete(id);
      
      console.log("✅ Deletado do banco com sucesso");
      console.log("🔄 Recarregando agendamentos...");
      
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      
      setDialogDetalhesAberto(false);
      
      console.log("✅✅✅ HORÁRIO DESBLOQUEADO COM SUCESSO ✅✅✅");
      alert("✅ Horário desbloqueado com sucesso!");
      
    } catch (error) {
      console.error("❌❌❌ ERRO AO DELETAR ❌❌❌");
      console.error("Detalhes:", error);
      alert("❌ Erro ao desbloquear: " + error.message);
    }
  };

  // FILTRAR AGENDAMENTOS PELA DATA ATUAL
  console.log("🔍🔍🔍 ==================== INICIANDO FILTRO ==================== 🔍🔍🔍");
  console.log("📊 ESTADO DO FILTRO:");
  console.log("  - dataAtual (Date object):", dataAtual.toString());
  console.log("  - Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  const dataFiltro = formatarDataPura(dataAtual);
  
  console.log("📅 DATA DO FILTRO (string pura):", dataFiltro);
  console.log("📊 Total de agendamentos no banco:", agendamentos.length);
  console.log("🏢 Unidade selecionada:", unidadeSelecionada?.nome, "(ID:", unidadeSelecionada?.id, ")");

  const agendamentosFiltrados = agendamentos.filter(ag => {
    // Log detalhado para cada agendamento
    const isDataMatch = ag.data === dataFiltro;
    const isUnidadeMatch = !unidadeSelecionada || ag.unidade_id === unidadeSelecionada.id;
    const isClienteMatch = !filters.cliente || (ag.cliente_nome && ag.cliente_nome.toLowerCase().includes(filters.cliente.toLowerCase()));
    const isProfissionalMatch = !filters.profissional || ag.profissional_id === filters.profissional;
    const isServicoMatch = !filters.servico || ag.servico_id === filters.servico;
    const isStatusMatch = !filters.status || ag.status === filters.status;
    const isDataFilterMatch = !filters.data || ag.data === filters.data;
    
    const isBloqueio = ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO";
    
    if (isBloqueio) {
      console.log(`🔒 BLOQUEIO ENCONTRADO:`, {
        id: ag.id,
        data: ag.data,
        dataMatch: isDataMatch,
        horario: ag.hora_inicio,
        profissional: ag.profissional_nome,
        unidade: ag.unidade_nome,
        unidadeMatch: isUnidadeMatch,
        passaNoFiltro: isDataMatch && isUnidadeMatch
      });
    }
    
    // Retornar apenas se TODOS os filtros passarem
    if (!isDataMatch) return false;
    if (!isUnidadeMatch) return false;
    if (!isClienteMatch) return false;
    if (!isProfissionalMatch) return false;
    if (!isServicoMatch) return false;
    if (!isStatusMatch) return false;
    if (!isDataFilterMatch) return false;
    
    return true;
  });

  console.log("📊 TOTAL APÓS FILTRO:", agendamentosFiltrados.length);
  
  const bloqueiosFiltrados = agendamentosFiltrados.filter(ag => 
    ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO"
  );
  console.log("🔒 BLOQUEIOS NO FILTRO:", bloqueiosFiltrados.length);
  bloqueiosFiltrados.forEach(b => {
    console.log(`  🔒 ${b.hora_inicio} | ${b.profissional_nome} | Data: ${b.data}`);
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
    </div>
  );
}