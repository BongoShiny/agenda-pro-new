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
    const unidadeNome = formData.get('unidade_nome') || 'Comprovantes';

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Obter o access token do Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Buscar ou criar pasta da unidade
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(unidadeNome)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const searchData = await searchResponse.json();
    let folderId;

    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
    } else {
      // Criar pasta
      const createFolderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: unidadeNome,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
      const folderData = await createFolderResponse.json();
      folderId = folderData.id;
    }

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