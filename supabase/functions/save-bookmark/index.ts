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

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Parse body
  let body: { token?: string; url?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { token, url, title } = body;
  if (!token || !url) {
    return jsonResponse({ error: 'Missing required fields: token, url' }, 400);
  }

  // Validate URL format
  try {
    new URL(url);
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

  // Insert bookmark with the token owner's user_id
  const { data: bookmark, error: insertError } = await adminClient
    .from('bookmarks')
    .insert({
      user_id: tokenRow.user_id,
      url,
      title: title || null,
      status: 'unread',
      is_favorited: false,
      notes: [],
      tags: [],
      metadata: {},
      synced: false,
    })
    .select('id')
    .single();

  if (insertError) {
    return jsonResponse({ error: 'Failed to save bookmark' }, 500);
  }

  // Update last_used_at on the token
  await adminClient
    .from('user_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  return jsonResponse({ id: bookmark.id, status: 'saved' }, 201);
});
