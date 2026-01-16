import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.cargo !== 'administrador' && user?.cargo !== 'superior') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todas as unidades
    const unidades = await base44.asServiceRole.entities.Unidade.list();
    
    // Buscar todas as configurações de terapeutas
    const configuracoes = await base44.asServiceRole.entities.ConfiguracaoTerapeuta.list();
    
    // Buscar todos os profissionais
    const profissionais = await base44.asServiceRole.entities.Profissional.list();

    // Gerar todos os sábados do ano atual e próximo
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const sabados = [];

    // Gerar sábados de todo o ano atual e próximo
    for (let ano = anoAtual; ano <= anoAtual + 1; ano++) {
      for (let mes = 0; mes < 12; mes++) {
        for (let dia = 1; dia <= 31; dia++) {
          const data = new Date(ano, mes, dia);
          if (data.getMonth() !== mes) break; // Dia inválido para o mês
          if (data.getDay() === 6) { // Sábado
            const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            sabados.push(dataFormatada);
          }
        }
      }
    }

    let bloqueiosCriados = 0;
    const erros = [];

    // Para cada sábado, criar bloqueios para todos os terapeutas de todas as unidades
    for (const dataSabado of sabados) {
      // Buscar se já existem bloqueios para evitar duplicatas
      const agendamentosExistentes = await base44.asServiceRole.entities.Agendamento.filter({
        data: dataSabado,
        hora_inicio: "18:00",
        hora_fim: "19:00",
        status: "bloqueio"
      });

      // Criar mapa de bloqueios existentes por unidade e profissional
      const bloqueiosExistentes = new Set();
      agendamentosExistentes.forEach(ag => {
        bloqueiosExistentes.add(`${ag.unidade_id}-${ag.profissional_id}`);
      });

      // Para cada unidade
      for (const unidade of unidades) {
        // Buscar terapeutas ativos desta unidade
        const terapeutasUnidade = configuracoes.filter(
          config => config.unidade_id === unidade.id && config.ativo
        );

        for (const config of terapeutasUnidade) {
          const profissional = profissionais.find(p => p.id === config.profissional_id);
          if (!profissional) continue;

          // Verificar se já existe bloqueio
          const chave = `${unidade.id}-${profissional.id}`;
          if (bloqueiosExistentes.has(chave)) {
            continue; // Pular se já existe
          }

          try {
            await base44.asServiceRole.entities.Agendamento.create({
              cliente_nome: "FECHADO",
              profissional_id: profissional.id,
              profissional_nome: profissional.nome,
              unidade_id: unidade.id,
              unidade_nome: unidade.nome,
              servico_nome: "Horário Bloqueado - Sábado 18:00-19:00",
              data: dataSabado,
              hora_inicio: "18:00",
              hora_fim: "19:00",
              status: "bloqueio",
              tipo: "bloqueio",
              observacoes: "Fechamento automático de sábados 18:00-19:00"
            });
            bloqueiosCriados++;
          } catch (error) {
            erros.push({
              data: dataSabado,
              unidade: unidade.nome,
              profissional: profissional.nome,
              erro: error.message
            });
          }
        }
      }
    }

    // Registrar log
    await base44.asServiceRole.entities.LogAcao.create({
      tipo: "bloqueou_horario",
      usuario_email: user.email,
      descricao: `Bloqueou automaticamente horário 18:00-19:00 de todos os sábados - ${bloqueiosCriados} bloqueios criados`,
      entidade_tipo: "Agendamento"
    });

    return Response.json({
      success: true,
      bloqueiosCriados,
      totalSabados: sabados.length,
      erros: erros.length > 0 ? erros : undefined,
      mensagem: `✅ Processo concluído! ${bloqueiosCriados} bloqueios criados para ${sabados.length} sábados.`
    });

  } catch (error) {
    console.error('Erro ao bloquear sábados:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});