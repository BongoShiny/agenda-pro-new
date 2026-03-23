import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { data: agendamento } = body;
    
    if (!agendamento || agendamento.status !== 'agendado') {
      return Response.json({ message: 'Agendamento não está agendado' });
    }

    // Data/hora atual em Brasília
    const agora = new Date();
    const agoraBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    // Calcular data de amanhã
    const amanha = new Date(agoraBrasilia);
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().split('T')[0];
    
    // Verificar se o agendamento é para amanhã
    if (agendamento.data !== dataAmanha) {
      console.log('Agendamento não é para amanhã, não enviando lembrete imediato');
      return Response.json({ message: 'Agendamento não é para amanhã' });
    }

    // Buscar configuração da unidade
    const configuracoes = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({
      unidade_id: agendamento.unidade_id,
      ativo: true
    });

    if (configuracoes.length === 0) {
      console.log('Sem configuração ativa para esta unidade');
      return Response.json({ message: 'Configuração inativa' });
    }

    const config = configuracoes[0];
    
    // Verificar se já passou o horário de envio
    const horaAtual = agoraBrasilia.getHours();
    const minutoAtual = agoraBrasilia.getMinutes();
    
    let horarioPassou = false;
    
    if (config.tipo_envio === '24_horas_antes') {
      // Horário fixo 18h
      if (horaAtual > 18 || (horaAtual === 18 && minutoAtual >= 0)) {
        horarioPassou = true;
      }
    } else if (config.tipo_envio === 'horario_personalizado') {
      const [horaConfig, minutoConfig] = (config.horario_fixo || '18:00').split(':').map(Number);
      const horarioAtualMinutos = horaAtual * 60 + minutoAtual;
      const horarioConfigMinutos = horaConfig * 60 + minutoConfig;
      
      if (horarioAtualMinutos >= horarioConfigMinutos) {
        horarioPassou = true;
      }
    }

    if (!horarioPassou) {
      console.log('Ainda não passou o horário de envio, aguardando envio automático');
      return Response.json({ message: 'Aguardando horário automático' });
    }

    console.log('✅ Enviando lembrete imediato - agendamento criado após horário de envio');

    // Verificar se já enviou (evitar duplicatas)
    if (agendamento.lembrete_enviado) {
      return Response.json({ message: 'Lembrete já enviado' });
    }

    // Credenciais Z-API
    const WHATSAPP_INSTANCE_ID = Deno.env.get("WHATSAPP_INSTANCE_ID") || "";
    const WHATSAPP_INSTANCE_TOKEN = Deno.env.get("WHATSAPP_INSTANCE_TOKEN") || "";
    const WHATSAPP_CLIENT_TOKEN = Deno.env.get("WHATSAPP_CLIENT_TOKEN") || "";

    if (!WHATSAPP_INSTANCE_ID || !WHATSAPP_INSTANCE_TOKEN || !WHATSAPP_CLIENT_TOKEN) {
      return Response.json({ error: 'Credenciais Z-API incompletas' }, { status: 500 });
    }

    if (!agendamento.cliente_telefone) {
      return Response.json({ message: 'Cliente sem telefone' });
    }

    // Formatar data
    const dataFormatada = new Date(agendamento.data + 'T12:00:00').toLocaleDateString('pt-BR');
    
    // Montar mensagem
    let mensagem = config.mensagem_template || 
      `Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar`;
    
    mensagem = mensagem
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
        console.error('❌ Erro ao enviar:', resposta.error);
        return Response.json({ error: resposta.error }, { status: 500 });
      }

      console.log(`✅ Lembrete imediato enviado para ${agendamento.cliente_nome}`);
      
      // Marcar como enviado
      await base44.asServiceRole.entities.Agendamento.update(agendamento.id, {
        lembrete_enviado: true,
        lembrete_data_envio: new Date().toISOString()
      });
      
      // Log
      await base44.asServiceRole.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: "sistema-whatsapp",
        descricao: `Lembrete WhatsApp enviado automaticamente para ${agendamento.cliente_nome} (criado após horário)`,
        entidade_tipo: "Agendamento",
        entidade_id: agendamento.id
      });

      return Response.json({
        success: true,
        mensagemEnviada: true,
        cliente: agendamento.cliente_nome
      });

    } catch (error) {
      console.error('❌ Erro:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});