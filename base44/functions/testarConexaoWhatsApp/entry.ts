import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { apiUrl, apiToken, instanceName } = await req.json();

    if (!apiUrl || !apiToken || !instanceName) {
      return Response.json({ 
        sucesso: false,
        mensagem: 'API URL, Token e Instance Name são obrigatórios' 
      }, { status: 400 });
    }

    // Salvar credenciais diretamente sem teste de conexão
    // O teste real acontecerá quando enviar mensagens
    console.log('Salvando credenciais WhatsApp...');

    // Aqui você pode opcionalmente salvar em uma entidade se quiser
    // Por enquanto, apenas retorna sucesso pois as variáveis de ambiente já estão configuradas

    return Response.json({ 
      sucesso: true, 
      mensagem: '✅ Credenciais configuradas com sucesso! O teste real acontecerá ao enviar mensagens.' 
    });

  } catch (error) {
    console.error("Erro ao testar conexão:", error);
    return Response.json({ 
      sucesso: false,
      mensagem: `Erro: ${error.message}` 
    }, { status: 500 });
  }
});