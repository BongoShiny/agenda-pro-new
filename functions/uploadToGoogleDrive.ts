import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Obter o access token do Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Ler o arquivo como bytes
    const fileBytes = await file.arrayBuffer();
    const fileName = file.name || 'arquivo_' + Date.now();

    // Upload usando resumable upload (mais confiável)
    const metadata = {
      name: fileName,
      parents: []
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