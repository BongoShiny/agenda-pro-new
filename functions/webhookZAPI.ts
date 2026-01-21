import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // GET - verificação de status
    if (req.method === 'GET') {
      return Response.json({ 
        success: true,
        status: 'Webhook ativo',
        message: 'Configure este webhook na Z-API'
      }, { status: 200 });
    }

    // Receber dados do webhook da Z-API
    const body = await req.json().catch(() => ({}));
    console.log('📥 Webhook Z-API recebido:', JSON.stringify(body, null, 2));

    // Criar cliente base44 APÓS receber os dados
    const base44 = createClientFromRequest(req);

    // Configurações da API do WhatsApp (Z-API)
    const WHATSAPP_INSTANCE_ID = (Deno.env.get("WHATSAPP_INSTANCE_ID") || "").trim();
    const WHATSAPP_INSTANCE_TOKEN = (Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "").trim();
    const WHATSAPP_CLIENT_TOKEN = (Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "").trim();

    // Extrair dados da Z-API - formato de mensagem recebida
    // Z-API pode enviar: text.message, phone, instanceId, messageId, etc
    const mensagem = body.text?.message || body.text || body.message || body.body || '';
    const telefone = body.phone || body.wuid || body.phoneNumber || body.from || '';

    console.log('🔍 BODY COMPLETO:', body);
    console.log('📱 Telefone extraído:', telefone);
    console.log('💬 Mensagem extraída:', mensagem);
    console.log('🔍 body.text:', body.text);
    console.log('🔍 body.phone:', body.phone);

    // Se não tem dados suficientes
    if (!mensagem || !telefone) {
      console.log('⚠️ Dados insuficientes');
      return Response.json({ 
        success: true,
        message: 'Processado - dados insuficientes'
      }, { status: 200 });
    }

    // Limpar telefone - remover código do país 55 se existir
    let telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.startsWith('55')) {
      telefoneLimpo = telefoneLimpo.substring(2);
    }
    console.log('🔢 Telefone limpo:', telefoneLimpo);

    const mensagemLower = mensagem.toLowerCase().trim();
    
    // CONFIRMAR
    if (mensagemLower.includes('confirmar') || mensagemLower === 'confirmar') {
      console.log('✅ Processando confirmação...');
      
      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        status: 'agendado'
      });

      const agendamentosCliente = agendamentos.filter(ag => {
        let telAg = (ag.cliente_telefone || '').replace(/\D/g, '');
        if (telAg.startsWith('55')) {
          telAg = telAg.substring(2);
        }
        console.log(`📞 Comparando: ${telAg} === ${telefoneLimpo}`);
        return telAg === telefoneLimpo;
      });

      if (agendamentosCliente.length === 0) {
        console.log('❌ Nenhum agendamento encontrado');
        return Response.json({ 
          success: true,
          message: 'Nenhum agendamento encontrado' 
        }, { status: 200 });
      }

      const proximo = agendamentosCliente.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      await base44.asServiceRole.entities.Agendamento.update(proximo.id, {
        status: 'confirmado'
      });

      await base44.asServiceRole.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: "sistema-whatsapp",
        descricao: `Confirmado via WhatsApp (Z-API): ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: proximo.id,
        dados_antigos: JSON.stringify({ status: 'agendado' }),
        dados_novos: JSON.stringify({ status: 'confirmado' })
      });

      console.log('✅ Agendamento confirmado:', proximo.id);

      // Enviar mensagem de confirmação
      if (WHATSAPP_INSTANCE_ID && WHATSAPP_INSTANCE_TOKEN && WHATSAPP_CLIENT_TOKEN) {
        try {
          const dataFormatada = new Date(proximo.data + 'T12:00:00').toLocaleDateString('pt-BR');
          const mensagemConfirmacao = `✅ Agendamento confirmado com sucesso!\n\n📅 Data: ${dataFormatada}\n⏰ Horário: ${proximo.hora_inicio}\n👨‍⚕️ Profissional: ${proximo.profissional_nome}\n📍 Unidade: ${proximo.unidade_nome}\n\nNos vemos em breve! 😊`;
          
          const telefoneFormatado = '55' + telefone.replace(/\D/g, '');
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': WHATSAPP_CLIENT_TOKEN
            },
            body: JSON.stringify({
              phone: telefoneFormatado,
              message: mensagemConfirmacao
            })
          });
        } catch (error) {
          console.error('Erro ao enviar mensagem de confirmação:', error);
        }
      }
      
      return Response.json({ 
        success: true, 
        message: 'Agendamento confirmado',
        agendamento_id: proximo.id
      }, { status: 200 });
    }
    
    // CANCELAR
    if (mensagemLower.includes('cancelar') || mensagemLower === 'cancelar') {
      console.log('❌ Processando cancelamento...');
      
      // Buscar agendamentos agendados OU confirmados
      const todos = await base44.asServiceRole.entities.Agendamento.list();
      const agendamentos = todos.filter(ag => 
        ag.status === 'agendado' || ag.status === 'confirmado'
      );

      const agendamentosCliente = agendamentos.filter(ag => {
        let telAg = (ag.cliente_telefone || '').replace(/\D/g, '');
        if (telAg.startsWith('55')) {
          telAg = telAg.substring(2);
        }
        console.log(`📞 Comparando: ${telAg} === ${telefoneLimpo}`);
        return telAg === telefoneLimpo;
      });

      if (agendamentosCliente.length === 0) {
        console.log('❌ Nenhum agendamento encontrado');
        return Response.json({ 
          success: true,
          message: 'Nenhum agendamento encontrado' 
        }, { status: 200 });
      }

      const proximo = agendamentosCliente.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      await base44.asServiceRole.entities.Agendamento.update(proximo.id, {
        status: 'cancelado'
      });

      await base44.asServiceRole.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: "sistema-whatsapp",
        descricao: `Cancelado via WhatsApp (Z-API): ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: proximo.id,
        dados_antigos: JSON.stringify({ status: proximo.status }),
        dados_novos: JSON.stringify({ status: 'cancelado' })
      });

      console.log('❌ Agendamento cancelado:', proximo.id);

      // Enviar mensagem de cancelamento
      if (WHATSAPP_INSTANCE_ID && WHATSAPP_INSTANCE_TOKEN && WHATSAPP_CLIENT_TOKEN) {
        try {
          const dataFormatada = new Date(proximo.data + 'T12:00:00').toLocaleDateString('pt-BR');
          const mensagemCancelamento = `❌ Agendamento cancelado com sucesso.\n\n📅 Data: ${dataFormatada}\n⏰ Horário: ${proximo.hora_inicio}\n👨‍⚕️ Profissional: ${proximo.profissional_nome}\n📍 Unidade: ${proximo.unidade_nome}\n\nSe desejar reagendar, entre em contato conosco. 📞`;
          
          const telefoneFormatado = '55' + telefone.replace(/\D/g, '');
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': WHATSAPP_CLIENT_TOKEN
            },
            body: JSON.stringify({
              phone: telefoneFormatado,
              message: mensagemCancelamento
            })
          });
        } catch (error) {
          console.error('Erro ao enviar mensagem de cancelamento:', error);
        }
      }
      
      return Response.json({ 
        success: true, 
        message: 'Agendamento cancelado',
        agendamento_id: proximo.id
      }, { status: 200 });
    }

    console.log('⚠️ Comando não reconhecido');
    return Response.json({ 
      success: true,
      message: 'Comando não reconhecido' 
    }, { status: 200 });

  } catch (error) {
    console.error('🔴 Erro:', error);
    console.error('🔴 Stack:', error.stack);
    return Response.json({ 
      success: true,
      message: 'Erro processado',
      error: error.message,
      stack: error.stack
    }, { status: 200 });
  }
});