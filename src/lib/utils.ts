import type { SourceType } from '../types';

/** Detect source type from URL (client-side, mirrors DB trigger) */
export function detectSourceType(url: string): SourceType {
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be|youtube\.app\.goo\.gl/.test(u)) return 'youtube';
  if (/twitter\.com|x\.com|t\.co/.test(u)) return 'twitter';
  if (/linkedin\.com|lnkd\.in/.test(u)) return 'linkedin';
  if (/substack\.com/.test(u)) return 'substack';
  return 'blog';
}

/** Format a date as relative time (e.g., "2 hours ago") */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Format date for display using local timezone */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format local date as YYYY-MM-DD (local timezone, NOT UTC) */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Extract domain from URL */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/** Get favicon URL for a domain */
export function getFaviconUrl(url: string): string {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/** Truncate text to a max length */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

/** Convert basic HTML (from TipTap) to Markdown */
export function convertHtmlToMarkdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, (_, t) => `# ${t}\n\n`)
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, (_, t) => `## ${t}\n\n`)
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, (_, t) => `### ${t}\n\n`)
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, (_, t) => `**${t}**`)
    .replace(/<b[^>]*>(.*?)<\/b>/gi, (_, t) => `**${t}**`)
    .replace(/<em[^>]*>(.*?)<\/em>/gi, (_, t) => `_${t}_`)
    .replace(/<i[^>]*>(.*?)<\/i>/gi, (_, t) => `_${t}_`)
    .replace(/<code[^>]*>(.*?)<\/code>/gi, (_, t) => `\`${t}\``)
    .replace(
      /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
      (_, t) => `\`\`\`\n${t}\n\`\`\`\n\n`,
    )
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (_, href, text) => `[${text}](${href})`)
    .replace(/<li[^>]*>(.*?)<\/li>/gi, (_, t) => `- ${t}\n`)
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, t) => `${t}\n`)
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, t) => `${t}\n`)
    .replace(/<p[^>]*>(.*?)<\/p>/gi, (_, t) => `${t}\n\n`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Debounce a function */
export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
