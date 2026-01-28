import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Pegar parâmetros da requisição
    const body = await req.json().catch(() => ({}));
    const numeroTeste = body.numeroTeste;
    const envioImediato = body.envioImediato;
    const unidadeId = body.unidadeId;
    const verificarConfig = body.verificarConfig;
    const tipoLembrete = body.tipoLembrete || '24h'; // 24h, 12h, 6h, 2h
    
    // Verificar autenticação apenas para chamadas manuais
    let user = null;
    if (numeroTeste || envioImediato || verificarConfig) {
      user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    // Configurações da API do WhatsApp (Z-API)
    const WHATSAPP_INSTANCE_ID = Deno.env.get("WHATSAPP_INSTANCE_ID") || "";
    const WHATSAPP_INSTANCE_TOKEN = Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "";
    const WHATSAPP_CLIENT_TOKEN = Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "";
    
    console.log(`🚀 Iniciando envio de lembretes - Tipo: ${tipoLembrete}`);

    if (verificarConfig) {
      if (!WHATSAPP_INSTANCE_ID || !WHATSAPP_INSTANCE_TOKEN || !WHATSAPP_CLIENT_TOKEN) {
        return Response.json({ 
          error: 'Credenciais Z-API não configuradas completamente' 
        });
      }
      return Response.json({ success: true, configurado: true });
    }

    if (!WHATSAPP_INSTANCE_ID || !WHATSAPP_INSTANCE_TOKEN || !WHATSAPP_CLIENT_TOKEN) {
      return Response.json({ 
        error: 'Credenciais Z-API incompletas'
      }, { status: 500 });
    }

    // Obter data/hora atual em Brasília
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horaAtual = agoraBrasilia.getHours();
    
    console.log(`⏰ Hora atual em Brasília: ${horaAtual}:${agoraBrasilia.getMinutes()}`);

    // Função auxiliar para calcular quando enviar baseado no tipo de lembrete
    const calcularDataEnvio = (dataAgendamento, horaAgendamento) => {
      const [ano, mes, dia] = dataAgendamento.split('-').map(Number);
      const [hora, min] = horaAgendamento.split(':').map(Number);
      const dataHoraAgendamento = new Date(ano, mes - 1, dia, hora, min);

      switch(tipoLembrete) {
        case '24h':
          const data24h = new Date(dataHoraAgendamento);
          data24h.setHours(data24h.getHours() - 24);
          return data24h;
        case '12h':
          const data12h = new Date(dataHoraAgendamento);
          data12h.setHours(data12h.getHours() - 12);
          return data12h;
        case '6h':
          const data6h = new Date(dataHoraAgendamento);
          data6h.setHours(data6h.getHours() - 6);
          return data6h;
        case '2h':
          const data2h = new Date(dataHoraAgendamento);
          data2h.setHours(data2h.getHours() - 2);
          return data2h;
        default:
          return null;
      }
    };

    // Buscar configurações
    let configuracoes;
    if (envioImediato && unidadeId) {
      configuracoes = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({ 
        unidade_id: unidadeId,
        ativo: true 
      });
    } else {
      configuracoes = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({ ativo: true });
    }
    
    if (configuracoes.length === 0) {
      return Response.json({ message: 'Nenhuma configuração ativa encontrada' });
    }

    console.log(`📋 Configurações ativas encontradas: ${configuracoes.length}`);

    let mensagensEnviadas = 0;
    const erros = [];
    let agendamentosProcessados = 0;

    // Para cada configuração ativa
    for (const config of configuracoes) {
      // Verificar se este tipo de lembrete está ativado
      const campoAtivo = tipoLembrete === '24h' ? 'enviar_24_horas' : 
                         tipoLembrete === '12h' ? 'enviar_12_horas' :
                         tipoLembrete === '6h' ? 'enviar_6_horas' :
                         tipoLembrete === '2h' ? 'enviar_2_horas' : null;

      if (!envioImediato && !numeroTeste && campoAtivo && !config[campoAtivo]) {
        console.log(`⏭️ Lembrete ${tipoLembrete} desativado para ${config.unidade_nome}`);
        continue;
      }

      // Verificar dia útil se necessário
      if (config.enviar_apenas_dias_uteis) {
        const diaSemana = agoraBrasilia.getDay();
        if (diaSemana === 0 || diaSemana === 6) {
          console.log(`⏭️ Pulando ${config.unidade_nome} - apenas dias úteis`);
          continue;
        }
      }

      // Buscar agendamentos da unidade com status 'agendado'
      const todosAgendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        unidade_id: config.unidade_id,
        status: 'agendado'
      });

      console.log(`📅 Agendamentos encontrados para ${config.unidade_nome}: ${todosAgendamentos.length}`);

      // Contador de envios para esta configuração
      let enviosConfig = 0;
      const maxEnvios = config.max_envios_por_vez || 100;

      for (const ag of todosAgendamentos) {
        // Verificar limite de envios
        if (enviosConfig >= maxEnvios) {
          console.log(`⚠️ Limite de ${maxEnvios} envios atingido para ${config.unidade_nome}`);
          break;
        }

        // Pular se não tem telefone
        if (!ag.cliente_telefone) {
          continue;
        }

        // Se for teste, filtrar por número
        if (numeroTeste) {
          const telefoneLimpo = numeroTeste.replace(/\D/g, '');
          const telefoneAg = ag.cliente_telefone.replace(/\D/g, '');
          if (!telefoneAg.includes(telefoneLimpo) && !telefoneLimpo.includes(telefoneAg)) {
            continue;
          }
        }

        // Calcular quando enviar
        const dataEnvio = calcularDataEnvio(ag.data, ag.hora_inicio);
        if (!dataEnvio) continue;

        const dataAtual = new Date(agoraBrasilia);
        
        // Se não for teste/imediato, verificar se é hora de enviar
        if (!numeroTeste && !envioImediato) {
          // Verificar se já passou do momento de enviar
          if (dataAtual < dataEnvio) {
            continue; // Ainda não é hora
          }

          // Verificar se já não passou muito tempo (mais de 2 horas)
          const diferencaHoras = (dataAtual - dataEnvio) / (1000 * 60 * 60);
          if (diferencaHoras > 2) {
            continue; // Já passou muito tempo
          }

          // Verificar se já foi enviado
          const campoEnviado = tipoLembrete === '24h' ? 'lembrete_24h_enviado' :
                               tipoLembrete === '12h' ? 'lembrete_12h_enviado' :
                               tipoLembrete === '6h' ? 'lembrete_6h_enviado' :
                               tipoLembrete === '2h' ? 'lembrete_2h_enviado' : null;
          
          if (campoEnviado && ag[campoEnviado]) {
            continue; // Já enviado
          }
        }

        agendamentosProcessados++;

        // Selecionar template de mensagem
        let mensagemTemplate = config.mensagem_template;
        if (tipoLembrete === '12h' && config.mensagem_template_12h) {
          mensagemTemplate = config.mensagem_template_12h;
        } else if (tipoLembrete === '6h' && config.mensagem_template_6h) {
          mensagemTemplate = config.mensagem_template_6h;
        } else if (tipoLembrete === '2h' && config.mensagem_template_2h) {
          mensagemTemplate = config.mensagem_template_2h;
        }

        // Formatar data
        const dataFormatada = new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR');
        
        // Montar mensagem
        let mensagem = mensagemTemplate || 
          `Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar`;
        
        mensagem = mensagem
          .replace(/{cliente}/g, ag.cliente_nome || '')
          .replace(/{profissional}/g, ag.profissional_nome || '')
          .replace(/{data}/g, dataFormatada)
          .replace(/{hora}/g, ag.hora_inicio || '')
          .replace(/{unidade}/g, ag.unidade_nome || '')
          .replace(/{servico}/g, ag.servico_nome || '');

        // Preparar telefone
        const telefoneLimpo = ag.cliente_telefone.replace(/\D/g, '');
        const telefoneFormatado = '55' + telefoneLimpo;

        try {
          // Enviar via Z-API
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': WHATSAPP_CLIENT_TOKEN
            },
            body: JSON.stringify({
              phone: telefoneFormatado,
              message: mensagem
            })
          });
          
          const resposta = await response.json();

          if (resposta.error) {
            const erro = `${ag.cliente_nome}: ${resposta.error}`;
            erros.push(erro);
            console.error('❌', erro);
          } else {
            mensagensEnviadas++;
            enviosConfig++;
            console.log(`✅ Enviado para ${ag.cliente_nome} (${tipoLembrete})`);
            
            // Marcar como enviado (exceto em testes)
            if (!numeroTeste) {
              const campoEnviado = tipoLembrete === '24h' ? 'lembrete_24h_enviado' :
                                   tipoLembrete === '12h' ? 'lembrete_12h_enviado' :
                                   tipoLembrete === '6h' ? 'lembrete_6h_enviado' :
                                   tipoLembrete === '2h' ? 'lembrete_2h_enviado' : null;
              
              const campoData = tipoLembrete === '24h' ? 'lembrete_24h_data_envio' :
                                tipoLembrete === '12h' ? 'lembrete_12h_data_envio' : null;

              const updateData = {};
              if (campoEnviado) {
                updateData[campoEnviado] = true;
              }
              if (campoData) {
                updateData[campoData] = new Date().toISOString();
              }
              
              if (Object.keys(updateData).length > 0) {
                await base44.asServiceRole.entities.Agendamento.update(ag.id, updateData);
              }
            }
            
            // Log
            await base44.asServiceRole.entities.LogAcao.create({
              tipo: "editou_agendamento",
              usuario_email: numeroTeste || envioImediato ? (user?.email || "sistema-whatsapp") : "sistema-whatsapp",
              descricao: numeroTeste 
                ? `Teste WhatsApp (${tipoLembrete}) enviado para ${ag.cliente_nome}`
                : envioImediato
                ? `WhatsApp (${tipoLembrete}) enviado na ativação para ${ag.cliente_nome}`
                : `Lembrete WhatsApp (${tipoLembrete}) enviado para ${ag.cliente_nome}`,
              entidade_tipo: "Agendamento",
              entidade_id: ag.id
            });

            // Delay entre envios (exceto testes)
            if (!numeroTeste) {
              const delayMs = (config.delay_segundos || 50) * 1000;
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        } catch (error) {
          erros.push(`Erro ao enviar para ${ag.cliente_nome}: ${error.message}`);
          console.error('❌', error);
        }
      }

      console.log(`✅ Configuração ${config.unidade_nome}: ${enviosConfig} mensagens enviadas`);
    }

    console.log(`📊 Total: ${mensagensEnviadas} mensagens enviadas, ${agendamentosProcessados} agendamentos processados`);

    return Response.json({
      success: true,
      mensagensEnviadas,
      agendamentosProcessados,
      tipoLembrete,
      erros: erros.length > 0 ? erros : undefined,
      modoTeste: !!numeroTeste,
      envioImediato: !!envioImediato
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});