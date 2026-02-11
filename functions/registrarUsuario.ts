import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email, password, full_name, cargo, unidades_acesso, aprovado } = body;

    // Validações básicas
    if (!email || !password || !full_name) {
      return Response.json({ error: "Email, senha e nome são obrigatórios" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Verificar se email já existe
    const usuariosExistentes = await base44.asServiceRole.entities.User.filter({
      email: email.toLowerCase().trim()
    });

    if (usuariosExistentes.length > 0) {
      return Response.json({ error: "Email já cadastrado" }, { status: 400 });
    }

    // Criar novo usuário
    const novoUsuario = await base44.asServiceRole.entities.User.create({
      email: email.toLowerCase().trim(),
      full_name: full_name.trim(),
      cargo: cargo || "recepcao",
      unidades_acesso: unidades_acesso || [],
      aprovado: false,
      ativo: true
    });

    return Response.json({
      success: true,
      usuario_id: novoUsuario.id,
      message: "Usuário registrado com sucesso. Aguarde aprovação."
    }, { status: 201 });

  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});