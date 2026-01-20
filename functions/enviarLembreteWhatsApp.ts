import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Pegar parâmetros da requisição
    const body = await req.json().catch(() => ({}));
    const numeroTeste = body.numeroTeste; // Número opcional para teste
    const envioImediato = body.envioImediato; // Envio imediato ao ativar
    const unidadeId = body.unidadeId; // ID da unidade para envio imediato
    const verificarConfig = body.verificarConfig; // Apenas verificar se a config existe
    
    // Verificar autenticação apenas para chamadas manuais (teste/verificação)
    let user = null;
    if (numeroTeste || envioImediato || verificarConfig) {
      user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    // Configurações da API do WhatsApp (Z-API APENAS)
    const WHATSAPP_INSTANCE_ID = (Deno.env.get("WHATSAPP_INSTANCE_ID") || "").trim();
    const WHATSAPP_INSTANCE_TOKEN = (Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "").trim();

    // Se for apenas verificação de configuração
    if (verificarConfig) {
      if (!WHATSAPP_INSTANCE_ID || !WHATSAPP_INSTANCE_TOKEN) {
        return Response.json({ 
          error: 'Credenciais Z-API não configuradas completamente' 
        });
      }
      return Response.json({ success: true, configurado: true });
    }

    if (!WHATSAPP_INSTANCE_ID || !WHATSAPP_INSTANCE_TOKEN) {
      return Response.json({ 
        error: 'Credenciais Z-API incompletas',
        instanceIdOk: !!WHATSAPP_INSTANCE_ID,
        instanceTokenOk: !!WHATSAPP_INSTANCE_TOKEN
      }, { status: 500 });
    }

    // Obter data/hora atual em Brasília
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    // Calcular data/hora para 1 dia e 12 horas à frente
    const umDiaFrente = new Date(agoraBrasilia);
    umDiaFrente.setDate(umDiaFrente.getDate() + 1);
    
    const dozeHorasFrente = new Date(agoraBrasilia);
    dozeHorasFrente.setHours(dozeHorasFrente.getHours() + 12);

    // Para envio imediato, calcular data de amanhã
    let dataAmanha = null;
    if (envioImediato) {
      const amanha = new Date(agoraBrasilia);
      amanha.setDate(amanha.getDate() + 1);
      dataAmanha = amanha.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Se for teste, buscar agendamentos direto pelo telefone
    if (numeroTeste) {
      const telefoneLimpo = numeroTeste.replace(/\D/g, '');
      const numeroTesteSemPais = telefoneLimpo.startsWith('55') ? telefoneLimpo.slice(2) : telefoneLimpo;
      
      console.log(`🔍 Modo TESTE - Buscando agendamentos com telefone: ${numeroTesteSemPais}`);
      
      // Buscar todos os agendamentos agendados
      const todosAgendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        status: 'agendado'
      });
      
      let mensagensEnviadas = 0;
      const erros = [];
      
      // Filtrar pelo telefone
      for (const ag of todosAgendamentos) {
        if (!ag.cliente_telefone) continue;
        
        const telefoneAg = ag.cliente_telefone.replace(/\D/g, '');
        const telefoneAgSemPais = telefoneAg.startsWith('55') ? telefoneAg.slice(2) : telefoneAg;
        
        console.log(`Comparando: AG="${telefoneAgSemPais}" vs TESTE="${numeroTesteSemPais}"`);
        
        if (telefoneAgSemPais !== numeroTesteSemPais) {
          continue;
        }
        
        console.log(`✅ Encontrado agendamento para ${ag.cliente_nome}`);
        
        // Montar e enviar mensagem
        let mensagem = "Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar";
        
        const dataFormatada = new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR');
        mensagem = mensagem
          .replace(/\{cliente\}/g, ag.cliente_nome)
          .replace(/\{profissional\}/g, ag.profissional_nome)
          .replace(/\{data\}/g, dataFormatada)
          .replace(/\{hora\}/g, ag.hora_inicio)
          .replace(/\{unidade\}/g, ag.unidade_nome)
          .replace(/\{servico\}/g, ag.servico_nome || 'Consulta');
        
        const telefoneFormatado = '55' + telefoneLimpo;
        
        try {
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'client-token': WHATSAPP_INSTANCE_TOKEN
            },
            body: JSON.stringify({
              phone: telefoneFormatado,
              message: mensagem
            })
          });
          
          if (response.ok) {
            mensagensEnviadas++;
            console.log(`✅ Mensagem enviada para ${ag.cliente_nome}`);
          } else {
            erros.push(`Erro ao enviar para ${ag.cliente_nome}: ${response.statusText}`);
          }
        } catch (error) {
          erros.push(`Erro ao enviar para ${ag.cliente_nome}: ${error.message}`);
        }
      }
      
      return Response.json({
        success: true,
        mensagensEnviadas,
        erros: erros.length > 0 ? erros : undefined,
        modoTeste: true
      });
    }

    // Buscar configurações (para modo normal e envio imediato)
    let configuracoes;
    if (envioImediato && unidadeId) {
      // Envio imediato: buscar apenas a unidade específica
      configuracoes = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({ 
        unidade_id: unidadeId,
        ativo: true 
      });
    } else {
      // Normal: buscar apenas ativas
      configuracoes = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({ ativo: true });
    }
    
    if (configuracoes.length === 0) {
      return Response.json({ message: 'Nenhuma configuração encontrada' });
    }

    let mensagensEnviadas = 0;
    const erros = [];

    // Para cada configuração
    for (const config of configuracoes) {
      // Buscar agendamentos da unidade
      let filtroAgendamentos = {
        unidade_id: config.unidade_id,
        status: 'agendado'
      };

      // Se for envio imediato, filtrar por data de amanhã
      if (envioImediato && dataAmanha) {
        filtroAgendamentos.data = dataAmanha;
      }

      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter(filtroAgendamentos);

      for (const ag of agendamentos) {
         // Verificar se tem telefone
         if (!ag.cliente_telefone) continue;

        // Converter data do agendamento para Date
        const [ano, mes, dia] = ag.data.split('-').map(Number);
        const [hora, minuto] = ag.hora_inicio.split(':').map(Number);
        const dataAgendamento = new Date(ano, mes - 1, dia, hora, minuto);

        // Determinar se deve enviar
        let deveEnviar = false;
        let tipoLembrete = null;
        
        if (numeroTeste || envioImediato) {
          deveEnviar = true; // Modo teste ou envio imediato: sempre envia
          tipoLembrete = 'teste';
        } else {
          // Verificar se já foi enviado
          if (ag.lembrete_1_dia_enviado && ag.lembrete_12_horas_enviado) {
            continue; // Já enviou os dois lembretes
          }

          // Modo normal: verificar se precisa enviar lembrete de 1 dia ou 12 horas
          const diff1Dia = Math.abs(dataAgendamento - umDiaFrente);
          const diff12Horas = Math.abs(dataAgendamento - dozeHorasFrente);

          if (config.enviar_1_dia && diff1Dia < 3600000 && !ag.lembrete_1_dia_enviado) { // Dentro de 1 hora de diferença
            deveEnviar = true;
            tipoLembrete = '1_dia';
          }
          if (config.enviar_12_horas && diff12Horas < 3600000 && !ag.lembrete_12_horas_enviado) { // Dentro de 1 hora de diferença
            deveEnviar = true;
            tipoLembrete = '12_horas';
          }
        }

        if (!deveEnviar) continue;

        // Montar mensagem personalizada
        let mensagem = config.mensagem_template || 
          "Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar";

        // Substituir variáveis
        const dataFormatada = new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR');
        mensagem = mensagem
          .replace(/\{cliente\}/g, ag.cliente_nome)
          .replace(/\{profissional\}/g, ag.profissional_nome)
          .replace(/\{data\}/g, dataFormatada)
          .replace(/\{hora\}/g, ag.hora_inicio)
          .replace(/\{unidade\}/g, ag.unidade_nome)
          .replace(/\{servico\}/g, ag.servico_nome || 'Consulta');

        // Limpar telefone e adicionar +55
        const telefoneLimpo = ag.cliente_telefone.replace(/\D/g, '');
        const telefoneFormatado = '55' + telefoneLimpo;

        try {
          // Enviar mensagem via Z-API
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'client-token': WHATSAPP_INSTANCE_TOKEN
            },
            body: JSON.stringify({
              phone: telefoneFormatado,
              message: mensagem
            })
          });

          if (response.ok) {
            mensagensEnviadas++;
            
            // Marcar lembrete como enviado (exceto em testes)
            if (!numeroTeste) {
              const updateData = {};
              if (tipoLembrete === '1_dia') {
                updateData.lembrete_1_dia_enviado = true;
              } else if (tipoLembrete === '12_horas') {
                updateData.lembrete_12_horas_enviado = true;
              }
              
              if (Object.keys(updateData).length > 0) {
                await base44.asServiceRole.entities.Agendamento.update(ag.id, updateData);
              }
            }
            
            // Registrar no log
            await base44.asServiceRole.entities.LogAcao.create({
              tipo: "editou_agendamento",
              usuario_email: numeroTeste || envioImediato ? (user?.email || "sistema-whatsapp") : "sistema-whatsapp",
              descricao: numeroTeste 
                ? `Teste WhatsApp enviado para ${ag.cliente_nome} (${ag.cliente_telefone}) - Unidade: ${ag.unidade_nome}`
                : envioImediato
                ? `WhatsApp enviado automaticamente para ${ag.cliente_nome} (${ag.cliente_telefone}) - Ativação da unidade ${ag.unidade_nome}`
                : `Lembrete WhatsApp ${tipoLembrete} enviado para ${ag.cliente_nome} (${ag.cliente_telefone})`,
              entidade_tipo: "Agendamento",
              entidade_id: ag.id
            });

            // Cooldown de 50 segundos entre envios (apenas no envio imediato)
            if (envioImediato) {
              await new Promise(resolve => setTimeout(resolve, 50000));
            }
          } else {
            erros.push(`Erro ao enviar para ${ag.cliente_nome} (${ag.unidade_nome}): ${response.statusText}`);
          }
        } catch (error) {
          erros.push(`Erro ao enviar para ${ag.cliente_nome}: ${error.message}`);
        }
      }
    }

    return Response.json({
      success: true,
      mensagensEnviadas,
      erros: erros.length > 0 ? erros : undefined,
      modoTeste: !!numeroTeste,
      envioImediato: !!envioImediato
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});