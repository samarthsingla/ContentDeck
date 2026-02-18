import type { Bookmark, TagArea } from '../types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export interface AIResponse {
  tags: string[];
  areas: string[];
  suggestedArea?: string;
}

function getApiKey(): string | null {
  return localStorage.getItem('openrouter_key');
}

/** Call OpenRouter with timeout and retry logic */
async function callOpenRouter(prompt: string, signal?: AbortSignal): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No OpenRouter API key configured');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Chain external abort signal
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'ContentDeck',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that categorizes and tags web content. Respond ONLY with valid JSON, no markdown or explanation.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 200,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        lastError = new Error('Rate limited');
        continue;
      }

      if (!res.ok) {
        throw new Error(`OpenRouter error: ${res.status}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');
      return content;
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw e;
      }
      lastError = e as Error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error('AI request failed');
}

/** Parse JSON from AI response, handling markdown code blocks */
function parseAIJson(text: string): unknown {
  // Strip markdown code blocks if present
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

/** Suggest tags and area assignments for a bookmark */
export async function suggestTags(
  bookmark: Bookmark,
  existingTags: string[],
  areas: TagArea[],
  signal?: AbortSignal,
): Promise<AIResponse> {
  const existingList =
    existingTags.length > 0 ? `\nExisting tags in the system: ${existingTags.join(', ')}` : '';

  const areaList =
    areas.length > 0 ? `\nUser's content areas: ${areas.map((a) => a.name).join(', ')}` : '';

  const excerptLine = bookmark.excerpt ? `\nExcerpt: ${bookmark.excerpt.slice(0, 300)}` : '';

  const prompt = `Categorize and tag this bookmark.
URL: ${bookmark.url}
Title: ${bookmark.title || 'Unknown'}
Source: ${bookmark.source_type}${excerptLine}
${areaList}
${existingList}

Respond with JSON:
{
  "areas": ["area1"],
  "tags": ["tag1", "tag2"],
  "suggestedArea": "name"
}

Rules:
- "areas": 0-2 matching area names from the user's list, or empty if none fit. Only use area names from the user's list. Do NOT invent area names.
- "tags": 2-3 descriptive tags, lowercase, 1-2 words each. Prefer reusing existing tags when relevant.
- "suggestedArea": suggest a NEW area only if the content clearly doesn't fit existing ones. Omit if not needed.
- If no areas are defined or none fit, return empty "areas" array.
- Tags should be specific (e.g., "react hooks", "api design"), not generic (e.g., "interesting", "article").`;

  const response = await callOpenRouter(prompt, signal);
  const parsed = parseAIJson(response) as AIResponse;
  return {
    tags: (parsed.tags ?? []).map((t: string) => t.toLowerCase().trim()).filter(Boolean),
    areas: (parsed.areas ?? []).map((a: string) => a.trim()).filter(Boolean),
    suggestedArea: parsed.suggestedArea?.trim() || undefined,
  };
}

/** Bulk suggest tags for multiple bookmarks */
export async function bulkSuggestTags(
  bookmarks: Bookmark[],
  existingTags: string[],
  areas: TagArea[],
  onProgress: (current: number, total: number, bookmark: Bookmark, result: AIResponse) => void,
  signal?: AbortSignal,
): Promise<Map<string, AIResponse>> {
  const results = new Map<string, AIResponse>();

  for (let i = 0; i < bookmarks.length; i++) {
    if (signal?.aborted) break;

    const bookmark = bookmarks[i]!;
    try {
      const result = await suggestTags(bookmark, existingTags, areas, signal);
      results.set(bookmark.id, result);
      // Add new tags to existing pool for better suggestions
      for (const tag of result.tags) {
        if (!existingTags.includes(tag)) existingTags.push(tag);
      }
      onProgress(i + 1, bookmarks.length, bookmark, result);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') break;
      // Skip failed bookmarks, continue with rest
      onProgress(i + 1, bookmarks.length, bookmark, { tags: [], areas: [] });
    }
  }

  return results;
}
