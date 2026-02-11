import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obter o access token do Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    return Response.json({ 
      access_token: accessToken,
      picker_api_key: 'AIzaSyAa8yy0GdcGPHdtD083HiGGx_S0vMPScDM' // API Key pública do Google
    });

  } catch (error) {
    console.error('Error getting token:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});