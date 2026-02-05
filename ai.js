// ═══════════════════════════════════════════
// ContentDeck v3.5 — AI Integration (OpenRouter)
// https://github.com/aditya30103/ContentDeck
// ═══════════════════════════════════════════

window.AI = {
  // Use app.js credential helpers if available, else localStorage fallback
  _save(k, v) {
    if (window.saveCredential) saveCredential(k, v);
    else localStorage.setItem(k, v);
  },
  _load(k) {
    if (window.loadCredential) return loadCredential(k);
    return localStorage.getItem(k);
  },
  _remove(k) {
    if (window.removeCredential) removeCredential(k);
    else localStorage.removeItem(k);
  },

  isConfigured() {
    return !!this._load('ai_key');
  },

  getKey() {
    return this._load('ai_key') || '';
  },

  getModel() {
    return this._load('ai_model') || 'meta-llama/llama-3.3-70b-instruct:free';
  },

  saveSettings(key, model) {
    if (key) this._save('ai_key', key);
    else this._remove('ai_key');
    if (model) this._save('ai_model', model);
  },

  // Parse JSON from AI response, handling markdown fences
  _parseJSON(text) {
    let clean = text.trim();
    // Strip markdown code fences: ```json ... ``` or ``` ... ```
    const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) clean = fenceMatch[1].trim();
    return JSON.parse(clean);
  },

  // Fuzzy match an AI-returned tag name against actual area names
  _matchArea(name, areas) {
    const clean = name.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim().toLowerCase();
    return areas.find(a => a.name.toLowerCase() === clean)
      || areas.find(a => a.name.toLowerCase() === name.trim().toLowerCase())
      || areas.find(a => clean.includes(a.name.toLowerCase()));
  },

  async suggestTags(bookmark, areas) {
    if (!this.isConfigured()) return { error: 'not_configured' };

    // List area names plainly (no emoji) so AI returns exact matches
    const areaList = areas.map(a => a.name).join(', ');
    const prompt = `You are a content classifier. Classify this bookmark into existing tag areas.

EXISTING AREAS: ${areaList}

BOOKMARK:
- URL: ${bookmark.url}
- Title: ${bookmark.title || 'Unknown'}
- Source: ${bookmark.source_type}
${bookmark.notes ? `- Notes: ${bookmark.notes}` : ''}

Respond with ONLY valid JSON, no other text:
{"tags": ["area_name"], "suggest_new": null}

If no existing area fits, respond:
{"tags": [], "suggest_new": {"name": "short-name", "description": "why", "emoji": "one_emoji"}}

RULES:
- tags array must use EXACT area names from the list above
- Maximum 3 tags
- Only use suggest_new if truly nothing fits
- No markdown, no explanation, ONLY the JSON object`;

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
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        console.error('AI API error:', resp.status, errBody);
        return { error: `API ${resp.status}`, details: errBody };
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        console.error('AI empty response:', JSON.stringify(data));
        return { error: 'empty_response' };
      }

      console.log('AI raw response:', content);
      const parsed = this._parseJSON(content);

      // Normalize tag names: fuzzy-match against actual areas
      if (parsed.tags && Array.isArray(parsed.tags)) {
        parsed._matchedAreas = parsed.tags
          .map(name => this._matchArea(name, areas))
          .filter(Boolean);
      }

      return parsed;
    } catch (e) {
      console.error('AI suggest error:', e);
      return { error: e.message };
    }
  },

  async retagAll(bookmarks, areas, onProgress) {
    if (!this.isConfigured()) return;

    const total = bookmarks.length;
    let done = 0;

    for (const bm of bookmarks) {
      const result = await this.suggestTags(bm, areas);
      done++;
      if (onProgress) await onProgress(done, total, bm, result);
      // Rate limit: 500ms between calls
      if (done < total) await new Promise(r => setTimeout(r, 500));
    }
  },
};
