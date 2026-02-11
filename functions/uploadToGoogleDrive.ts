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

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Obter o access token do Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Criar o FormData para upload multipart
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
    const arrayBuffer = await file.arrayBuffer();
    
    const metadata = {
      name: file.name,
      mimeType: file.type
    };

    // Construir o body manualmente
    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const filePart = `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`;
    const endBoundary = `\r\n--${boundary}--`;

    // Combinar as partes
    const metadataBuffer = new TextEncoder().encode(metadataPart);
    const filePartBuffer = new TextEncoder().encode(filePart);
    const endBoundaryBuffer = new TextEncoder().encode(endBoundary);
    const fileBuffer = new Uint8Array(arrayBuffer);

    const bodyBuffer = new Uint8Array(
      metadataBuffer.length + 
      filePartBuffer.length + 
      fileBuffer.length + 
      endBoundaryBuffer.length
    );

    bodyBuffer.set(metadataBuffer, 0);
    bodyBuffer.set(filePartBuffer, metadataBuffer.length);
    bodyBuffer.set(fileBuffer, metadataBuffer.length + filePartBuffer.length);
    bodyBuffer.set(endBoundaryBuffer, metadataBuffer.length + filePartBuffer.length + fileBuffer.length);

    // Upload do arquivo
    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: bodyBuffer
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Google Drive upload failed: ${error}`);
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
    const fileUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return Response.json({ file_url: fileUrl });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});