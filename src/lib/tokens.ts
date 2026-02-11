/** Generate a cryptographically random 32-byte hex token */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** SHA-256 hash a token string → hex */
export async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Derive the edge function URL from the Supabase project URL */
export function getEdgeFunctionUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  // supabaseUrl is like https://<ref>.supabase.co
  return `${supabaseUrl}/functions/v1/save-bookmark`;
}

/** Generate a bookmarklet javascript: URL */
export function generateBookmarklet(functionUrl: string, token: string): string {
  // Minified bookmarklet — sends current page URL + title to the edge function
  const code = `
(function(){
  var x=new XMLHttpRequest();
  x.open('POST','${functionUrl}');
  x.setRequestHeader('Content-Type','application/json');
  x.onload=function(){
    if(x.status===201){alert('Saved to ContentDeck!')}
    else{alert('Error: '+x.responseText)}
  };
  x.onerror=function(){alert('Network error')};
  x.send(JSON.stringify({token:'${token}',url:location.href,title:document.title}));
})()`.replace(/\n\s*/g, '');
  return `javascript:${encodeURIComponent(code)}`;
}

/** Generate iOS Shortcut configuration info */
export function generateShortcutConfig(
  functionUrl: string,
  token: string,
): { url: string; body: string } {
  return {
    url: functionUrl,
    body: JSON.stringify({ token, url: '{{URL}}', title: '{{Title}}' }, null, 2),
  };
}
