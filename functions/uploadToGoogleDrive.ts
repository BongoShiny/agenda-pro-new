import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const unidadeNome = formData.get('unidade_nome') || 'UNIDADE';
    const clienteNome = formData.get('cliente_nome') || 'Cliente';
    const tipoArquivo = formData.get('tipo_arquivo') || 'Outros'; // comprovante, contrato, avaliacao_termal

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Obter o access token do Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Função auxiliar para buscar ou criar pasta
    const getOrCreateFolder = async (folderName, parentId = null) => {
      let query = `name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }

      // Criar pasta
      const createBody = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };
      if (parentId) {
        createBody.parents = [parentId];
      }

      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createBody)
      });

      const folderData = await createResponse.json();
      return folderData.id;
    };

    // Estrutura: UNIDADE > Cliente > Tipo (comprovante/contrato/avaliacao_termal)
    const unidadeFolderId = await getOrCreateFolder(unidadeNome);
    const clienteFolderId = await getOrCreateFolder(clienteNome, unidadeFolderId);
    const tipoFolderId = await getOrCreateFolder(tipoArquivo, clienteFolderId);
    
    const folderId = tipoFolderId;

    // Ler o arquivo como bytes
    const fileBytes = await file.arrayBuffer();
    const fileName = file.name || 'arquivo_' + Date.now();

    // Upload usando resumable upload (mais confiável)
    const metadata = {
      name: fileName,
      parents: [folderId]
    };

    // Iniciar upload
    const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type || 'application/octet-stream'
      },
      body: JSON.stringify(metadata)
    });

    if (!initResponse.ok) {
      const error = await initResponse.text();
      return Response.json({ error: `Failed to initialize upload: ${error}` }, { status: 500 });
    }

    const uploadUrl = initResponse.headers.get('Location');
    
    if (!uploadUrl) {
      return Response.json({ error: 'No upload URL received' }, { status: 500 });
    }

    // Upload do arquivo
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: fileBytes
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      return Response.json({ error: `Upload failed: ${error}` }, { status: 500 });
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;

    // Tornar o arquivo público
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });

    // Retornar o link direto do arquivo
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

    return Response.json({ 
      file_url: fileUrl,
      file_id: fileId,
      file_name: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});