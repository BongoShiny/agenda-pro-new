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
    const tipoArquivo = formData.get('tipo_arquivo') || 'Outros';

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");
    const fileBytes = await file.arrayBuffer();
    const fileName = `${unidadeNome}_${clienteNome}_${tipoArquivo}_${file.name}`;

    // Upload direto sem criar pastas (limitação do escopo drive.file)
    const metadata = {
      name: fileName,
      mimeType: file.type || 'application/octet-stream'
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    // Construir multipart body corretamente com dados binários
    const metadataPart = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata);

    const filePart = 
      delimiter +
      'Content-Type: ' + (file.type || 'application/octet-stream') + '\r\n\r\n';

    // Converter strings para bytes
    const encoder = new TextEncoder();
    const metadataBytes = encoder.encode(metadataPart);
    const filePartBytes = encoder.encode(filePart);
    const closeDelimiterBytes = encoder.encode(closeDelimiter);

    // Concatenar tudo em um único array
    const totalLength = metadataBytes.length + filePartBytes.length + fileBytes.byteLength + closeDelimiterBytes.length;
    const body = new Uint8Array(totalLength);
    
    let offset = 0;
    body.set(metadataBytes, offset);
    offset += metadataBytes.length;
    body.set(filePartBytes, offset);
    offset += filePartBytes.length;
    body.set(new Uint8Array(fileBytes), offset);
    offset += fileBytes.byteLength;
    body.set(closeDelimiterBytes, offset);

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      return Response.json({ error: `Upload failed: ${error}` }, { status: 500 });
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;

    // Tornar público
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