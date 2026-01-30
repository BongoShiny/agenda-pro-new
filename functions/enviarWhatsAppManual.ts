import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { agendamento_id } = body;

    if (!agendamento_id) {
      return Response.json({ error: 'ID do agendamento é obrigatório' }, { status: 400 });
    }

    const WHATSAPP_INSTANCE_ID = Deno.env.get("WHATSAPP_INSTANCE_ID") || "";
    const WHATSAPP_INSTANCE_TOKEN = Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "";
    const WHATSAPP_CLIENT_TOKEN = Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "";

    if (!WHATSAPP_INSTANCE_ID || !WHATSAPP_INSTANCE_TOKEN || !WHATSAPP_CLIENT_TOKEN) {
      return Response.json({ error: 'Credenciais Z-API não configuradas' }, { status: 500 });
    }

    // Buscar o agendamento
    const agendamento = await base44.entities.Agendamento.get(agendamento_id);
    
    if (!agendamento) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    if (!agendamento.cliente_telefone) {
      return Response.json({ error: 'Cliente não possui telefone cadastrado' }, { status: 400 });
    }

    // Buscar configuração da unidade
    const configs = await base44.entities.ConfiguracaoWhatsApp.filter({
      unidade_id: agendamento.unidade_id,
      ativo: true
    });

    const config = configs[0];
    const mensagemTemplate = config?.mensagem_template || 
      `Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar`;

    // Formatar data
    const dataFormatada = new Date(agendamento.data + 'T12:00:00').toLocaleDateString('pt-BR');

    // Montar mensagem
    let mensagem = mensagemTemplate
      .replace(/{cliente}/g, agendamento.cliente_nome || '')
      .replace(/{profissional}/g, agendamento.profissional_nome || '')
      .replace(/{data}/g, dataFormatada)
      .replace(/{hora}/g, agendamento.hora_inicio || '')
      .replace(/{unidade}/g, agendamento.unidade_nome || '')
      .replace(/{servico}/g, agendamento.servico_nome || '');

    const telefoneLimpo = agendamento.cliente_telefone.replace(/\D/g, '');
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
        await base44.entities.RegistroEnvioWhatsApp.create({
          agendamento_id: agendamento.id,
          cliente_nome: agendamento.cliente_nome,
          cliente_telefone: agendamento.cliente_telefone,
          unidade_id: agendamento.unidade_id,
          data_agendamento: agendamento.data,
          mensagem_enviada: mensagem,
          tipo_envio: "manual",
          enviado_por: user.email,
          status: "erro",
          erro_mensagem: resposta.error
        });

        return Response.json({ 
          success: false,
          error: resposta.error 
        }, { status: 400 });
      }

      // Registrar envio bem-sucedido
      await base44.entities.RegistroEnvioWhatsApp.create({
        agendamento_id: agendamento.id,
        cliente_nome: agendamento.cliente_nome,
        cliente_telefone: agendamento.cliente_telefone,
        unidade_id: agendamento.unidade_id,
        data_agendamento: agendamento.data,
        mensagem_enviada: mensagem,
        tipo_envio: "manual",
        enviado_por: user.email,
        status: "enviado"
      });

      // Log da ação
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: user.email,
        descricao: `Enviou confirmação WhatsApp manualmente para ${agendamento.cliente_nome}`,
        entidade_tipo: "Agendamento",
        entidade_id: agendamento.id
      });

      return Response.json({
        success: true,
        message: `Confirmação enviada com sucesso para ${agendamento.cliente_nome}`
      });

    } catch (error) {
      // Registrar erro
      await base44.entities.RegistroEnvioWhatsApp.create({
        agendamento_id: agendamento.id,
        cliente_nome: agendamento.cliente_nome,
        cliente_telefone: agendamento.cliente_telefone,
        unidade_id: agendamento.unidade_id,
        data_agendamento: agendamento.data,
        mensagem_enviada: mensagem,
        tipo_envio: "manual",
        enviado_por: user.email,
        status: "erro",
        erro_mensagem: error.message
      });

      return Response.json({ 
        success: false,
        error: error.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});