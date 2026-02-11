import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData;
    try {
      formData = await req.formData();
    } catch (e) {
      return Response.json({ error: 'Failed to parse form data: ' + e.message }, { status: 400 });
    }

    const file = formData.get('file');
    const unidadeNome = formData.get('unidade_nome') || 'UNIDADE';
    const clienteNome = formData.get('cliente_nome') || 'Cliente';
    const tipoArquivo = formData.get('tipo_arquivo') || 'Outros';

    if (!file || !file.name) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Usar Base44 UploadFile diretamente (sem limite de crédito do Google Drive)
    const fileBytes = await file.arrayBuffer();
    const fileName = `${unidadeNome}_${clienteNome}_${tipoArquivo}_${file.name}`;
    
    // Criar novo File object com nome personalizado
    const renamedFile = new File([fileBytes], fileName, { type: file.type });
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file: renamedFile });

    return Response.json({ 
      file_url: file_url,
      file_name: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});