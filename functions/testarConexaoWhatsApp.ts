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

    // Tentar fazer uma chamada simples para testar a conexão
    const urlTeste = `${apiUrl}/instance`;
    
    console.log('Testando conexão com:', urlTeste);

    const response = await fetch(urlTeste, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiToken
      }
    });

    const resultado = await response.json();

    if (response.ok) {
      return Response.json({ 
        sucesso: true, 
        mensagem: '✅ Conexão com API WhatsApp estabelecida com sucesso!' 
      });
    } else if (response.status === 401) {
      return Response.json({ 
        sucesso: false, 
        mensagem: '❌ Token inválido. Verifique sua chave de API.' 
      });
    } else if (response.status === 404) {
      return Response.json({ 
        sucesso: false, 
        mensagem: `❌ URL incorreta ou instância não encontrada. Verifique: ${apiUrl}` 
      });
    } else {
      return Response.json({ 
        sucesso: false, 
        mensagem: `❌ Erro ao conectar: ${resultado.message || 'Verifique as credenciais'}` 
      });
    }

  } catch (error) {
    console.error("Erro ao testar conexão:", error);
    return Response.json({ 
      sucesso: false,
      mensagem: `Erro: ${error.message}` 
    }, { status: 500 });
  }
});