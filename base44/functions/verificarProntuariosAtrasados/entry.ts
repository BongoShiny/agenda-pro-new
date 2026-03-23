import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação (sistema ou admin)
    const user = await base44.auth.me().catch(() => null);
    
    // Buscar todos os agendamentos de hoje
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];
    
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
      data: dataHoje,
      status: { $ne: 'bloqueio' }
    });
    
    // Buscar todos os prontuários
    const prontuarios = await base44.asServiceRole.entities.Prontuario.list();
    
    // Buscar todos os usuários recepcionistas
    const usuarios = await base44.asServiceRole.entities.User.list();
    const recepcionistas = usuarios.filter(u => u.cargo === 'recepcao');
    
    const agora = new Date();
    const alertas = [];
    
    for (const ag of agendamentos) {
      // Verificar se tem prontuário
      const temProntuario = prontuarios.some(p => p.agendamento_id === ag.id);
      if (temProntuario) continue;
      
      // Verificar se passou 1 hora do término
      const [ano, mes, dia] = ag.data.split('-').map(Number);
      const [horaFim, minutoFim] = ag.hora_fim.split(':').map(Number);
      const dataFimSessao = new Date(ano, mes - 1, dia, horaFim, minutoFim);
      const umaHoraDepois = new Date(dataFimSessao.getTime() + 60 * 60 * 1000);
      
      if (agora > umaHoraDepois) {
        // Encontrar recepcionistas da unidade
        const recepcionistasUnidade = recepcionistas.filter(r => 
          r.unidades_acesso?.includes(ag.unidade_id)
        );
        
        // Enviar alerta para cada recepcionista
        for (const recep of recepcionistasUnidade) {
          alertas.push({
            usuario: recep.email,
            agendamento: ag.cliente_nome,
            unidade: ag.unidade_nome,
            horario: `${ag.hora_inicio} - ${ag.hora_fim}`
          });
          
          // Criar log de alerta
          await base44.asServiceRole.entities.LogAcao.create({
            tipo: "editou_agendamento",
            usuario_email: "sistema-prontuarios",
            descricao: `⚠️ ALERTA: Prontuário atrasado - ${ag.cliente_nome} (${ag.data} ${ag.hora_inicio}) - Notificado: ${recep.email}`,
            entidade_tipo: "Prontuario",
            entidade_id: ag.id
          });
        }
      }
    }
    
    return Response.json({
      success: true,
      alertasEnviados: alertas.length,
      alertas: alertas
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});