import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default async function webhookZAPI(req) {
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Client-Token',
      'Content-Type': 'application/json'
    };

    console.log('✅ WEBHOOK RECEBIDO');
    console.log('📨 Método:', req.method);

    if (req.method === 'OPTIONS') {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    if (req.method === 'GET') {
      return new Response(JSON.stringify({ 
        success: true,
        status: 'Webhook ativo',
        message: 'Use POST para enviar dados'
      }), { status: 200, headers });
    }

    let body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch (e) {
      console.log('⚠️ Erro ao parsear:', e.message);
    }

    console.log('📥 Body:', JSON.stringify(body, null, 2));

    const base44 = createClientFromRequest(req);

    const WHATSAPP_INSTANCE_ID = (Deno.env.get("WHATSAPP_INSTANCE_ID") || "").trim();
    const WHATSAPP_INSTANCE_TOKEN = (Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "").trim();
    const WHATSAPP_CLIENT_TOKEN = (Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "").trim();

    let mensagem = '';
    if (typeof body.text === 'object' && body.text !== null) {
      mensagem = body.text.message || '';
    } else if (typeof body.text === 'string') {
      mensagem = body.text;
    } else {
      mensagem = body.message || body.body || body.content || '';
    }

    const telefone = body.phone || body.wuid || body.phoneNumber || body.from || body.sender || body.chatId || '';

    console.log('📱 Telefone:', telefone);
    console.log('💬 Mensagem:', mensagem);

    if (!mensagem || !telefone) {
      console.log('⚠️ Dados insuficientes');
      return new Response(JSON.stringify({ success: true, message: 'Dados insuficientes' }), { status: 200, headers });
    }

    let telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.startsWith('55')) {
      telefoneLimpo = telefoneLimpo.substring(2);
    }

    console.log('🔢 Telefone limpo:', telefoneLimpo);

    const mensagemLower = mensagem.toLowerCase().trim();

    // ==================== CONFIRMAR ====================
    if (mensagemLower.includes('confirmar') || mensagemLower === 'confirmar') {
      console.log('✅ PROCESSANDO CONFIRMAÇÃO');

      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        cliente_telefone: telefoneLimpo,
        status: 'agendado'
      });

      const agendamentosArray = Array.isArray(agendamentos) ? agendamentos : [];

      if (agendamentosArray.length === 0) {
        console.log('❌ Nenhum agendamento encontrado');
        return new Response(JSON.stringify({ success: true, message: 'Nenhum agendamento encontrado' }), { status: 200, headers });
      }

      const proximo = agendamentosArray.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      console.log('🔄 Confirmando:', proximo.id);

      try {
        await base44.asServiceRole.entities.Agendamento.update(proximo.id, {
          status: 'confirmado'
        });

        await base44.asServiceRole.entities.LogAcao.create({
          tipo: "editou_agendamento",
          usuario_email: "sistema-whatsapp",
          descricao: `Confirmado via WhatsApp: ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
          entidade_tipo: "Agendamento",
          entidade_id: proximo.id,
          dados_antigos: JSON.stringify({ status: proximo.status }),
          dados_novos: JSON.stringify({ status: 'confirmado' })
        });

        if (WHATSAPP_INSTANCE_ID && WHATSAPP_INSTANCE_TOKEN && WHATSAPP_CLIENT_TOKEN) {
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': WHATSAPP_CLIENT_TOKEN
            },
            body: JSON.stringify({
              phone: '55' + telefoneLimpo,
              message: '✅ Seu agendamento foi confirmado!'
            })
          });
        }

        console.log('✅ CONFIRMAÇÃO OK');
        return new Response(JSON.stringify({ success: true, message: 'Confirmado', agendamento_id: proximo.id }), { status: 200, headers });
      } catch (error) {
        console.error('❌ Erro:', error.message);
        throw error;
      }
    }

    // ==================== CANCELAR ====================
    if (mensagemLower.includes('cancelar') || mensagemLower === 'cancelar') {
      console.log('❌ PROCESSANDO CANCELAMENTO');

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

      if (todos.length === 0) {
        console.log('❌ Nenhum agendamento encontrado');
        return new Response(JSON.stringify({ success: true, message: 'Nenhum agendamento encontrado' }), { status: 200, headers });
      }

      const proximo = todos.sort((a, b) => 
        new Date(a.data + 'T' + a.hora_inicio) - new Date(b.data + 'T' + b.hora_inicio)
      )[0];

      console.log('🔄 Cancelando:', proximo.id);

      try {
        await base44.asServiceRole.entities.Agendamento.update(proximo.id, {
          status: 'cancelado'
        });

        await base44.asServiceRole.entities.LogAcao.create({
          tipo: "editou_agendamento",
          usuario_email: "sistema-whatsapp",
          descricao: `Cancelado via WhatsApp: ${proximo.cliente_nome} - ${proximo.data} ${proximo.hora_inicio}`,
          entidade_tipo: "Agendamento",
          entidade_id: proximo.id,
          dados_antigos: JSON.stringify({ status: proximo.status }),
          dados_novos: JSON.stringify({ status: 'cancelado' })
        });

        if (WHATSAPP_INSTANCE_ID && WHATSAPP_INSTANCE_TOKEN && WHATSAPP_CLIENT_TOKEN) {
          const url = `https://api.z-api.io/instances/${WHATSAPP_INSTANCE_ID}/token/${WHATSAPP_INSTANCE_TOKEN}/send-text`;
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': WHATSAPP_CLIENT_TOKEN
            },
            body: JSON.stringify({
              phone: '55' + telefoneLimpo,
              message: '❌ Seu agendamento foi cancelado!'
            })
          });
        }

        console.log('✅ CANCELAMENTO OK');
        return new Response(JSON.stringify({ success: true, message: 'Cancelado', agendamento_id: proximo.id }), { status: 200, headers });
      } catch (error) {
        console.error('❌ Erro:', error.message);
        throw error;
      }
    }

    console.log('⚠️ Comando desconhecido');
    return new Response(JSON.stringify({ success: true, message: 'Comando não reconhecido. Use "confirmar" ou "cancelar"' }), { status: 200, headers });

  } catch (error) {
    console.error('🔴 Erro:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}