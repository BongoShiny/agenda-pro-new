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
    // Tenta com /api/v1/agentes que é um endpoint padrão da Octadesk
    const urlTeste = `${apiUrl}/api/v1/agentes`;
    
    console.log('Testando conexão com:', urlTeste);

    try {
      const response = await fetch(urlTeste, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        }
      });

      console.log('Status da resposta:', response.status);

      if (response.status === 401) {
        return Response.json({ 
          sucesso: false, 
          mensagem: '❌ Token inválido. Verifique sua chave de API.' 
        });
      } else if (response.status === 404) {
        return Response.json({ 
          sucesso: false, 
          mensagem: `❌ URL incorreta ou instância não encontrada. Verifique: ${apiUrl}` 
        });
      } else if (response.ok) {
        return Response.json({ 
          sucesso: true, 
          mensagem: '✅ Conexão com API WhatsApp estabelecida com sucesso!' 
        });
      } else {
        try {
          const resultado = await response.text();
          return Response.json({ 
            sucesso: false, 
            mensagem: `❌ Erro ${response.status}: Verifique as credenciais e a URL` 
          });
        } catch (e) {
          return Response.json({ 
            sucesso: false, 
            mensagem: `❌ Erro ${response.status}: Não foi possível processar a resposta` 
          });
        }
      }
    } catch (fetchError) {
      console.error('Erro na requisição fetch:', fetchError);
      return Response.json({ 
        sucesso: false, 
        mensagem: `❌ Erro ao conectar: Verifique se a URL está correta e completa (ex: https://o216174-f20.api002.octadesk.services)` 
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