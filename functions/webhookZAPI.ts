import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Headers CORS padrão
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Client-Token',
      'Content-Type': 'application/json'
    };

    console.log('✅ WEBHOOK RECEBIDO');
    console.log('📨 Método HTTP:', req.method);
    console.log('🔗 URL:', req.url);

    // OPTIONS - responder imediatamente
    if (req.method === 'OPTIONS') {
      console.log('✅ Respondendo CORS preflight');
      return new Response(JSON.stringify({ success: true }), { 
        status: 200, 
        headers 
      });
    }

    // GET - verificação de status
    if (req.method === 'GET') {
      console.log('✅ GET recebido - retornando status');
      return new Response(JSON.stringify({ 
        success: true,
        status: 'Webhook ativo e funcionando',
        message: 'Configure este webhook na Z-API'
      }), { 
        status: 200, 
        headers 
      });
    }

    // POST, PUT, PATCH, DELETE - processar payload
    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'DELETE') {
      console.log('⚠️ Método não suportado:', req.method);
      return new Response(JSON.stringify({ error: 'Método não suportado' }), { 
        status: 405, 
        headers 
      });
    }

    // Receber dados do webhook
    let body = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      console.log('⚠️ Erro ao parsear JSON:', e.message);
      body = {};
    }

    console.log('📥 BODY RECEBIDO:', JSON.stringify(body, null, 2));
    console.log('📥 CHAVES DO BODY:', Object.keys(body));

    // Criar cliente base44
    const base44 = createClientFromRequest(req);

    // Configurações WhatsApp
    const WHATSAPP_INSTANCE_ID = (Deno.env.get("WHATSAPP_INSTANCE_ID") || "").trim();
    const WHATSAPP_INSTANCE_TOKEN = (Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "").trim();
    const WHATSAPP_CLIENT_TOKEN = (Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "").trim();

    console.log('🔧 WhatsApp configurado:', !!WHATSAPP_INSTANCE_ID && !!WHATSAPP_INSTANCE_TOKEN && !!WHATSAPP_CLIENT_TOKEN);

    // Extrair mensagem
    let mensagem = '';
    if (typeof body.text === 'object' && body.text !== null) {
      mensagem = body.text.message || '';
    } else if (typeof body.text === 'string') {
      mensagem = body.text;
    } else {
      mensagem = body.message || body.body || body.content || '';
    }

    // Extrair telefone
    const telefone = body.phone || body.wuid || body.phoneNumber || body.from || body.sender || body.chatId || '';

    console.log('📱 Telefone:', telefone);
    console.log('💬 Mensagem:', mensagem);

    // Se não tem dados suficientes
    if (!mensagem || !telefone) {
      console.log('⚠️ DADOS INSUFICIENTES - Abortando processamento');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Dados insuficientes para processar'
      }), { 
        status: 200,
        headers
      });
    }

    // Limpar e formatar telefone
    let telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.startsWith('55')) {
      telefoneLimpo = telefoneLimpo.substring(2);
    }

    console.log('🔢 TELEFONE LIMPO:', telefoneLimpo);

    const mensagemLower = mensagem.toLowerCase().trim();

    // ==================== CONFIRMAR ====================
    if (mensagemLower.includes('confirmar') || mensagemLower === 'confirmar') {
      console.log('✅ PROCESSANDO CONFIRMAÇÃO...');

      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        cliente_telefone: telefoneLimpo,
        status: 'agendado'
      });

      console.log(`🔍 Agendamentos encontrados: ${agendamentos?.length || 0}`);

      const agendamentosArray = Array.isArray(agendamentos) ? agendamentos : [];

      if (agendamentosArray.length === 0) {
        console.log('❌ Nenhum agendamento encontrado para confirmar');
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Nenhum agendamento encontrado' 
        }), { 
          status: 200,
          headers
        });
      }

      // Pegar próximo agendamento
      const proximo = agendamentosArray.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      console.log('🔄 Atualizando agendamento:', proximo.id);

      try {
        // Atualizar status
        await base44.asServiceRole.entities.Agendamento.update(proximo.id, {
          status: 'confirmado'
        });

        console.log('✅ STATUS ATUALIZADO!');

        // Registrar log
        await base44.asServiceRole.entities.LogAcao.create({
          tipo: "editou_agendamento",
          usuario_email: "sistema-whatsapp",
          descricao: `Confirmado via WhatsApp: ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
          entidade_tipo: "Agendamento",
          entidade_id: proximo.id,
          dados_antigos: JSON.stringify({ status: proximo.status }),
          dados_novos: JSON.stringify({ status: 'confirmado' })
        });

        console.log('✅ LOG REGISTRADO!');

        // Enviar confirmação via WhatsApp
        if (WHATSAPP_INSTANCE_ID && WHATSAPP_INSTANCE_TOKEN && WHATSAPP_CLIENT_TOKEN) {
          const telefoneFormatado = '55' + telefoneLimpo;
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;

          console.log('📤 Enviando confirmação para:', telefoneFormatado);

          const respMsg = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': WHATSAPP_CLIENT_TOKEN
            },
            body: JSON.stringify({
              phone: telefoneFormatado,
              message: '✅ Seu agendamento foi confirmado! Obrigado!'
            })
          });

          const respData = await respMsg.json();
          console.log('📤 Resposta Z-API:', JSON.stringify(respData, null, 2));
        }

        console.log('✅✅✅ CONFIRMAÇÃO SUCESSO!');

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Agendamento confirmado',
          agendamento_id: proximo.id
        }), { 
          status: 200,
          headers
        });

      } catch (error) {
        console.error('❌ ERRO na confirmação:', error.message);
        throw error;
      }
    }

    // ==================== CANCELAR ====================
    if (mensagemLower.includes('cancelar') || mensagemLower === 'cancelar') {
      console.log('❌ PROCESSANDO CANCELAMENTO...');

      const agendados = await base44.asServiceRole.entities.Agendamento.filter({
        cliente_telefone: telefoneLimpo,
        status: 'agendado'
      });

      const confirmados = await base44.asServiceRole.entities.Agendamento.filter({
        cliente_telefone: telefoneLimpo,
        status: 'confirmado'
      });

      const todos = [
        ...(Array.isArray(agendados) ? agendados : []),
        ...(Array.isArray(confirmados) ? confirmados : [])
      ];

      console.log(`🔍 Agendamentos encontrados: ${todos.length}`);

      if (todos.length === 0) {
        console.log('❌ Nenhum agendamento encontrado para cancelar');
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Nenhum agendamento encontrado' 
        }), { 
          status: 200,
          headers
        });
      }

      // Pegar próximo agendamento
      const proximo = todos.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      console.log('🔄 Cancelando agendamento:', proximo.id);

      try {
        // Atualizar status
        await base44.asServiceRole.entities.Agendamento.update(proximo.id, {
          status: 'cancelado'
        });

        console.log('✅ CANCELADO NO BANCO!');

        // Registrar log
        await base44.asServiceRole.entities.LogAcao.create({
          tipo: "editou_agendamento",
          usuario_email: "sistema-whatsapp",
          descricao: `Cancelado via WhatsApp: ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
          entidade_tipo: "Agendamento",
          entidade_id: proximo.id,
          dados_antigos: JSON.stringify({ status: proximo.status }),
          dados_novos: JSON.stringify({ status: 'cancelado' })
        });

        console.log('✅ LOG REGISTRADO!');

        // Enviar cancelamento via WhatsApp
        if (WHATSAPP_INSTANCE_ID && WHATSAPP_INSTANCE_TOKEN && WHATSAPP_CLIENT_TOKEN) {
          const telefoneFormatado = '55' + telefoneLimpo;
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;

          console.log('📤 Enviando cancelamento para:', telefoneFormatado);

          const respMsg = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': WHATSAPP_CLIENT_TOKEN
            },
            body: JSON.stringify({
              phone: telefoneFormatado,
              message: '❌ Seu agendamento foi cancelado!'
            })
          });

          const respData = await respMsg.json();
          console.log('📤 Resposta Z-API:', JSON.stringify(respData, null, 2));
        }

        console.log('✅✅✅ CANCELAMENTO SUCESSO!');

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Agendamento cancelado',
          agendamento_id: proximo.id
        }), { 
          status: 200,
          headers
        });

      } catch (error) {
        console.error('❌ ERRO no cancelamento:', error.message);
        throw error;
      }
    }

    // Comando não reconhecido
    console.log('⚠️ Comando não reconhecido:', mensagemLower);
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Comando não reconhecido. Use "confirmar" ou "cancelar"'
    }), { 
      status: 200,
      headers
    });

  } catch (error) {
    console.error('🔴 ERRO GERAL:', error.message);
    console.error('🔴 Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      message: 'Erro ao processar webhook',
      error: error.message
    }), { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
});