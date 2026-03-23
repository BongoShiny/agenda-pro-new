import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const WHATSAPP_INSTANCE_ID = Deno.env.get("WHATSAPP_INSTANCE_ID") || "";
    const WHATSAPP_INSTANCE_TOKEN = Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "";
    const WHATSAPP_CLIENT_TOKEN = Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "";

    console.log('🚀 Iniciando envio diário automático de lembretes (08:00)');

    if (!WHATSAPP_INSTANCE_ID || !WHATSAPP_INSTANCE_TOKEN || !WHATSAPP_CLIENT_TOKEN) {
      return Response.json({ error: 'Credenciais Z-API não configuradas' }, { status: 500 });
    }

    // Calcular data de amanhã
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const amanha = new Date(agoraBrasilia);
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().split('T')[0];

    console.log(`📅 Buscando agendamentos para amanhã: ${dataAmanha}`);

    // Buscar todas as unidades ativas
    const unidades = await base44.asServiceRole.entities.Unidade.filter({ ativa: true });
    
    let totalEnviados = 0;
    const erros = [];

    for (const unidade of unidades) {
      console.log(`\n🏥 Processando unidade: ${unidade.nome}`);

      // Buscar configuração da unidade
      const configs = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({
        unidade_id: unidade.id,
        ativo: true
      });

      const config = configs[0];
      const mensagemTemplate = config?.mensagem_template || 
        `Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar`;

      // Buscar agendamentos de amanhã desta unidade
      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        unidade_id: unidade.id,
        data: dataAmanha,
        status: 'agendado'
      });

      console.log(`📋 Encontrados ${agendamentos.length} agendamentos`);

      for (const ag of agendamentos) {
        if (!ag.cliente_telefone) {
          console.log(`⏭️ ${ag.cliente_nome} - sem telefone`);
          continue;
        }

        // Verificar se já foi enviado (buscar registro)
        const registrosExistentes = await base44.asServiceRole.entities.RegistroEnvioWhatsApp.filter({
          agendamento_id: ag.id,
          status: 'enviado'
        });

        if (registrosExistentes.length > 0) {
          console.log(`⏭️ ${ag.cliente_nome} - já enviado anteriormente`);
          continue;
        }

        // Formatar data
        const dataFormatada = new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR');

        // Montar mensagem
        let mensagem = mensagemTemplate
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
            // Registrar erro
            await base44.asServiceRole.entities.RegistroEnvioWhatsApp.create({
              agendamento_id: ag.id,
              cliente_nome: ag.cliente_nome,
              cliente_telefone: ag.cliente_telefone,
              unidade_id: ag.unidade_id,
              data_agendamento: ag.data,
              mensagem_enviada: mensagem,
              tipo_envio: "automatico",
              enviado_por: "sistema",
              status: "erro",
              erro_mensagem: resposta.error
            });

            erros.push(`${ag.cliente_nome}: ${resposta.error}`);
            console.error(`❌ ${ag.cliente_nome}:`, resposta.error);
          } else {
            // Registrar envio bem-sucedido
            await base44.asServiceRole.entities.RegistroEnvioWhatsApp.create({
              agendamento_id: ag.id,
              cliente_nome: ag.cliente_nome,
              cliente_telefone: ag.cliente_telefone,
              unidade_id: ag.unidade_id,
              data_agendamento: ag.data,
              mensagem_enviada: mensagem,
              tipo_envio: "automatico",
              enviado_por: "sistema",
              status: "enviado"
            });

            totalEnviados++;
            console.log(`✅ ${ag.cliente_nome} - enviado`);

            // Log
            await base44.asServiceRole.entities.LogAcao.create({
              tipo: "editou_agendamento",
              usuario_email: "sistema-whatsapp-diario",
              descricao: `Lembrete automático enviado para ${ag.cliente_nome} (08:00)`,
              entidade_tipo: "Agendamento",
              entidade_id: ag.id
            });

            // Delay de 50 segundos entre envios
            await new Promise(resolve => setTimeout(resolve, 50000));
          }
        } catch (error) {
          // Registrar erro
          await base44.asServiceRole.entities.RegistroEnvioWhatsApp.create({
            agendamento_id: ag.id,
            cliente_nome: ag.cliente_nome,
            cliente_telefone: ag.cliente_telefone,
            unidade_id: ag.unidade_id,
            data_agendamento: ag.data,
            mensagem_enviada: mensagem,
            tipo_envio: "automatico",
            enviado_por: "sistema",
            status: "erro",
            erro_mensagem: error.message
          });

          erros.push(`${ag.cliente_nome}: ${error.message}`);
          console.error(`❌ ${ag.cliente_nome}:`, error);
        }
      }
    }

    console.log(`\n✅ Envio concluído: ${totalEnviados} mensagens enviadas`);

    return Response.json({
      success: true,
      totalEnviados,
      erros: erros.length > 0 ? erros : undefined,
      dataProcessada: dataAmanha
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});