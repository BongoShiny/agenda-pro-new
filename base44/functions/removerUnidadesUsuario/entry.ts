import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas administradores podem fazer isso
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Usar service role para atualizar o usuário
    const resultado = await base44.asServiceRole.auth.updateUserByEmail(email, {
      unidades_acesso: []
    });

    return Response.json({ 
      success: true, 
      message: `Todas as unidades foram removidas de ${email}`,
      resultado 
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});