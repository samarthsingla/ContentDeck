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

/** Escape a string for safe interpolation into a JS single-quoted string */
function jsStringEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Generate a bookmarklet javascript: URL */
export function generateBookmarklet(functionUrl: string, token: string): string {
  const safeUrl = jsStringEscape(functionUrl);
  const safeToken = jsStringEscape(token);
  // Minified bookmarklet — sends current page URL + title to the edge function
  const code = `
(function(){
  var x=new XMLHttpRequest();
  x.open('POST','${safeUrl}');
  x.setRequestHeader('Content-Type','application/json');
  x.onload=function(){
    if(x.status===201){alert('Saved to ContentDeck!')}
    else{alert('Error: '+x.responseText)}
  };
  x.onerror=function(){alert('Network error')};
  x.send(JSON.stringify({token:'${safeToken}',url:location.href,title:document.title}));
})()`.replace(/\n\s*/g, '');
  return `javascript:${encodeURIComponent(code)}`;
}

/** Generate iOS Shortcut base URL with token baked in as query param */
export function generateShortcutUrl(functionUrl: string, token: string): string {
  return `${functionUrl}?token=${encodeURIComponent(token)}&url=`;
}
