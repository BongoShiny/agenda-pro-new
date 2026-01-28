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
    
    console.log('🔔🔔🔔 ==================== WEBHOOK Z-API RECEBIDO ==================== 🔔🔔🔔');
    console.log('📥 BODY COMPLETO (JSON):', JSON.stringify(body, null, 2));
    console.log('📥 TODAS AS CHAVES:', Object.keys(body));

    // Criar cliente base44 APÓS receber os dados
    const base44 = createClientFromRequest(req);

    // Configurações da API do WhatsApp (Z-API)
    const WHATSAPP_INSTANCE_ID = (Deno.env.get("WHATSAPP_INSTANCE_ID") || "").trim();
    const WHATSAPP_INSTANCE_TOKEN = (Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "").trim();
    const WHATSAPP_CLIENT_TOKEN = (Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "").trim();

    // Extrair dados da Z-API - TODOS OS FORMATOS POSSÍVEIS
    let mensagem = '';
    if (typeof body.text === 'object' && body.text !== null) {
      mensagem = body.text.message || '';
    } else if (typeof body.text === 'string') {
      mensagem = body.text;
    } else {
      mensagem = body.message || body.body || body.content || '';
    }
    
    const telefone = body.phone || body.wuid || body.phoneNumber || body.from || body.sender || body.chatId || '';

    console.log('📱 Telefone extraído:', telefone);
    console.log('💬 Mensagem extraída:', mensagem);

    // Se não tem dados suficientes
    if (!mensagem || !telefone) {
      console.log('⚠️⚠️⚠️ DADOS INSUFICIENTES - ABORTANDO');
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
    
    console.log('🔢 TELEFONE FINAL LIMPO:', telefoneLimpo);

    const mensagemLower = mensagem.toLowerCase().trim();
    console.log('💬 Mensagem em lowercase:', mensagemLower);
    
    // CONFIRMAR
    if (mensagemLower.includes('confirmar') || mensagemLower === 'confirmar') {
      console.log('✅✅✅ PROCESSANDO CONFIRMAÇÃO ✅✅✅');
      console.log('📱 Telefone do cliente (limpo):', telefoneLimpo);

      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({ status: 'agendado' });

      console.log(`🔍 Total de agendamentos 'agendado': ${agendamentos?.length || 0}`);

      const agendamentosCliente = agendamentos.filter(ag => {
        if (!ag.cliente_telefone) {
          return false;
        }
        let telAg = (ag.cliente_telefone || '').replace(/\D/g, '');
        if (telAg.startsWith('55')) {
          telAg = telAg.substring(2);
        }
        const match = telAg === telefoneLimpo;
        if (match) {
          console.log(`✅ MATCH ENCONTRADO: "${telAg}" === "${telefoneLimpo}" (${ag.cliente_nome}, ID: ${ag.id})`);
        }
        return match;
      });

      console.log(`🔍 Agendamentos encontrados para este telefone: ${agendamentosCliente.length}`);
      
      if (agendamentosCliente.length === 0) {
        console.log('❌ Nenhum agendamento encontrado para confirmar');
        return Response.json({ 
          success: true,
          message: 'Nenhum agendamento encontrado' 
        }, { status: 200 });
      }

      const proximo = agendamentosCliente.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      console.log('🔄 Atualizando status para CONFIRMADO...');
      console.log('ID do agendamento:', proximo.id);
      console.log('Status anterior:', proximo.status);
      
      try {
        // 1️⃣ PRIMEIRO: Atualizar status no banco de dados
        await base44.asServiceRole.entities.Agendamento.update(proximo.id, {
          status: 'confirmado'
        });

        console.log('✅ STATUS ATUALIZADO NO BANCO!');

        // 2️⃣ SEGUNDO: Registrar log
        await base44.asServiceRole.entities.LogAcao.create({
          tipo: "editou_agendamento",
          usuario_email: "sistema-whatsapp",
          descricao: `Confirmado via WhatsApp (Z-API): ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
          entidade_tipo: "Agendamento",
          entidade_id: proximo.id,
          dados_antigos: JSON.stringify({ status: proximo.status }),
          dados_novos: JSON.stringify({ status: 'confirmado' })
        });

        // 3️⃣ TERCEIRO: Enviar mensagem de confirmação
        if (WHATSAPP_INSTANCE_ID && WHATSAPP_INSTANCE_TOKEN && WHATSAPP_CLIENT_TOKEN) {
          const mensagemConfirmacao = `Seu agendamento está confirmado! ✅`;
          
          const telefoneFormatado = '55' + telefoneLimpo;
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          
          console.log('📤 Enviando mensagem de confirmação para:', telefoneFormatado);
          const responseMsg = await fetch(url, {
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
          
          const responseData = await responseMsg.json();
          console.log('📤 Resposta da Z-API:', JSON.stringify(responseData, null, 2));
          
          if (responseData.error) {
            console.error('❌ Erro ao enviar mensagem:', responseData.error);
          } else {
            console.log('✅ Mensagem de confirmação enviada!');
          }
        }

        console.log('✅✅✅ CONFIRMAÇÃO COMPLETA ✅✅✅');
      } catch (error) {
        console.error('❌ ERRO ao processar confirmação:', error.message);
        throw error;
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
      const todosAgendamentosAgendados = await base44.asServiceRole.entities.Agendamento.filter({ status: 'agendado' });
      const todosAgendamentosConfirmados = await base44.asServiceRole.entities.Agendamento.filter({ status: 'confirmado' });
      const todosAgendamentos = [...todosAgendamentosAgendados, ...todosAgendamentosConfirmados];

      const agendamentosCliente = todosAgendamentos.filter(ag => {
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

      try {
        // 1️⃣ PRIMEIRO: Atualizar status no banco de dados
        await base44.asServiceRole.entities.Agendamento.update(proximo.id, {
          status: 'cancelado'
        });

        console.log('✅ STATUS ATUALIZADO NO BANCO!');

        // 2️⃣ SEGUNDO: Registrar log
        await base44.asServiceRole.entities.LogAcao.create({
          tipo: "editou_agendamento",
          usuario_email: "sistema-whatsapp",
          descricao: `Cancelado via WhatsApp (Z-API): ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
          entidade_tipo: "Agendamento",
          entidade_id: proximo.id,
          dados_antigos: JSON.stringify({ status: proximo.status }),
          dados_novos: JSON.stringify({ status: 'cancelado' })
        });

        // 3️⃣ TERCEIRO: Enviar mensagem de cancelamento
        if (WHATSAPP_INSTANCE_ID && WHATSAPP_INSTANCE_TOKEN && WHATSAPP_CLIENT_TOKEN) {
          const mensagemCancelamento = `Seu agendamento está cancelado! ❎`;
          
          const telefoneFormatado = '55' + telefoneLimpo;
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          
          console.log('📤 Enviando mensagem de cancelamento para:', telefoneFormatado);
          const responseMsg = await fetch(url, {
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
          
          const responseData = await responseMsg.json();
          console.log('📤 Resposta da Z-API:', JSON.stringify(responseData, null, 2));
          
          if (responseData.error) {
            console.error('❌ Erro ao enviar mensagem:', responseData.error);
          } else {
            console.log('✅ Mensagem de cancelamento enviada!');
          }
        }

        console.log('❌ CANCELAMENTO COMPLETO ❌');
      } catch (error) {
        console.error('❌ ERRO ao processar cancelamento:', error.message);
        throw error;
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