import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Método não permitido' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    // Verificar se o usuário existe e a senha está correta
    const base44 = createClientFromRequest(req);
    
    // Tentar fazer login usando o SDK
    try {
      const response = await base44.auth.login(email.toLowerCase().trim(), password);
      return Response.json({ 
        success: true, 
        message: 'Login realizado com sucesso',
        user: response 
      });
    } catch (authError) {
      return Response.json({ error: 'Email ou senha inválidos' }, { status: 401 });
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return Response.json({ error: 'Erro ao processar login' }, { status: 500 });
  }
});