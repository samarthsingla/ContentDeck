import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Parse body from JSON or form-encoded (iOS Shortcuts may send either) */
async function parseBody(
  req: Request,
): Promise<{ token?: string; url?: string; title?: string }> {
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return await req.json();
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    return {
      token: params.get('token') ?? undefined,
      url: params.get('url') ?? undefined,
      title: params.get('title') ?? undefined,
    };
  }

  // Fallback: try JSON first, then form-encoded
  const text = await req.text();
  try {
    return JSON.parse(text);
  } catch {
    const params = new URLSearchParams(text);
    if (params.get('token') || params.get('url')) {
      return {
        token: params.get('token') ?? undefined,
        url: params.get('url') ?? undefined,
        title: params.get('title') ?? undefined,
      };
    }
    return {};
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Parse body (supports JSON and form-encoded)
  let body: { token?: string; url?: string; title?: string };
  try {
    body = await parseBody(req);
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  // Coerce to strings and trim (iOS Shortcuts can send unexpected types)
  const token = String(body.token ?? '').trim();
  const url = String(body.url ?? '').trim();
  const title = String(body.title ?? '').trim();

  if (!token || !url) {
    return jsonResponse({ error: 'Missing required fields: token, url' }, 400);
  }

  // Validate URL format and scheme (only http/https allowed)
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return jsonResponse({ error: 'Invalid URL scheme — only http and https allowed' }, 400);
    }
  } catch {
    return jsonResponse({ error: 'Invalid URL' }, 400);
  }

  // Hash the token and look it up
  const tokenHash = await hashToken(token);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: tokenRow, error: tokenError } = await adminClient
    .from('user_tokens')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .single();

  if (tokenError || !tokenRow) {
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  // Insert bookmark via raw SQL to bypass set_user_id() trigger
  // The trigger would overwrite user_id with auth.uid() which is null for service role
  const { data: insertData, error: insertError } = await adminClient.rpc(
    'insert_bookmark_via_token',
    {
      p_user_id: tokenRow.user_id,
      p_url: url,
      p_title: title || null,
    },
  );

  if (insertError) {
    return jsonResponse({ error: 'Failed to save bookmark', detail: insertError.message }, 500);
  }

  // Update last_used_at on the token
  await adminClient
    .from('user_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  return jsonResponse({ id: insertData, status: 'saved' }, 201);
});
