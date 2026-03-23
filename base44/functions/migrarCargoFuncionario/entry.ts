import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Verificar se é admin
    if (user?.role !== "admin") {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os usuários com cargo "funcionario"
    const usuarios = await base44.asServiceRole.entities.User.list();
    const usuariosParaMigrar = usuarios.filter(u => u.cargo === "funcionario");

    // Atualizar cada usuário
    for (const usuario of usuariosParaMigrar) {
      await base44.asServiceRole.entities.User.update(usuario.id, {
        cargo: "sem_acesso"
      });
    }

    return Response.json({ 
      success: true,
      message: `Migrados ${usuariosParaMigrar.length} usuários de "funcionario" para "sem_acesso"`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});