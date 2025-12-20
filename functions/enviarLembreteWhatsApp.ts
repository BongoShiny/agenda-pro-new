import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Pegar configurações da API do WhatsApp
    const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL");
    const WHATSAPP_API_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
    const WHATSAPP_INSTANCE_NAME = Deno.env.get("WHATSAPP_INSTANCE_NAME");

    if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
      return Response.json({ 
        error: 'Configurações do WhatsApp não encontradas. Configure WHATSAPP_API_URL e WHATSAPP_API_TOKEN' 
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

    // Buscar todas as configurações ativas
    const configuracoes = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({ ativo: true });
    
    if (configuracoes.length === 0) {
      return Response.json({ message: 'Nenhuma configuração ativa encontrada' });
    }

    let mensagensEnviadas = 0;
    const erros = [];

    // Para cada configuração ativa
    for (const config of configuracoes) {
      // Buscar agendamentos da unidade que precisam de lembrete
      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        unidade_id: config.unidade_id,
        status: 'agendado'
      });

      for (const ag of agendamentos) {
        // Verificar se tem telefone
        if (!ag.cliente_telefone) continue;

        // Converter data do agendamento para Date
        const [ano, mes, dia] = ag.data.split('-').map(Number);
        const [hora, minuto] = ag.hora_inicio.split(':').map(Number);
        const dataAgendamento = new Date(ano, mes - 1, dia, hora, minuto);

        // Verificar se precisa enviar lembrete de 1 dia
        const diff1Dia = Math.abs(dataAgendamento - umDiaFrente);
        const diff12Horas = Math.abs(dataAgendamento - dozeHorasFrente);

        let deveEnviar = false;
        if (config.enviar_1_dia && diff1Dia < 3600000) { // Dentro de 1 hora de diferença
          deveEnviar = true;
        }
        if (config.enviar_12_horas && diff12Horas < 3600000) { // Dentro de 1 hora de diferença
          deveEnviar = true;
        }

        if (!deveEnviar) continue;

        // Montar mensagem personalizada
        let mensagem = config.mensagem_template || 
          "Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar";

        // Substituir variáveis
        const dataFormatada = new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR');
        mensagem = mensagem
          .replace(/\{cliente\}/g, ag.cliente_nome)
          .replace(/\{profissional\}/g, ag.profissional_nome)
          .replace(/\{data\}/g, dataFormatada)
          .replace(/\{hora\}/g, ag.hora_inicio)
          .replace(/\{unidade\}/g, ag.unidade_nome)
          .replace(/\{servico\}/g, ag.servico_nome || 'Consulta');

        // Limpar telefone (remover caracteres especiais)
        const telefone = ag.cliente_telefone.replace(/\D/g, '');
        const telefoneFormatado = telefone.startsWith('55') ? telefone : '55' + telefone;

        try {
          // Enviar mensagem via API do WhatsApp
          const response = await fetch(WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': WHATSAPP_API_TOKEN
            },
            body: JSON.stringify({
              number: telefoneFormatado,
              text: mensagem,
              instance: WHATSAPP_INSTANCE_NAME
            })
          });

          if (response.ok) {
            mensagensEnviadas++;
            
            // Registrar no log
            await base44.asServiceRole.entities.LogAcao.create({
              tipo: "editou_agendamento",
              usuario_email: "sistema-whatsapp",
              descricao: `Lembrete WhatsApp enviado para ${ag.cliente_nome} (${ag.cliente_telefone})`,
              entidade_tipo: "Agendamento",
              entidade_id: ag.id
            });
          } else {
            erros.push(`Erro ao enviar para ${ag.cliente_nome}: ${response.statusText}`);
          }
        } catch (error) {
          erros.push(`Erro ao enviar para ${ag.cliente_nome}: ${error.message}`);
        }
      }
    }

    return Response.json({
      success: true,
      mensagensEnviadas,
      erros: erros.length > 0 ? erros : undefined
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});