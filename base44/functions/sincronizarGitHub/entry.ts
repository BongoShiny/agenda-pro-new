import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const githubRepo = Deno.env.get("GITHUB_REPO");
    const githubBranch = Deno.env.get("GITHUB_BRANCH") || "main";

    if (!githubToken || !githubRepo) {
      return Response.json({ 
        error: "Configuração incompleta. Configure GITHUB_TOKEN e GITHUB_REPO nas variáveis de ambiente." 
      }, { status: 400 });
    }

    // Buscar todos os dados
    const [
      agendamentos,
      clientes,
      profissionais,
      unidades,
      servicos,
      vendedores,
      prontuarios,
      registrosVendas
    ] = await Promise.all([
      base44.asServiceRole.entities.Agendamento.list("-data"),
      base44.asServiceRole.entities.Cliente.list("nome"),
      base44.asServiceRole.entities.Profissional.list("nome"),
      base44.asServiceRole.entities.Unidade.list("nome"),
      base44.asServiceRole.entities.Servico.list("nome"),
      base44.asServiceRole.entities.Vendedor.list("nome"),
      base44.asServiceRole.entities.Prontuario.list("-created_date"),
      base44.asServiceRole.entities.RegistroManualVendas.list("-data_pagamento")
    ]);

    // Criar estrutura de dados
    const backupData = {
      data_backup: new Date().toISOString(),
      total_registros: {
        agendamentos: agendamentos.length,
        clientes: clientes.length,
        profissionais: profissionais.length,
        unidades: unidades.length,
        servicos: servicos.length,
        vendedores: vendedores.length,
        prontuarios: prontuarios.length,
        registros_vendas: registrosVendas.length
      },
      dados: {
        agendamentos,
        clientes,
        profissionais,
        unidades,
        servicos,
        vendedores,
        prontuarios,
        registros_vendas: registrosVendas
      }
    };

    const jsonContent = JSON.stringify(backupData, null, 2);
    const encodedContent = btoa(jsonContent);
    
    // Data/hora para o nome do arquivo
    const agora = new Date();
    const dataHora = agora.toISOString().split('.')[0].replace(/:/g, '-');
    const fileName = `backup/agenda_${dataHora}.json`;

    // Verificar se arquivo existe (para obter SHA se necessário)
    const checkUrl = `https://api.github.com/repos/${githubRepo}/contents/${fileName}`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = null;
    if (checkResponse.ok) {
      const fileData = await checkResponse.json();
      sha = fileData.sha;
    }

    // Fazer commit no GitHub
    const commitUrl = `https://api.github.com/repos/${githubRepo}/contents/${fileName}`;
    const commitData = {
      message: `Backup automático - ${agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      content: encodedContent,
      branch: githubBranch
    };
    
    if (sha) {
      commitData.sha = sha;
    }

    const commitResponse = await fetch(commitUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commitData)
    });

    if (!commitResponse.ok) {
      const error = await commitResponse.text();
      throw new Error(`Erro ao fazer commit no GitHub: ${error}`);
    }

    const result = await commitResponse.json();

    return Response.json({
      success: true,
      message: "Backup sincronizado com sucesso no GitHub",
      arquivo: fileName,
      commit_url: result.commit?.html_url,
      total_registros: backupData.total_registros,
      timestamp: agora.toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});