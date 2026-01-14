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
  return `${ano}-${mes}-${dia}`;
};

// FUNÇÃO CRÍTICA: Converte string YYYY-MM-DD para Date object LOCAL
// Criar data com new Date(ano, mes, dia) - isso cria no timezone LOCAL do navegador
export const criarDataPura = (dataString) => {
  if (!dataString || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
    return new Date();
  }
  
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

// FUNÇÃO CRÍTICA: Normaliza qualquer formato de data para YYYY-MM-DD
export const normalizarData = (valor) => {
  if (!valor) {
    return null;
  }
  
  // Já está no formato correto YYYY-MM-DD
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor;
  }
  
  // String com timestamp (ex: "2025-11-13T00:00:00.000Z" ou "2025-11-13T00:00:00")
  if (typeof valor === 'string' && valor.includes('T')) {
    const resultado = valor.split('T')[0];
    // Validar se é YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(resultado)) {
      return resultado;
    }
    // Se não conseguir extrair, tentar fazer parse completo
    try {
      const data = new Date(valor);
      if (!isNaN(data.getTime())) {
        return formatarDataPura(data);
      }
    } catch (e) {
      // Continua
    }
  }
  
  // É um Date object - usar métodos LOCAIS
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return formatarDataPura(valor);
  }
  
  // Último recurso: tentar parsear como Date
  try {
    const data = new Date(valor);
    if (!isNaN(data.getTime())) {
      return formatarDataPura(data);
    }
  } catch (e) {
    // Silent fail
  }
  
  return null;
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
    (async () => {
        try {
          // 🔄 SINCRONIZAR: Buscar usuário ATUALIZADO do banco PELA EMAIL
          const userSession = await base44.auth.me();

          // VALIDAÇÃO: Usuário sem cargo OU (não-admin sem unidades) é bloqueado
          const cargo = userSession?.cargo || "";
          const isAdmin = userSession?.email === 'lucagamerbr07@gmail.com' || userSession?.role === "admin";

          if (!isAdmin && !cargo) {
            alert("❌ Usuário não configurado. Aguarde o administrador configurar seu cargo e permissões.");
            window.location.href = createPageUrl("Home");
            return;
          }

          // VALIDAÇÃO: Não-admin sem unidades atribuídas é bloqueado
          if (!isAdmin && cargo) {
            const usuariosBanco = await base44.entities.User.list();
            const usuarioBanco = usuariosBanco.find(u => u.email === userSession.email);
            
            let unidadesAcesso = usuarioBanco?.unidades_acesso || [];
            if (typeof unidadesAcesso === 'string') {
              try {
                unidadesAcesso = JSON.parse(unidadesAcesso);
              } catch (e) {
                unidadesAcesso = [];
              }
            }
            
            if (!Array.isArray(unidadesAcesso) || unidadesAcesso.length === 0) {
              alert("❌ Nenhuma unidade atribuída. Aguarde o administrador atribuir permissões de unidade.");
              window.location.href = createPageUrl("Home");
              return;
            }
          }

          // FONTE DE VERDADE: Banco de dados
          const usuariosBanco = await base44.entities.User.list();
          const usuarioBanco = usuariosBanco.find(u => u.email === userSession.email);

          if (!usuarioBanco) {
            console.error("❌ Usuário não encontrado no banco:", userSession.email);
            setUsuarioAtual(userSession);
            return;
          }

        // USAR DADOS DO BANCO COMO FONTE DE VERDADE
        let user = { ...userSession, ...usuarioBanco };

        console.log(`✅ Sincronizado ${user.email}:`, { 
          cargo: user.cargo, 
          unidades: user.unidades_acesso 
        });

        // MIGRAR CARGOS ANTIGOS
        const cargoLower = (user?.cargo || "").toLowerCase().trim();
        if (cargoLower.includes("gerencia_unidade_")) {
          console.log(`🔄 Migrando cargo de ${user.email}: ${user.cargo} → gerencia_unidades`);
          await base44.entities.User.update(user.id, { cargo: "gerencia_unidades" });
          user.cargo = "gerencia_unidades";
        }

        // GARANTIR ARRAY
        let unidadesAcessoFinal = user.unidades_acesso || [];
        if (typeof unidadesAcessoFinal === 'string') {
          try {
            unidadesAcessoFinal = JSON.parse(unidadesAcessoFinal);
          } catch (e) {
            unidadesAcessoFinal = [];
          }
        }
        if (!Array.isArray(unidadesAcessoFinal)) {
          unidadesAcessoFinal = [];
        }
        user.unidades_acesso = unidadesAcessoFinal;

        setUsuarioAtual(user);

        // Verificar prontuários atrasados
        const verificarAtrasados = async () => {
          try {
            await base44.functions.invoke('verificarProntuariosAtrasados', {});
          } catch (error) {
            console.error("Erro ao verificar prontuários atrasados:", error);
          }
        };

        verificarAtrasados();
        const intervalo = setInterval(verificarAtrasados, 5 * 60 * 1000);

        // Gerenciar sessão única
        await gerenciarSessaoUnica(user);

        return () => clearInterval(intervalo);
      } catch (error) {
        console.error("❌ Erro ao carregar usuário:", error);
      }
    })();
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

      // Buscar e limpar dispositivos DUPLICADOS DO MESMO USUÁRIO no mesmo IP+dispositivo
          // CRÍTICO: Filtrar por usuario_email para evitar misturar contas!
          const todosDispositivos = await base44.entities.DispositivoConectado.filter({ 
            usuario_email: user.email,  // ⚠️ ISOLADO POR USUÁRIO
            dispositivo: dispositivo,
            ip: ip,
            sessao_ativa: true  // Apenas contar sessões ativas
          });

          if (todosDispositivos.length > 1) {
            // Ordenar por data_login (mais recente primeiro)
            const ordenados = todosDispositivos.sort((a, b) => 
              new Date(b.data_login) - new Date(a.data_login)
            );

            // Manter apenas o mais recente deste USUÁRIO, deletar os outros
            for (let i = 1; i < ordenados.length; i++) {
              console.log(`🗑️ Removendo dispositivo antigo de ${user.email}: ${ordenados[i].id}`);
              await base44.entities.DispositivoConectado.delete(ordenados[i].id);
            }
          }

      // Buscar todas as sessões ativas do usuário
      const todasSessoes = await base44.entities.SessaoAtiva.filter({ 
        usuario_email: user.email,
        dispositivo: dispositivo,
        ip: ip
      });

      if (todasSessoes.length > 1) {
        // Manter apenas a mais recente, deletar as outras
        const ordenadas = todasSessoes.sort((a, b) => 
          new Date(b.ultima_atividade) - new Date(a.ultima_atividade)
        );

        for (let i = 1; i < ordenadas.length; i++) {
          await base44.entities.SessaoAtiva.delete(ordenadas[i].id);
        }
      }

      // Buscar sessões ativas DO MESMO USUÁRIO (isolado por email)
      const sessoesAtivas = await base44.entities.SessaoAtiva.filter({ 
        usuario_email: user.email  // ⚠️ ISOLADO POR USUÁRIO
      });

      // Verificar se já existe sessão COM MESMO DISPOSITIVO E IP (mesmo navegador/máquina)
      // Mas APENAS para este usuário (filtro de email já garante)
      const sessaoExistente = sessoesAtivas.find(s => 
        s.dispositivo === dispositivo && s.ip === ip
      );

      if (sessaoExistente) {
        // Se já existe, apenas atualizar a última atividade e sessaoId
        await base44.entities.SessaoAtiva.update(sessaoExistente.id, {
          sessao_id: sessaoId,
          ultima_atividade: new Date().toISOString()
        });

        // Buscar dispositivo conectado correspondente (deve haver apenas 1 agora)
        const dispositivosConectados = await base44.entities.DispositivoConectado.filter({ 
          usuario_email: user.email,
          dispositivo: dispositivo,
          ip: ip,
          sessao_ativa: true
        });

        if (dispositivosConectados.length > 0) {
          // Atualizar apenas o primeiro (já limpamos duplicados acima)
          await base44.entities.DispositivoConectado.update(dispositivosConectados[0].id, {
            data_login: new Date().toISOString()
          });
        } else {
          // Se não existe, criar um novo
          await base44.entities.DispositivoConectado.create({
            usuario_email: user.email,
            dispositivo: dispositivo,
            ip: ip,
            data_login: new Date().toISOString(),
            sessao_ativa: true
          });
        }
      } else {
        // Verificar limite de 3 dispositivos DIFERENTES POR USUÁRIO
        // ⚠️ CRÍTICO: Apenas contar dispositivos deste usuário (usuario_email)
        const dispositivosAtivos = await base44.entities.DispositivoConectado.filter({ 
          usuario_email: user.email,  // Isolado por usuário
          sessao_ativa: true
        });

        // Contar dispositivos únicos (por IP + dispositivo) DO MESMO USUÁRIO
        const dispositivosUnicos = new Map();
        dispositivosAtivos.forEach(d => {
          const chave = `${d.ip}-${d.dispositivo}`;
          if (!dispositivosUnicos.has(chave) || new Date(d.data_login) > new Date(dispositivosUnicos.get(chave).data_login)) {
            dispositivosUnicos.set(chave, d);
          }
        });

        console.log(`📊 ${user.email} tem ${dispositivosUnicos.size} dispositivos ativos`);

        if (dispositivosUnicos.size >= 3) {
          // Se já tem 3 dispositivos DIFERENTES deste usuário, remover o mais antigo
          const dispositivos = Array.from(dispositivosUnicos.values());
          const maisAntigo = dispositivos.sort((a, b) => 
            new Date(a.data_login) - new Date(b.data_login)
          )[0];

          if (maisAntigo) {
            console.log(`🗑️ Removendo dispositivo antigo de ${user.email}: ${maisAntigo.dispositivo}`);
            await base44.entities.DispositivoConectado.update(maisAntigo.id, {
              sessao_ativa: false
            });

            // Remover sessão ativa correspondente (APENAS do mesmo usuário)
            const sessaoAntiga = await base44.entities.SessaoAtiva.filter({
              usuario_email: user.email,  // Isolado por usuário
              dispositivo: maisAntigo.dispositivo,
              ip: maisAntigo.ip
            });
            if (sessaoAntiga.length > 0) {
              await base44.entities.SessaoAtiva.delete(sessaoAntiga[0].id);
            }
          }
        }

        // Criar nova sessão ativa
        await base44.entities.SessaoAtiva.create({
          usuario_email: user.email,
          sessao_id: sessaoId,
          dispositivo: dispositivo,
          ip: ip,
          ultima_atividade: new Date().toISOString()
        });

        // Registrar dispositivo conectado
        await base44.entities.DispositivoConectado.create({
          usuario_email: user.email,
          dispositivo: dispositivo,
          ip: ip,
          data_login: new Date().toISOString(),
          sessao_ativa: true
        });

        // Registrar login no log APENAS em novo dispositivo
        await base44.entities.LogAcao.create({
          tipo: "login",
          usuario_email: user.email,
          descricao: `Login realizado em ${dispositivo}`,
          entidade_tipo: "Usuario"
        });
      }

      // Verificar periodicamente se a sessão DESTE USUÁRIO ainda é válida
      // ⚠️ CRÍTICO: Verificar APENAS se a sessão deste usuário foi removida (não confundir com outro usuário)
      const verificarSessao = setInterval(async () => {
        try {
          const sessoesAtuais = await base44.entities.SessaoAtiva.filter({ 
            usuario_email: user.email,  // Isolado por usuário
            sessao_id: sessaoId
          });

          // Se não encontrar a sessão deste usuário, significa que foi desconectada
          if (sessoesAtuais.length === 0) {
            console.log(`⚠️ Sessão de ${user.email} foi removida (limite de 3 dispositivos excedido)`);
            clearInterval(verificarSessao);
            alert("Você foi desconectado porque acessou em mais de 3 dispositivos diferentes.");
            base44.auth.logout();
          } else {
            // Atualizar última atividade apenas da sessão deste usuário
            await base44.entities.SessaoAtiva.update(sessoesAtuais[0].id, {
              ultima_atividade: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Erro ao verificar sessão:", error);
        }
      }, 10000); // Verificar a cada 10 segundos

      // Limpar intervalo quando componente desmontar
      return () => clearInterval(verificarSessao);
    } catch (error) {
      console.error("Erro ao gerenciar sessão:", error);
    }
  };

  const { data: agendamentos = [], refetch: refetchAgendamentos } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: async () => {
      const lista = await base44.entities.Agendamento.list("-data");

      // NORMALIZAR TODAS AS DATAS NA ENTRADA
      return lista.map(ag => {
        const dataNormalizada = normalizarData(ag.data);
        if (dataNormalizada !== ag.data) {
          console.warn(`⚠️ Data normalizada para agendamento ${ag.id}: "${ag.data}" → "${dataNormalizada}"`);
        }
        return { ...ag, data: dataNormalizada };
      });
    },
    initialData: [],
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list("nome"),
    initialData: [],
    staleTime: Infinity,
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
    staleTime: Infinity,
  });

  const { data: todasUnidades = [], isLoading: unidadesCarregando } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
    staleTime: Infinity,  // Não refetch automático
  });

  // CRÍTICO: Filtragem de unidades por cargo
        const unidades = React.useMemo(() => {
          if (!usuarioAtual || todasUnidades.length === 0) {
            return [];
          }

          const cargoLower = (usuarioAtual.cargo || "").toLowerCase().trim();
          const isSuperAdmin = usuarioAtual.email === 'lucagamerbr07@gmail.com';

          // ADMINISTRADOR e SUPER ADMIN veem TODAS as unidades
          if (isSuperAdmin || cargoLower === "administrador" || usuarioAtual.role === "admin") {
            return todasUnidades;
          }

          // ✅ VALIDAÇÃO: FUNCIONÁRIO DEVE VER APENAS SUAS UNIDADES ATRIBUÍDAS
          // Se é funcionário ou qualquer outro cargo, filtrar por unidades_acesso
          let unidadesAcesso = [];

          console.log("🔍 DEBUG UNIDADES AGENDA:", {
            cargo: cargoLower,
            unidades_acesso_raw: usuarioAtual.unidades_acesso,
            tipo: typeof usuarioAtual.unidades_acesso
          });

          // Sempre parsear como STRING JSON - formato único
          if (typeof usuarioAtual.unidades_acesso === 'string') {
            try {
              const parsed = JSON.parse(usuarioAtual.unidades_acesso);
              unidadesAcesso = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn("⚠️ Erro ao parsear unidades_acesso:", e);
              unidadesAcesso = [];
            }
          } else if (Array.isArray(usuarioAtual.unidades_acesso)) {
            unidadesAcesso = usuarioAtual.unidades_acesso;
          }

          console.log("✅ UNIDADES_ACESSO FINAL (ARRAY):", unidadesAcesso);

          // Retornar APENAS as unidades que o usuário tem acesso
          const resultado = todasUnidades.filter(u => unidadesAcesso.includes(u.id));
          console.log("📊 UNIDADES VISÍVEIS AGENDA:", resultado.map(u => u.nome));

          return resultado;
        }, [todasUnidades, usuarioAtual]);

  // Se unidadeSelecionada não estiver nas unidades filtradas, selecionar a primeira
  React.useEffect(() => {
    if (unidades.length > 0 && !unidadeSelecionada) {
      setUnidadeSelecionada(unidades[0]);
    } else if (unidades.length > 0 && unidadeSelecionada && !unidades.find(u => u.id === unidadeSelecionada.id)) {
      setUnidadeSelecionada(unidades[0]);
    }
  }, [unidades, unidadeSelecionada]);

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list("nome"),
    initialData: [],
    staleTime: Infinity,
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.ConfiguracaoTerapeuta.list("ordem"),
    initialData: [],
    staleTime: Infinity,
  });

  const { data: excecoesHorario = [] } = useQuery({
    queryKey: ['excecoes-horario'],
    queryFn: () => base44.entities.HorarioExcecao.list("-data"),
    initialData: [],
    staleTime: Infinity,
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
    // ✅ VALIDAÇÃO: Verificar permissão para criar agendamento
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const isAdmin = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin";
    const isGerencia = cargoLower === "gerencia_unidades";
    const isVendedor = cargoLower === "vendedor";
    const isRecepcao = cargoLower === "recepcao";
    const isFuncionario = cargoLower === "funcionario" || cargoLower === "funcionário";
    
    const temPermissao = isAdmin || isGerencia || isVendedor || isRecepcao || isFuncionario;
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para criar agendamentos!");
      return;
    }

    setAgendamentoInicial({});
    setDialogNovoAberto(true);
  };

  const handleNovoAgendamentoSlot = (unidadeId, profissionalId, horario) => {
    // ✅ VALIDAÇÃO: Verificar permissão para criar agendamento
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const isAdmin = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin";
    const isGerencia = cargoLower === "gerencia_unidades";
    const isVendedor = cargoLower === "vendedor";
    const isRecepcao = cargoLower === "recepcao";
    const isFuncionario = cargoLower === "funcionario" || cargoLower === "funcionário";
    
    const temPermissao = isAdmin || isGerencia || isVendedor || isRecepcao || isFuncionario;
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para criar agendamentos!");
      return;
    }

    const unidade = unidades.find(u => u.id === unidadeId);
    const profissional = profissionais.find(p => p.id === profissionalId);
    
    const [hora, minuto] = horario.split(':').map(Number);
    const horaFim = `${(hora + 1).toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
    
    const dataFormatada = formatarDataPura(dataAtual);
    
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
    // ✅ VALIDAÇÃO: Apenas ADMIN e GERÊNCIA podem bloquear
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const temPermissao = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin" || cargoLower === "gerencia_unidades";
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para bloquear horários!");
      return;
    }

    // Se horarioFim não foi passado (chamada com 3 parâmetros - bloqueio único)
    if (typeof horarioFim === 'undefined') {
      const horario = horarioInicio;
      
      // Comportamento antigo - bloquear apenas 1 slot
      return handleBloquearHorarioUnico(unidadeId, profissionalId, horario);
    }
    
    // Novo comportamento - bloquear período de horários
    const dataFormatada = formatarDataPura(dataAtual);

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
    
    try {
      const resultado = await criarAgendamentoMutation.mutateAsync(bloqueio);
      
      alert(`✅ Horário BLOQUEADO com sucesso!\n\n📅 Data: ${dataFormatada}\n⏰ Horário: ${horarioInicio} - ${horarioFim}\n👨‍⚕️ Profissional: ${profissional?.nome}`);
      
    } catch (error) {
      alert("❌ Erro ao bloquear horário: " + error.message);
    }
  };
  
  const handleBloquearHorarioUnico = async (unidadeId, profissionalId, horario) => {
    // ✅ VALIDAÇÃO: Apenas ADMIN e GERÊNCIA podem bloquear
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const temPermissao = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin" || cargoLower === "gerencia_unidades";
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para bloquear horários!");
      return;
    }

    // CRÍTICO: usar formatarDataPura que usa métodos LOCAIS do Date
    const dataFormatada = formatarDataPura(dataAtual);

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
    
    try {
      const resultado = await criarAgendamentoMutation.mutateAsync(bloqueio);
      
      alert(`✅ Horário BLOQUEADO com sucesso!\n\n📅 Data: ${dataFormatada}\n⏰ Horário: ${horario}\n👨‍⚕️ Profissional: ${profissional?.nome}`);
      
    } catch (error) {
      alert("❌ Erro ao bloquear horário: " + error.message);
    }
  };

  const handleAgendamentoClick = (agendamento) => {
    setAgendamentoSelecionado(agendamento);
    setDialogDetalhesAberto(true);
  };

  const handleSalvarAgendamento = async (dados) => {
    // ✅ VALIDAÇÃO: Verificar permissão para salvar/editar agendamento
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const isAdmin = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin";
    const isGerencia = cargoLower === "gerencia_unidades";
    const isVendedor = cargoLower === "vendedor";
    const isRecepcao = cargoLower === "recepcao";
    const isFuncionario = cargoLower === "funcionario" || cargoLower === "funcionário";
    const isTerapeuta = cargoLower === "terapeuta" && profissionalDoUsuario?.id === dados.profissional_id;
    
    const temPermissao = isAdmin || isGerencia || isVendedor || isRecepcao || isFuncionario || (isTerapeuta && dados.id);
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para salvar/editar agendamentos!");
      return;
    }

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
    // ✅ VALIDAÇÃO: Verificar permissão para editar
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const isAdmin = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin";
    const isGerencia = cargoLower === "gerencia_unidades";
    const isRecepcao = cargoLower === "recepcao";
    const isFuncionario = cargoLower === "funcionario" || cargoLower === "funcionário";
    const isTerapeuta = cargoLower === "terapeuta" && profissionalDoUsuario?.id === agendamento.profissional_id;
    
    const temPermissao = isAdmin || isGerencia || isRecepcao || isFuncionario || isTerapeuta;
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para editar este agendamento!");
      return;
    }

    console.log("✏️ EDITANDO AGENDAMENTO:", agendamento.id);
    setAgendamentoInicial(agendamento);
    setDialogNovoAberto(true);
  };

  const handleDeletarAgendamento = async (id) => {
    // ✅ VALIDAÇÃO: Apenas ADMIN e GERÊNCIA podem deletar
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const temPermissao = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin" || cargoLower === "gerencia_unidades";
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para deletar agendamentos!");
      return;
    }

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
    // ✅ VALIDAÇÃO: Apenas ADMIN, GERÊNCIA e RECEPÇÃO podem confirmar
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const temPermissao = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin" || cargoLower === "gerencia_unidades" || cargoLower === "recepcao";
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para confirmar agendamentos!");
      return;
    }

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
    // ✅ VALIDAÇÃO: Quem pode mudar status? Admin, Gerência, Recepção e Terapeuta (só seu próprio)
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const isAdmin = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin";
    const isGerencia = cargoLower === "gerencia_unidades";
    const isRecepcao = cargoLower === "recepcao";
    const isTerapeuta = cargoLower === "terapeuta" && profissionalDoUsuario?.id === agendamento.profissional_id;
    
    const temPermissao = isAdmin || isGerencia || isRecepcao || isTerapeuta;
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para mudar status de agendamentos!");
      return;
    }

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
    // ✅ VALIDAÇÃO: Apenas ADMIN, GERÊNCIA, VENDEDOR e RECEPÇÃO podem mudar status do paciente
    const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
    const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
    const temPermissao = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin" || cargoLower === "gerencia_unidades" || cargoLower === "vendedor" || cargoLower === "recepcao";
    
    if (!temPermissao) {
      alert("❌ Você não tem permissão para mudar status do paciente!");
      return;
    }

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
  // Garantir que unidadeSelecionada está definida
  const unidadeFinal = unidadeSelecionada || unidades[0];

  const dataFiltro = formatarDataPura(dataAtual);

  // Filtrar por terapeuta se o usuário for um terapeuta
  const profissionalDoUsuario = profissionais.find(p => 
    p.email && usuarioAtual?.email && p.email.toLowerCase() === usuarioAtual.email.toLowerCase()
  );
  const isProfissional = usuarioAtual?.cargo === "terapeuta" && !!profissionalDoUsuario;



const agendamentosFiltrados = agendamentos.filter(ag => {
        // Validação básica
        if (!ag || !ag.unidade_id) return false;

        // Garantir que data está normalizada
        if (!ag.data || typeof ag.data !== 'string') return false;

        // ADMINISTRADORES E SUPER ADMIN VEEM TUDO
        const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
        const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
        const ehAdmin = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin";

        if (ehAdmin) {
          // Mesmo admin, filtrar por unidade se selecionada
          const isDataMatch = ag.data === dataFiltro;
          const isUnidadeMatch = !unidadeFinal || ag.unidade_id === unidadeFinal.id;
          return isDataMatch && isUnidadeMatch;
        }

        // CRÍTICO: Todos os OUTROS (gerencia_unidades, financeiro, etc) veem APENAS suas unidades
        let unidadesAcesso = [];

        if (typeof usuarioAtual?.unidades_acesso === 'string') {
          try {
            const parsed = JSON.parse(usuarioAtual.unidades_acesso);
            unidadesAcesso = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            unidadesAcesso = [];
          }
        } else if (Array.isArray(usuarioAtual?.unidades_acesso)) {
          unidadesAcesso = usuarioAtual.unidades_acesso;
        }

        // Filtro de unidade - obrigatório para não-admin
        if (unidadesAcesso.length > 0 && !unidadesAcesso.includes(ag.unidade_id)) {
          return false;
        }

    // Se for terapeuta, mostrar apenas seus próprios agendamentos
    if (isProfissional && profissionalDoUsuario) {
      const pertence = ag.profissional_id === profissionalDoUsuario.id;
      if (!pertence) {
        return false;
      }
    }

    // Filtros principais
    const isDataMatch = ag.data === dataFiltro;
    const isUnidadeMatch = !unidadeFinal || ag.unidade_id === unidadeFinal.id;
    const isClienteMatch = !filters.cliente || (
      (ag.cliente_nome && ag.cliente_nome.toLowerCase().includes(filters.cliente.toLowerCase())) ||
      (ag.cliente_telefone && ag.cliente_telefone.toLowerCase().includes(filters.cliente.toLowerCase()))
    );
    const isUnidadeFilterMatch = !filters.unidade || ag.unidade_id === filters.unidade;
    const isProfissionalMatch = !filters.profissional || ag.profissional_id === filters.profissional;
    const isServicoMatch = !filters.servico || ag.servico_id === filters.servico;
    const isStatusMatch = !filters.status || ag.status === filters.status;
    const isDataFilterMatch = !filters.data || ag.data === filters.data;

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



  const unidadeAtual = unidadeFinal;

    // Definição de papéis para controle de acesso
  // Aguardar carregamento de dados críticos
  if (!usuarioAtual || unidadesCarregando) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* PAINEL DE DEBUG - APENAS PARA ADMINISTRADORES */}
      {usuarioAtual?.email === 'lucagamerbr07@gmail.com' && (
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

      {/* Header já usa 'unidades' que está filtrado */}
      {usuarioAtual && (() => {
       const unidadesParaMostrar = unidades;
       const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();



        // Se não tem unidades permitidas, não renderizar nada
        if (unidadesParaMostrar.length === 0) {
          return (
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="text-red-600 font-semibold">❌ Você não tem acesso a nenhuma unidade.</div>
            </div>
          );
        }

        return (
          <AgendaHeader
            dataAtual={dataAtual}
            unidades={unidadesParaMostrar}
            unidadeSelecionada={unidadeSelecionada || unidadesParaMostrar[0]}
            onUnidadeChange={setUnidadeSelecionada}
            onDataChange={setDataAtual}
            onNovoAgendamento={handleNovoAgendamento}
            usuarioAtual={usuarioAtual}
          />
        );
      })()}


      <div className="flex-1 flex overflow-hidden relative">
                {/* Mensagem quando funcionário não tem unidades */}
                {usuarioAtual?.cargo === "funcionario" && unidades.length === 0 && (
                  <div className="flex-1 flex items-center justify-center bg-white">
                    <div className="text-center">
                      <p className="text-gray-500 text-lg">Nenhuma unidade atribuída</p>
                      <p className="text-gray-400 text-sm mt-2">Aguarde a atribuição de uma unidade para acessar a agenda</p>
                    </div>
                  </div>
                )}

                {usuarioAtual?.cargo !== "funcionario" || unidades.length > 0 ? (
                  <>
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
                  </>
                ) : null}

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

                {(usuarioAtual?.cargo !== "funcionario" || (usuarioAtual?.cargo === "funcionario" && unidades.length > 0)) && unidadeAtual && (() => {
          // Filtro de profissionais por unidade da gerência
          let profissionaisPermitidos = profissionais;
          const cargoLower = (usuarioAtual?.cargo || "").toLowerCase().trim();
          const isSuperAdmin = usuarioAtual?.email === 'lucagamerbr07@gmail.com';
          const isAdmin = isSuperAdmin || cargoLower === "administrador" || usuarioAtual?.role === "admin";

          // ✅ VALIDAÇÃO: Se for TERAPEUTA, mostra APENAS a si mesmo
          if (cargoLower === "terapeuta" && profissionalDoUsuario) {
            profissionaisPermitidos = [profissionalDoUsuario];
          } else if (isAdmin) {
            // Admin vê TODOS os profissionais
            profissionaisPermitidos = profissionais;
          } else {
            // Para gerência e outros, filtrar por unidades de acesso
            let unidadesAcesso = usuarioAtual?.unidades_acesso || [];
            if (typeof unidadesAcesso === 'string') {
              try {
                unidadesAcesso = JSON.parse(unidadesAcesso);
              } catch (e) {
                unidadesAcesso = [];
              }
            } else if (!Array.isArray(unidadesAcesso)) {
              unidadesAcesso = [];
            }

            profissionaisPermitidos = profissionais.filter(p => {
              const configs = configuracoes.filter(c => c.profissional_id === p.id);
              return configs.some(c => unidadesAcesso.includes(c.unidade_id));
            });
          }

          return (
            <AgendaDiaView
              agendamentos={agendamentosFiltrados}
              unidadeSelecionada={unidadeAtual}
              profissionais={profissionaisPermitidos}
              configuracoes={configuracoes}
              onAgendamentoClick={handleAgendamentoClick}
              onNovoAgendamento={handleNovoAgendamentoSlot}
              onBloquearHorario={handleBloquearHorario}
              onStatusChange={handleMudarStatus}
              onStatusPacienteChange={handleMudarStatusPaciente}
              usuarioAtual={usuarioAtual}
              dataAtual={dataAtual}
              excecoesHorario={excecoesHorario}
            />
            );
            })()}
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