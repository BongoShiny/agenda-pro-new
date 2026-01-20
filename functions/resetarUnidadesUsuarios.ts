import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // APENAS ADMIN pode resetar
    if (user?.role !== "admin" && user?.email !== 'lucagamerbr07@gmail.com') {
      return Response.json({ error: 'Apenas admin pode resetar usuários' }, { status: 403 });
    }

    // Buscar TODOS os usuários
    const usuarios = await base44.asServiceRole.entities.User.list();

    // Resetar unidades_acesso para todos
    for (const usuario of usuarios) {
      await base44.asServiceRole.entities.User.update(usuario.id, {
        unidades_acesso: JSON.stringify([])
      });
    }

    return Response.json({
      sucesso: true,
      mensagem: `✅ ${usuarios.length} usuários resetados! unidades_acesso = []`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});