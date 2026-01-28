import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json().catch(() => ({}));
    const numeroTeste = body.numeroTeste;
    const envioImediato = body.envioImediato;
    const unidadeId = body.unidadeId;
    const verificarConfig = body.verificarConfig;
    
    let user = null;
    if (numeroTeste || envioImediato || verificarConfig) {
      user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    const WHATSAPP_INSTANCE_ID = Deno.env.get("WHATSAPP_INSTANCE_ID") || "";
    const WHATSAPP_INSTANCE_TOKEN = Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "";
    const WHATSAPP_CLIENT_TOKEN = Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "";
    
    console.log('🚀 Iniciando envio de lembretes');

    if (verificarConfig) {
      if (!WHATSAPP_INSTANCE_ID || !WHATSAPP_INSTANCE_TOKEN || !WHATSAPP_CLIENT_TOKEN) {
        return Response.json({ error: 'Credenciais Z-API não configuradas' });
      }
      return Response.json({ success: true, configurado: true });
    }

    if (!WHATSAPP_INSTANCE_ID || !WHATSAPP_INSTANCE_TOKEN || !WHATSAPP_CLIENT_TOKEN) {
      return Response.json({ error: 'Credenciais Z-API incompletas' }, { status: 500 });
    }

    // Data/hora atual em Brasília
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horaAtual = agoraBrasilia.getHours();
    const minutoAtual = agoraBrasilia.getMinutes();
    
    console.log(`⏰ Hora atual: ${horaAtual}:${minutoAtual.toString().padStart(2, '0')}`);

    // Calcular data de amanhã
    const amanha = new Date(agoraBrasilia);
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().split('T')[0];

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
      return Response.json({ message: 'Nenhuma configuração ativa' });
    }

    console.log(`📋 Configurações ativas: ${configuracoes.length}`);

    let mensagensEnviadas = 0;
    const erros = [];

    for (const config of configuracoes) {
      // Determinar se deve enviar agora
      let deveEnviar = false;

      if (envioImediato) {
        // Envio imediato ao ativar
        deveEnviar = true;
      } else if (numeroTeste) {
        // Modo teste
        deveEnviar = true;
      } else {
        // Verificar tipo de envio e horário
        if (config.tipo_envio === '24_horas_antes') {
          // Enviar às 18h
          if (horaAtual === 18 && minutoAtual < 5) {
            deveEnviar = true;
          }
        } else if (config.tipo_envio === 'horario_personalizado') {
          // Enviar no horário fixo configurado
          const [horaConfig, minutoConfig] = (config.horario_fixo || '18:00').split(':').map(Number);
          if (horaAtual === horaConfig && minutoAtual < 5) {
            deveEnviar = true;
          }
        }
      }

      if (!deveEnviar && !numeroTeste && !envioImediato) {
        console.log(`⏭️ Não é hora de enviar para ${config.unidade_nome}`);
        continue;
      }

      // Buscar agendamentos de amanhã
      const todosAgendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        unidade_id: config.unidade_id,
        status: 'agendado',
        data: dataAmanha
      });

      console.log(`📅 Agendamentos de amanhã em ${config.unidade_nome}: ${todosAgendamentos.length}`);

      for (const ag of todosAgendamentos) {
        if (!ag.cliente_telefone) {
          continue;
        }

        // Modo teste: filtrar por número
        if (numeroTeste) {
          const telefoneLimpo = numeroTeste.replace(/\D/g, '');
          const telefoneAg = ag.cliente_telefone.replace(/\D/g, '');
          if (!telefoneAg.includes(telefoneLimpo) && !telefoneLimpo.includes(telefoneAg)) {
            continue;
          }
        }

        // Verificar se já foi enviado (exceto teste/imediato)
        if (!numeroTeste && !envioImediato && ag.lembrete_enviado) {
          console.log(`⏭️ Lembrete já enviado para ${ag.cliente_nome}`);
          continue;
        }

        // Formatar data
        const dataFormatada = new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR');
        
        // Montar mensagem
        let mensagem = config.mensagem_template || 
          `Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar`;
        
        mensagem = mensagem
          .replace(/{cliente}/g, ag.cliente_nome || '')
          .replace(/{profissional}/g, ag.profissional_nome || '')
          .replace(/{data}/g, dataFormatada)
          .replace(/{hora}/g, ag.hora_inicio || '')
          .replace(/{unidade}/g, ag.unidade_nome || '')
          .replace(/{servico}/g, ag.servico_nome || '');

        const telefoneLimpo = ag.cliente_telefone.replace(/\D/g, '');
        const telefoneFormatado = '55' + telefoneLimpo;

        try {
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
            erros.push(`${ag.cliente_nome}: ${resposta.error}`);
            console.error('❌', resposta.error);
          } else {
            mensagensEnviadas++;
            console.log(`✅ Enviado para ${ag.cliente_nome}`);
            
            // Marcar como enviado (exceto teste)
            if (!numeroTeste) {
              await base44.asServiceRole.entities.Agendamento.update(ag.id, {
                lembrete_enviado: true,
                lembrete_data_envio: new Date().toISOString()
              });
            }
            
            // Log
            await base44.asServiceRole.entities.LogAcao.create({
              tipo: "editou_agendamento",
              usuario_email: numeroTeste || envioImediato ? (user?.email || "sistema-whatsapp") : "sistema-whatsapp",
              descricao: numeroTeste 
                ? `Teste WhatsApp enviado para ${ag.cliente_nome}`
                : envioImediato
                ? `WhatsApp enviado na ativação para ${ag.cliente_nome}`
                : `Lembrete WhatsApp enviado para ${ag.cliente_nome}`,
              entidade_tipo: "Agendamento",
              entidade_id: ag.id
            });

            // Delay (exceto teste)
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
    }

    console.log(`📊 Total: ${mensagensEnviadas} mensagens enviadas`);

    return Response.json({
      success: true,
      mensagensEnviadas,
      erros: erros.length > 0 ? erros : undefined,
      modoTeste: !!numeroTeste,
      envioImediato: !!envioImediato
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});