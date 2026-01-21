import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas administradores podem fazer isso
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, unidadeIds } = await req.json();

    if (!email || !Array.isArray(unidadeIds) || unidadeIds.length === 0) {
      return Response.json({ error: 'Email e unidadeIds (array) são obrigatórios' }, { status: 400 });
    }

    // Atualizar o usuário com unidades_acesso
    const resultado = await base44.asServiceRole.auth.updateUserByEmail(email, {
      unidades_acesso: unidadeIds
    });

    return Response.json({ 
      success: true, 
      message: `Usuário ${email} agora tem acesso às ${unidadeIds.length} unidade(s)`,
      resultado 
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});