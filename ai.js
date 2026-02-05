// ═══════════════════════════════════════════
// ContentDeck v3 — AI Integration (OpenRouter)
// ═══════════════════════════════════════════

window.AI = {
  isConfigured() {
    return !!localStorage.getItem('ai_key');
  },

  getKey() {
    return localStorage.getItem('ai_key') || '';
  },

  getModel() {
    return localStorage.getItem('ai_model') || 'z-ai/glm-4.5-air:free';
  },

  saveSettings(key, model) {
    if (key) localStorage.setItem('ai_key', key);
    else localStorage.removeItem('ai_key');
    if (model) localStorage.setItem('ai_model', model);
  },

  async suggestTags(bookmark, areas) {
    if (!this.isConfigured()) return null;

    const areaNames = areas.map(a => `${a.emoji} ${a.name}`).join(', ');
    const prompt = `You are a content classifier. Given a bookmark, classify it into one or more existing tag areas, or suggest a new one if none fit.

Existing tag areas: [${areaNames}]

Bookmark:
- URL: ${bookmark.url}
- Title: ${bookmark.title || 'Unknown'}
- Source: ${bookmark.source_type}
${bookmark.notes ? `- Notes: ${bookmark.notes}` : ''}

Respond with JSON only:
{
  "tags": ["area_name_1", "area_name_2"],
  "suggest_new": null
}

If no existing area fits well, use:
{
  "tags": [],
  "suggest_new": { "name": "short-name", "description": "why this area", "emoji": "relevant_emoji" }
}

Rules:
- Use exact existing area names when possible
- Maximum 3 tags per bookmark
- Only suggest_new if truly nothing fits`;

    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getKey()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': location.origin,
        },
        body: JSON.stringify({
          model: this.getModel(),
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 200,
          response_format: { type: 'json_object' },
        }),
      });

      if (!resp.ok) return null;

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      return JSON.parse(content);
    } catch (e) {
      console.error('AI suggest error:', e);
      return null;
    }
  },

  async retagAll(bookmarks, areas, onProgress) {
    if (!this.isConfigured()) return;

    const total = bookmarks.length;
    let done = 0;

    for (const bm of bookmarks) {
      const result = await this.suggestTags(bm, areas);
      done++;
      if (onProgress) onProgress(done, total, bm, result);
      // Rate limit: 500ms between calls
      if (done < total) await new Promise(r => setTimeout(r, 500));
    }
  },
};
