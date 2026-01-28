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
    const WHATSAPP_INSTANCE_ID = Deno.env.get("WHATSAPP_INSTANCE_ID") || "";
    const WHATSAPP_INSTANCE_TOKEN = Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "";
    const WHATSAPP_CLIENT_TOKEN = Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "";
    
    console.log('🔧 Debug Secrets:', {
      instanceId: WHATSAPP_INSTANCE_ID ? '✅ SET' : '❌ MISSING',
      instanceToken: WHATSAPP_INSTANCE_TOKEN ? '✅ SET' : '❌ MISSING',
      clientToken: WHATSAPP_CLIENT_TOKEN ? '✅ SET' : '❌ MISSING',
      clientTokenLength: WHATSAPP_CLIENT_TOKEN?.length || 0
    });

    // Se for apenas verificação de configuração
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
        error: 'Credenciais Z-API incompletas',
        instanceIdOk: !!WHATSAPP_INSTANCE_ID,
        instanceTokenOk: !!WHATSAPP_INSTANCE_TOKEN,
        clientTokenOk: !!WHATSAPP_CLIENT_TOKEN
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
        
        // Buscar configuração para pegar o template
        const configUnidade = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({ 
          unidade_id: ag.unidade_id 
        });
        
        const dataFormatada = new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR');
        
        // Montar mensagem usando template ou mensagem padrão
        let mensagem = `Olá! Este é um lembrete do seu agendamento marcado para ${dataFormatada} às ${ag.hora_inicio}. Nos vemos em breve! 😊`;
        
        if (configUnidade.length > 0 && configUnidade[0].mensagem_template) {
          mensagem = configUnidade[0].mensagem_template
            .replace(/{cliente}/g, ag.cliente_nome || '')
            .replace(/{profissional}/g, ag.profissional_nome || '')
            .replace(/{data}/g, dataFormatada)
            .replace(/{hora}/g, ag.hora_inicio || '')
            .replace(/{unidade}/g, ag.unidade_nome || '')
            .replace(/{servico}/g, ag.servico_nome || '');
        }
        
        const telefoneFormatado = '55' + telefoneLimpo;
        
        try {
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          
          const payload = {
            phone: telefoneFormatado,
            message: mensagem
          };
          
          console.log('📤 Enviando:', { url, clientToken: WHATSAPP_CLIENT_TOKEN?.substring(0, 10) + '...' });
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': WHATSAPP_CLIENT_TOKEN
            },
            body: JSON.stringify(payload)
          });
          
          const resposta = await response.json();
          console.log('📥 Resposta Z-API:', resposta);
          
          if (resposta.error) {
            const erro = `${ag.cliente_nome}: ${resposta.error}`;
            console.error('❌', erro);
            erros.push(erro);
          } else {
            mensagensEnviadas++;
            console.log(`✅ Mensagem enviada para ${ag.cliente_nome}`);
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
      // Buscar agendamentos da unidade que são de amanhã e ainda não receberam lembrete
      let filtroAgendamentos = {
        unidade_id: config.unidade_id,
        status: 'agendado'
      };

      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter(filtroAgendamentos);

      // Calcular data de amanhã
      const amanha = new Date(agoraBrasilia);
      amanha.setDate(amanha.getDate() + 1);
      const dataAmanha = amanha.toISOString().split('T')[0];

      for (const ag of agendamentos) {
         // Verificar se tem telefone
         if (!ag.cliente_telefone) {
           console.log(`⚠️ Agendamento sem telefone: ${ag.cliente_nome}`);
           continue;
         }

        // Se for modo normal (não teste), só enviar para agendamentos de AMANHÃ
        if (!numeroTeste && !envioImediato) {
          if (ag.data !== dataAmanha) {
            continue; // Pular se não for agendamento de amanhã
          }
          
          // Se já enviou lembrete de 1 dia, pular
          if (ag.lembrete_1_dia_enviado) {
            console.log(`⏭️ Lembrete já enviado para ${ag.cliente_nome}`);
            continue;
          }
        }

        let tipoLembrete = numeroTeste || envioImediato ? 'teste' : '1_dia';

        // Montar mensagem usando template personalizado
        const dataFormatada = new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR');
        
        let mensagem = config.mensagem_template || `Olá! Este é um lembrete do seu agendamento marcado para ${dataFormatada} às ${ag.hora_inicio}. Nos vemos em breve! 😊`;
        
        mensagem = mensagem
          .replace(/{cliente}/g, ag.cliente_nome || '')
          .replace(/{profissional}/g, ag.profissional_nome || '')
          .replace(/{data}/g, dataFormatada)
          .replace(/{hora}/g, ag.hora_inicio || '')
          .replace(/{unidade}/g, ag.unidade_nome || '')
          .replace(/{servico}/g, ag.servico_nome || '');

        // Limpar telefone e adicionar +55
        const telefoneLimpo = ag.cliente_telefone.replace(/\D/g, '');
        const telefoneFormatado = '55' + telefoneLimpo;

        try {
          // Enviar mensagem via Z-API
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          
          const payload = {
            phone: telefoneFormatado,
            message: mensagem
          };
          
          console.log('📤 Enviando:', { url, clientToken: WHATSAPP_CLIENT_TOKEN?.substring(0, 10) + '...' });
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': WHATSAPP_CLIENT_TOKEN
            },
            body: JSON.stringify(payload)
          });
          
          const resposta = await response.json();
          console.log('📥 Resposta Z-API:', resposta);

          if (resposta.error) {
            const erro = `${ag.cliente_nome} (${ag.unidade_nome}): ${resposta.error}`;
            console.error('❌', erro);
            erros.push(erro);
          } else {
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

            // Cooldown configurável entre envios (exceto testes)
            if (!numeroTeste) {
              const delayMs = (config.delay_segundos || 50) * 1000;
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
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