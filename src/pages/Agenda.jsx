import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, subDays } from "date-fns";

import AgendaHeader from "../components/agenda/AgendaHeader";
import AgendaFilters from "../components/agenda/AgendaFilters";
import AgendaDiaView from "../components/agenda/AgendaDiaView";
import NovoAgendamentoDialog from "../components/agenda/NovoAgendamentoDialog";
import DetalhesAgendamentoDialog from "../components/agenda/DetalhesAgendamentoDialog";
import MenuConta from "../components/agenda/MenuConta";
import AlertasModal from "../components/agenda/AlertasModal";
import { Button } from "@/components/ui/button";
import { Filter, X, User } from "lucide-react";

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
  // ⚠️ CRÍTICO: Inicializar dataAtual sempre com meio-dia LOCAL
  const inicializarData = () => {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const dia = agora.getDate();
    let dataLocal = new Date(ano, mes, dia, 12, 0, 0, 0);
    
    // Se for domingo (0), avançar para segunda (1)
    if (dataLocal.getDay() === 0) {
      dataLocal = addDays(dataLocal, 1);
    }
    
    console.log("🚀🚀🚀 INICIALIZANDO PÁGINA 🚀🚀🚀");
    console.log("Data agora (raw):", agora.toString());
    console.log("Data local (12h):", dataLocal.toString());
    console.log("Data formatada:", formatarDataPura(dataLocal));
    console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    return dataLocal;
  };
  
  const [dataAtual, setDataAtual] = useState(inicializarData);
  const [dialogNovoAberto, setDialogNovoAberto] = useState(false);
  const [dialogDetalhesAberto, setDialogDetalhesAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [agendamentoInicial, setAgendamentoInicial] = useState({});
  const [filters, setFilters] = useState({});
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [menuContaAberto, setMenuContaAberto] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    let cleanup = null;

    const carregarUsuario = async () => {
      const user = await base44.auth.me();
      setUsuarioAtual(user);

      console.log("👤👤👤 USUÁRIO CARREGADO 👤👤👤");
      console.log("Email:", user.email);
      console.log("Cargo:", user.cargo);
      console.log("Role:", user.role);
      console.log("É Admin?:", user.cargo === "administrador" || user.role === "admin");
      console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log("Data atual:", dataAtual.toString());
      console.log("Data formatada:", formatarDataPura(dataAtual));

      // Gerenciar sessão única
      cleanup = await gerenciarSessaoUnica(user);
    };

    carregarUsuario();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Função para gerenciar sessão única
  const gerenciarSessaoUnica = async (user) => {
    try {
      // Gerar ID único para esta sessão
      let sessaoId = localStorage.getItem('sessao_id');
      if (!sessaoId) {
        sessaoId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('sessao_id', sessaoId);
      }

      // Obter informações do dispositivo
      const dispositivo = `${navigator.userAgent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'} - ${
        navigator.userAgent.includes('Chrome') ? 'Chrome' : 
        navigator.userAgent.includes('Firefox') ? 'Firefox' : 
        navigator.userAgent.includes('Safari') ? 'Safari' : 
        'Outro Navegador'
      }`;

      // Obter IP do usuário (usando API pública)
      let ip = "Não disponível";
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ip = ipData.ip;
      } catch (error) {
        console.log("Não foi possível obter IP:", error);
      }

      // Buscar sessões ativas do usuário
      const sessoesAtivas = await base44.entities.SessaoAtiva.filter({ 
        usuario_email: user.email 
      });

      // Verificar se já existe sessão com mesmo dispositivo e IP (mesmo navegador/máquina)
      const sessaoExistente = sessoesAtivas.find(s => 
        s.dispositivo === dispositivo && s.ip === ip
      );

      if (sessaoExistente) {
        // Se já existe, apenas atualizar a última atividade e sessaoId
        await base44.entities.SessaoAtiva.update(sessaoExistente.id, {
          sessao_id: sessaoId,
          ultima_atividade: new Date().toISOString()
        });
      } else {
        // Criar nova sessão ativa (permite múltiplas sessões simultâneas)
        await base44.entities.SessaoAtiva.create({
          usuario_email: user.email,
          sessao_id: sessaoId,
          dispositivo: dispositivo,
          ip: ip,
          ultima_atividade: new Date().toISOString()
        });
      }

      // Buscar dispositivo conectado correspondente
      const dispositivosConectados = await base44.entities.DispositivoConectado.filter({ 
        usuario_email: user.email,
        dispositivo: dispositivo,
        ip: ip,
        sessao_ativa: true
      });

      if (dispositivosConectados.length > 0) {
        // Atualizar a data de login
        await base44.entities.DispositivoConectado.update(dispositivosConectados[0].id, {
          data_login: new Date().toISOString()
        });
      } else {
        // Criar novo registro de dispositivo
        await base44.entities.DispositivoConectado.create({
          usuario_email: user.email,
          dispositivo: dispositivo,
          ip: ip,
          data_login: new Date().toISOString(),
          sessao_ativa: true
        });
      }

      // Registrar login no log
      if (!sessaoExistente) {
        await base44.entities.LogAcao.create({
          tipo: "login",
          usuario_email: user.email,
          descricao: `Login realizado em ${dispositivo} (IP: ${ip})`,
          entidade_tipo: "Usuario"
        });
      }

      // Atualizar última atividade periodicamente (sem verificar desconexão)
      const atualizarAtividade = setInterval(async () => {
        try {
          const sessoesAtuais = await base44.entities.SessaoAtiva.filter({ 
            usuario_email: user.email,
            sessao_id: sessaoId
          });

          if (sessoesAtuais.length > 0) {
            await base44.entities.SessaoAtiva.update(sessoesAtuais[0].id, {
              ultima_atividade: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Erro ao atualizar atividade:", error);
        }
      }, 30000); // Atualizar a cada 30 segundos

      // Limpar intervalo quando componente desmontar
      return () => clearInterval(atualizarAtividade);
    } catch (error) {
      console.error("Erro ao gerenciar sessão:", error);
    }
  };

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

  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  // Filtrar unidades baseado no acesso do usuário
  const unidades = (usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin")
    ? todasUnidades
    : todasUnidades.filter(u => Array.isArray(usuarioAtual?.unidades_acesso) && usuarioAtual.unidades_acesso.includes(u.id));

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

  const { data: excecoesHorario = [] } = useQuery({
    queryKey: ['excecoes-horario'],
    queryFn: () => base44.entities.HorarioExcecao.list("-data"),
    initialData: [],
  });

  const criarAgendamentoMutation = useMutation({
    mutationFn: async (dados) => {
      console.log("📤 ENVIANDO AO BANCO:", {
        data: dados.data,
        cliente: dados.cliente_nome,
        horario: `${dados.hora_inicio}-${dados.hora_fim}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        usuario: usuarioAtual?.email
      });
      
      // Se cliente não existe no sistema, criar automaticamente
      if (dados.cliente_nome && !dados.cliente_id) {
        const clienteExistente = clientes.find(c => 
          c.nome.toLowerCase() === dados.cliente_nome.toLowerCase()
        );
        
        if (!clienteExistente) {
          console.log("👤 Criando novo cliente:", dados.cliente_nome);
          const novoCliente = await base44.entities.Cliente.create({
            nome: dados.cliente_nome,
            telefone: dados.cliente_telefone || ""
          });
          dados.cliente_id = novoCliente.id;
          queryClient.invalidateQueries({ queryKey: ['clientes'] });
        } else {
          dados.cliente_id = clienteExistente.id;
        }
      }
      
      // Adicionar email do criador no campo customizado
      const dadosComCriador = {
        ...dados,
        criador_email: usuarioAtual?.email
      };
      
      const resultado = await base44.entities.Agendamento.create(dadosComCriador);
      
      // Contabilizar venda para vendedor se for "Paciente Novo"
      if (resultado.status_paciente === "paciente_novo" && resultado.vendedor_id) {
        const vendedor = await base44.entities.Vendedor.list().then(v => v.find(vend => vend.id === resultado.vendedor_id));
        if (vendedor) {
          const totalPago = (resultado.sinal || 0) + (resultado.recebimento_2 || 0) + (resultado.final_pagamento || 0);
          await base44.entities.Vendedor.update(vendedor.id, {
            valor_combinado_total: (vendedor.valor_combinado_total || 0) + (resultado.valor_combinado || 0),
            valor_recebido_total: (vendedor.valor_recebido_total || 0) + totalPago,
            a_receber_total: (vendedor.a_receber_total || 0) + (resultado.falta_quanto || 0)
          });
          queryClient.invalidateQueries({ queryKey: ['vendedores'] });
        }
      }
      
      // Criar log de ação
      const isBloqueio = dados.status === "bloqueio" || dados.tipo === "bloqueio" || dados.cliente_nome === "FECHADO";
      await base44.entities.LogAcao.create({
        tipo: isBloqueio ? "bloqueou_horario" : "criou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: isBloqueio 
          ? `Bloqueou horário: ${dados.profissional_nome} - ${dados.data} às ${dados.hora_inicio}`
          : `Criou agendamento: ${dados.cliente_nome} com ${dados.profissional_nome} - ${dados.data} às ${dados.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: resultado.id,
        dados_novos: JSON.stringify(resultado)
      });
      
      console.log("✅ SALVO NO BANCO:", {
        id: resultado.id,
        dataRetornada: resultado.data,
        dataNormalizada: normalizarData(resultado.data),
        created_by: resultado.created_by
      });
      
      return resultado;
    },
    onSuccess: async () => {
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['logs-acoes'] });
    },
    onError: (error) => {
      console.error("❌ ERRO AO SALVAR:", error);
      alert("Erro ao salvar: " + error.message);
    }
  });

  const atualizarAgendamentoMutation = useMutation({
    mutationFn: async ({ id, dados, dadosAntigos }) => {
      console.log("📝 ATUALIZANDO NO BANCO:", {
        id: id,
        data: dados.data,
        cliente: dados.cliente_nome,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      // Adicionar email de quem está editando
      const dadosComEditor = {
        ...dados,
        editor_email: usuarioAtual?.email
      };
      
      const resultado = await base44.entities.Agendamento.update(id, dadosComEditor);
      
      // Contabilizar venda se mudou para "Paciente Novo" e tem vendedor
      if (resultado.status_paciente === "paciente_novo" && 
          dadosAntigos?.status_paciente !== "paciente_novo" && 
          resultado.vendedor_id) {
        const vendedor = await base44.entities.Vendedor.list().then(v => v.find(vend => vend.id === resultado.vendedor_id));
        if (vendedor) {
          const totalPago = (resultado.sinal || 0) + (resultado.recebimento_2 || 0) + (resultado.final_pagamento || 0);
          await base44.entities.Vendedor.update(vendedor.id, {
            valor_combinado_total: (vendedor.valor_combinado_total || 0) + (resultado.valor_combinado || 0),
            valor_recebido_total: (vendedor.valor_recebido_total || 0) + totalPago,
            a_receber_total: (vendedor.a_receber_total || 0) + (resultado.falta_quanto || 0)
          });
          queryClient.invalidateQueries({ queryKey: ['vendedores'] });
        }
      }

      // Remover venda se desmarcou "Paciente Novo"
      if (dadosAntigos?.status_paciente === "paciente_novo" && 
          resultado.status_paciente !== "paciente_novo" && 
          dadosAntigos?.vendedor_id) {
        const vendedor = await base44.entities.Vendedor.list().then(v => v.find(vend => vend.id === dadosAntigos.vendedor_id));
        if (vendedor) {
          const totalPagoAntigo = (dadosAntigos.sinal || 0) + (dadosAntigos.recebimento_2 || 0) + (dadosAntigos.final_pagamento || 0);
          await base44.entities.Vendedor.update(vendedor.id, {
            valor_combinado_total: (vendedor.valor_combinado_total || 0) - (dadosAntigos.valor_combinado || 0),
            valor_recebido_total: (vendedor.valor_recebido_total || 0) - totalPagoAntigo,
            a_receber_total: (vendedor.a_receber_total || 0) - (dadosAntigos.falta_quanto || 0)
          });
          queryClient.invalidateQueries({ queryKey: ['vendedores'] });
        }
      }
      
      // Criar log de ação
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Editou agendamento: ${dados.cliente_nome} com ${dados.profissional_nome} - ${dados.data} às ${dados.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: id,
        dados_antigos: dadosAntigos ? JSON.stringify(dadosAntigos) : null,
        dados_novos: JSON.stringify(resultado)
      });
      
      console.log("✅ ATUALIZADO NO BANCO:", {
        id: resultado.id,
        dataRetornada: resultado.data
      });
      
      return resultado;
    },
    onSuccess: async () => {
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['logs-acoes'] });
    },
    onError: (error) => {
      console.error("❌ ERRO AO ATUALIZAR:", error);
      alert("Erro ao atualizar: " + error.message);
    }
  });

  const deletarAgendamentoMutation = useMutation({
    mutationFn: async ({ id, agendamento }) => {
      await base44.entities.Agendamento.delete(id);
      
      // Criar log de ação
      const isBloqueio = agendamento.status === "bloqueio" || agendamento.tipo === "bloqueio" || agendamento.cliente_nome === "FECHADO";
      await base44.entities.LogAcao.create({
        tipo: isBloqueio ? "desbloqueou_horario" : "excluiu_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: isBloqueio
          ? `Desbloqueou horário: ${agendamento.profissional_nome} - ${agendamento.data} às ${agendamento.hora_inicio}`
          : `Excluiu agendamento: ${agendamento.cliente_nome} com ${agendamento.profissional_nome} - ${agendamento.data} às ${agendamento.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: id,
        dados_antigos: JSON.stringify(agendamento)
      });
      
      return id;
    },
    onSuccess: async () => {
      await refetchAgendamentos();
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['logs-acoes'] });
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

  const handleBloquearHorario = async (unidadeId, profissionalId, horarioInicio, horarioFim) => {
    // Se horarioFim não foi passado (chamada com 3 parâmetros - bloqueio único)
    if (typeof horarioFim === 'undefined') {
      const horario = horarioInicio;
      
      // Comportamento antigo - bloquear apenas 1 slot
      return handleBloquearHorarioUnico(unidadeId, profissionalId, horario);
    }
    
    // Novo comportamento - bloquear período de horários
    console.log("🔒🔒🔒 ==================== INICIANDO BLOQUEIO DE PERÍODO ==================== 🔒🔒🔒");
    console.log("📊 ESTADO ATUAL:");
    console.log("  - dataAtual (Date object):", dataAtual.toString());
    console.log("  - Timezone do navegador:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("  - Usuário:", usuarioAtual?.email);
    console.log("  - Horário início:", horarioInicio);
    console.log("  - Horário fim:", horarioFim);
    
    const dataFormatada = formatarDataPura(dataAtual);
    console.log("📅 DATA DO BLOQUEIO (formatada PURA):", dataFormatada);

    // Verificar se o horário já passou
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const dataAtualComparar = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate());
    
    // Se a data é passada
    if (dataAtualComparar < hoje) {
      alert("⚠️ Não é possível bloquear horários em datas passadas!");
      return;
    }
    
    // Se é hoje, verificar se o horário já passou
    if (dataAtualComparar.getTime() === hoje.getTime()) {
      const [horaInicio] = horarioInicio.split(':').map(Number);
      const horarioAtual = agora.getHours();
      
      if (horaInicio < horarioAtual) {
        alert("⚠️ Não é possível bloquear horários que já passaram!");
        return;
      }
    }
    
    const unidade = unidades.find(u => u.id === unidadeId);
    const profissional = profissionais.find(p => p.id === profissionalId);
    
    console.log("👨‍⚕️ PROFISSIONAL:", profissional?.nome, "(ID:", profissionalId, ")");
    console.log("🏢 UNIDADE:", unidade?.nome, "(ID:", unidadeId, ")");
    
    const bloqueio = {
      cliente_nome: "FECHADO",
      profissional_id: profissionalId,
      profissional_nome: profissional?.nome || "",
      unidade_id: unidadeId,
      unidade_nome: unidade?.nome || "",
      servico_nome: "Horário Bloqueado",
      data: dataFormatada,
      hora_inicio: horarioInicio,
      hora_fim: horarioFim,
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
      console.log("🔒🔒🔒 ==================== FIM DO BLOQUEIO ==================== 🔒🔒🔒");
      
      alert(`✅ Horário BLOQUEADO com sucesso!\n\n📅 Data: ${dataFormatada}\n⏰ Horário: ${horarioInicio} - ${horarioFim}\n👨‍⚕️ Profissional: ${profissional?.nome}`);
      
    } catch (error) {
      console.error("❌❌❌ ERRO AO BLOQUEAR ❌❌❌");
      console.error("Detalhes completos:", error);
      console.error("Stack:", error.stack);
      alert("❌ Erro ao bloquear horário: " + error.message);
    }
  };
  
  const handleBloquearHorarioUnico = async (unidadeId, profissionalId, horario) => {
    console.log("🔒🔒🔒 ==================== INICIANDO BLOQUEIO ==================== 🔒🔒🔒");
    console.log("📊 ESTADO ATUAL:");
    console.log("  - dataAtual (Date object):", dataAtual.toString());
    console.log("  - Timezone do navegador:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("  - Usuário:", usuarioAtual?.email);
    console.log("  - Cargo:", usuarioAtual?.cargo);

    // CRÍTICO: usar formatarDataPura que usa métodos LOCAIS do Date
    const dataFormatada = formatarDataPura(dataAtual);

    console.log("📅 DATA DO BLOQUEIO (formatada PURA):", dataFormatada);

    // Verificar se já existe um bloqueio neste exato horário
    const bloqueioExistente = agendamentos.find(ag => 
      ag.data === dataFormatada &&
      ag.profissional_id === profissionalId &&
      ag.hora_inicio === horario &&
      (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO")
    );

    if (bloqueioExistente) {
      alert("⚠️ Este horário já está bloqueado!");
      return;
    }

    // Verificar se já existe algum agendamento (não bloqueio) neste horário
    const agendamentoExistente = agendamentos.find(ag => 
      ag.data === dataFormatada &&
      ag.profissional_id === profissionalId &&
      ag.hora_inicio === horario &&
      ag.status !== "bloqueio" &&
      ag.tipo !== "bloqueio" &&
      ag.cliente_nome !== "FECHADO"
    );

    if (agendamentoExistente) {
      alert("⚠️ Não é permitido bloquear este horário pois já está agendado!");
      return;
    }

    const unidade = unidades.find(u => u.id === unidadeId);
    const profissional = profissionais.find(p => p.id === profissionalId);

    const [hora, minuto] = horario.split(':').map(Number);
    // Corrigir cálculo da hora fim para bloqueio de 1 hora completa
    const horaFim = `${(hora + 1).toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;

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
    // Verificar se há bloqueio no horário
    const horarioBloqueado = agendamentos.find(ag => 
      ag.data === dados.data &&
      ag.profissional_id === dados.profissional_id &&
      ag.hora_inicio === dados.hora_inicio &&
      (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") &&
      ag.id !== dados.id // Ignorar se estiver editando o próprio registro
    );

    if (horarioBloqueado) {
      alert("⚠️ Não é possível agendar nesse horário porque está bloqueado!");
      return;
    }

    if (dados.id) {
      // Modo edição
      const { id, ...dadosSemId } = dados;
      const agendamentoAntigo = agendamentos.find(a => a.id === id);
      await atualizarAgendamentoMutation.mutateAsync({ id, dados: dadosSemId, dadosAntigos: agendamentoAntigo });
    } else {
      // Modo criação
      await criarAgendamentoMutation.mutateAsync(dados);
    }
    setDialogNovoAberto(false);
  };

  const handleEditarAgendamento = (agendamento) => {
    console.log("✏️ EDITANDO AGENDAMENTO:", agendamento.id);
    setAgendamentoInicial(agendamento);
    setDialogNovoAberto(true);
  };

  const handleDeletarAgendamento = async (id) => {
    console.log("🗑️🗑️🗑️ PROCESSANDO DELEÇÃO 🗑️🗑️🗑️");
    console.log("🆔 ID a deletar:", id);
    
    try {
      const agendamento = agendamentos.find(a => a.id === id);
      await deletarAgendamentoMutation.mutateAsync({ id, agendamento });
      
      console.log("✅ Deletado do banco com sucesso");
      console.log("🔄 Recarregando agendamentos...");
      
      setDialogDetalhesAberto(false);
      
      const isBloqueio = agendamento?.status === "bloqueio" || agendamento?.tipo === "bloqueio" || agendamento?.cliente_nome === "FECHADO";
      console.log("✅✅✅ OPERAÇÃO CONCLUÍDA ✅✅✅");
      alert(isBloqueio ? "✅ Horário desbloqueado com sucesso!" : "✅ Agendamento excluído com sucesso!");
      
    } catch (error) {
      console.error("❌❌❌ ERRO AO DELETAR ❌❌❌");
      console.error("Detalhes:", error);
      alert("❌ Erro ao deletar: " + error.message);
    }
  };

  const handleConfirmarAgendamento = async (agendamento) => {
    console.log("✅ CONFIRMANDO AGENDAMENTO:", agendamento.id);
    
    try {
      // Atualizar status para confirmado
      await atualizarAgendamentoMutation.mutateAsync({
        id: agendamento.id,
        dados: { ...agendamento, status: "confirmado", editor_email: usuarioAtual?.email },
        dadosAntigos: agendamento
      });
      
      // Criar log específico para confirmação
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Confirmou agendamento: ${agendamento.cliente_nome} com ${agendamento.profissional_nome} - ${agendamento.data} às ${agendamento.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: agendamento.id,
        dados_antigos: JSON.stringify({ status: agendamento.status }),
        dados_novos: JSON.stringify({ status: "confirmado" })
      });
      
      alert("✅ Agendamento confirmado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao confirmar:", error);
      alert("❌ Erro ao confirmar agendamento: " + error.message);
    }
  };

  const handleMudarStatus = async (agendamento, novoStatus) => {
    const statusAntigo = agendamento.status;

    if (statusAntigo === novoStatus) return; // Nenhuma mudança

    const statusLabelsLog = {
      confirmado: "Confirmado",
      agendado: "Agendado",
      ausencia: "Ausência",
      cancelado: "Cancelado",
      concluido: "Concluído"
    };

    try {
      // Lógica de descontabilização de sessão para clientes com pacote
      let dadosAtualizados = { ...agendamento, status: novoStatus, editor_email: usuarioAtual?.email };
      
      if (agendamento.cliente_pacote === "Sim" && agendamento.sessoes_feitas > 0) {
        // Se está mudando PARA cancelado e tinha sido contabilizada
        if (novoStatus === "cancelado" && statusAntigo !== "cancelado") {
          dadosAtualizados.sessoes_feitas = agendamento.sessoes_feitas - 1;
          console.log("⚠️ Descontabilizando sessão cancelada:", agendamento.sessoes_feitas, "→", dadosAtualizados.sessoes_feitas);
        }
        // Se está mudando DE cancelado para outro status
        else if (statusAntigo === "cancelado" && novoStatus !== "cancelado") {
          dadosAtualizados.sessoes_feitas = agendamento.sessoes_feitas + 1;
          console.log("✅ Recontabilizando sessão restaurada:", agendamento.sessoes_feitas, "→", dadosAtualizados.sessoes_feitas);
        }
      }

      await atualizarAgendamentoMutation.mutateAsync({
        id: agendamento.id,
        dados: dadosAtualizados,
        dadosAntigos: agendamento
      });

      // Criar log da mudança de status
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Alterou status de "${statusLabelsLog[statusAntigo]}" para "${statusLabelsLog[novoStatus]}": ${agendamento.cliente_nome} com ${agendamento.profissional_nome} - ${agendamento.data} às ${agendamento.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: agendamento.id,
        dados_antigos: JSON.stringify({ status: statusAntigo }),
        dados_novos: JSON.stringify({ status: novoStatus })
      });

    } catch (error) {
      console.error("❌ Erro ao mudar status:", error);
      alert("❌ Erro ao mudar status: " + error.message);
    }
  };

  const handleMudarStatusPaciente = async (agendamento, novoStatusPaciente) => {
    const statusAntigo = agendamento.status_paciente;

    if (statusAntigo === novoStatusPaciente) return;

    const statusPacienteLabels = {
      "": "-",
      "paciente_novo": "Paciente Novo",
      "primeira_sessao": "1ª Sessão",
      "ultima_sessao": "Última Sessão"
    };

    try {
      await atualizarAgendamentoMutation.mutateAsync({
        id: agendamento.id,
        dados: { ...agendamento, status_paciente: novoStatusPaciente, editor_email: usuarioAtual?.email },
        dadosAntigos: agendamento
      });

      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Alterou status do paciente de "${statusPacienteLabels[statusAntigo] || '-'}" para "${statusPacienteLabels[novoStatusPaciente]}": ${agendamento.cliente_nome}`,
        entidade_tipo: "Agendamento",
        entidade_id: agendamento.id,
        dados_antigos: JSON.stringify({ status_paciente: statusAntigo }),
        dados_novos: JSON.stringify({ status_paciente: novoStatusPaciente })
      });

    } catch (error) {
      console.error("❌ Erro ao mudar status do paciente:", error);
      alert("❌ Erro ao mudar status do paciente: " + error.message);
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

  // Filtrar por terapeuta se o usuário for um terapeuta
  const isProfissional = usuarioAtual?.cargo === "terapeuta";
  const profissionalDoUsuario = profissionais.find(p => p.email === usuarioAtual?.email);

  // Se for terapeuta e não tem profissional vinculado, redirecionar
  if (isProfissional && !profissionalDoUsuario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-bold mb-2">⚠️ Erro de Acesso</div>
          <p className="text-gray-600">Seu email não está vinculado a nenhum terapeuta.</p>
          <p className="text-sm text-gray-500 mt-2">Entre em contato com o administrador.</p>
        </div>
      </div>
    );
  }

  const agendamentosFiltrados = agendamentos.filter(ag => {
    // Se for terapeuta, mostrar apenas seus próprios agendamentos
    if (isProfissional && profissionalDoUsuario) {
      if (ag.profissional_id !== profissionalDoUsuario.id) {
        return false;
      }
    }
    
    // Restante dos filtros normais
    // Log detalhado para cada agendamento
    const isDataMatch = ag.data === dataFiltro;
    const isUnidadeMatch = !unidadeSelecionada || ag.unidade_id === unidadeSelecionada.id;
    const isClienteMatch = !filters.cliente || (
      (ag.cliente_nome && ag.cliente_nome.toLowerCase().includes(filters.cliente.toLowerCase())) ||
      (ag.cliente_telefone && ag.cliente_telefone.toLowerCase().includes(filters.cliente.toLowerCase()))
    );
    const isUnidadeFilterMatch = !filters.unidade || ag.unidade_id === filters.unidade;
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
    if (!isUnidadeFilterMatch) return false;
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

  // Verificar se é admin ou gerência - ambos têm permissões administrativas
  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin" || usuarioAtual?.cargo === "gerencia_unidades";

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* PAINEL DE DEBUG - APENAS PARA ADMINISTRADORES */}
      {isAdmin && (
        <div className="bg-yellow-100 border-b-2 border-yellow-400 p-3 text-xs font-mono">
          <div className="max-w-7xl mx-auto grid grid-cols-4 gap-4">
            <div>
              <strong>👤 Usuário:</strong> {usuarioAtual?.email || "carregando..."}
            </div>
            <div>
              <strong>🌍 Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </div>
            <div>
              <strong>📅 Data Atual (raw):</strong> {dataAtual.toISOString()}
            </div>
            <div>
              <strong>📅 Data Formatada:</strong> {formatarDataPura(dataAtual)}
            </div>
            <div className="col-span-2">
              <strong>📊 Agendamentos:</strong> Total: {agendamentos.length} | Filtrados: {agendamentosFiltrados.length}
            </div>
            <div className="col-span-2">
              <strong>🔒 Bloqueios:</strong> Total: {agendamentos.filter(a => a.status === "bloqueio" || a.tipo === "bloqueio" || a.cliente_nome === "FECHADO").length} | Visíveis: {agendamentosFiltrados.filter(a => a.status === "bloqueio" || a.tipo === "bloqueio" || a.cliente_nome === "FECHADO").length}
            </div>
          </div>
        </div>
      )}

      <AgendaHeader
        dataAtual={dataAtual}
        unidades={unidades}
        unidadeSelecionada={unidadeSelecionada}
        onUnidadeChange={setUnidadeSelecionada}
        onDataChange={setDataAtual}
        onNovoAgendamento={isProfissional ? null : handleNovoAgendamento}
        usuarioAtual={usuarioAtual}
        isProfissional={isProfissional}
      />

      <div className="flex-1 flex overflow-hidden relative">
                {/* Botão para abrir filtros */}
                <Button
                  variant="outline"
                  size="sm"
                  className="fixed bottom-4 left-4 z-50 bg-white shadow-lg border-blue-300"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                >
                  {mostrarFiltros ? <X className="w-4 h-4 mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
                  {mostrarFiltros ? "Fechar" : "Filtros"}
                </Button>

                {/* Botão para abrir menu de conta */}
                <Button
                  variant="outline"
                  size="sm"
                  className="fixed bottom-4 right-4 z-50 bg-white shadow-lg border-gray-300"
                  onClick={() => setMenuContaAberto(!menuContaAberto)}
                >
                  <User className="w-4 h-4 mr-2" />
                  Conta
                </Button>

                {/* Filtros: Aparece apenas quando clicado */}
                {mostrarFiltros && (
                  <div className="absolute z-40 h-full">
                    <AgendaFilters
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      clientes={clientes}
                      profissionais={profissionais}
                      servicos={servicos}
                      unidades={unidades}
                      agendamentos={agendamentos}
                    />
                  </div>
                )}

                {/* Overlay para fechar filtros */}
                {mostrarFiltros && (
                  <div 
                    className="fixed inset-0 bg-black/30 z-30"
                    onClick={() => setMostrarFiltros(false)}
                  />
                )}

        {unidadeAtual && (
          <AgendaDiaView
            agendamentos={agendamentosFiltrados}
            unidadeSelecionada={unidadeAtual}
            profissionais={isProfissional ? [profissionalDoUsuario].filter(Boolean) : profissionais}
            configuracoes={isProfissional ? configuracoes.filter(c => c.profissional_id === profissionalDoUsuario?.id) : configuracoes}
            onAgendamentoClick={handleAgendamentoClick}
            onNovoAgendamento={handleNovoAgendamentoSlot}
            onBloquearHorario={handleBloquearHorario}
            onStatusChange={handleMudarStatus}
            onStatusPacienteChange={handleMudarStatusPaciente}
            usuarioAtual={usuarioAtual}
            dataAtual={dataAtual}
            excecoesHorario={excecoesHorario}
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
        modoEdicao={!!agendamentoInicial?.id}
        agendamentos={agendamentos}
        isTerapeuta={isProfissional}
      />

      <DetalhesAgendamentoDialog
        open={dialogDetalhesAberto}
        onOpenChange={setDialogDetalhesAberto}
        agendamento={agendamentoSelecionado}
        onDelete={handleDeletarAgendamento}
        onEdit={handleEditarAgendamento}
        onConfirmar={handleConfirmarAgendamento}
        usuarioAtual={usuarioAtual}
      />

      {/* Menu de Conta */}
      {menuContaAberto && usuarioAtual && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setMenuContaAberto(false)}
          />
          {/* Menu */}
          <MenuConta 
            usuarioAtual={usuarioAtual}
            onClose={() => setMenuContaAberto(false)}
          />
        </>
      )}

      {/* Alertas Modal */}
      <AlertasModal usuarioAtual={usuarioAtual} />
      </div>
      );
      }