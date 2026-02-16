# ContentDeck — Potential Integrations & Extensions

A list of free API integrations, plugins, and extensions that could enhance ContentDeck.

---

## High Value (Directly Relevant)

| Integration | What it does | Free Tier |
|-------------|--------------|-----------|
| **Readability/Mercury Parser** | Extract article text, read time, author from URLs | Self-host or use [Postlight Parser](https://github.com/postlight/parser) |
| **Pocket API** | Import existing Pocket bookmarks | Unlimited |
| **Instapaper API** | Import existing Instapaper bookmarks | Unlimited |
| **Raindrop.io API** | Import/sync bookmarks | Free tier available |
| **YouTube Data API** | Get video duration, channel info, thumbnails | 10,000 units/day |
| **LinkPreview.net** | Rich link previews (image, description) | 60 req/month free |
| **Open Graph scraping** | Pull og:image, og:description from URLs | Self-parse, free |

---

## Medium Value (Nice to Have)

| Integration | What it does | Free Tier |
|-------------|--------------|-----------|
| **Readwise API** | Sync highlights from Kindle/articles | Requires Readwise subscription |
| **Notion API** | Export bookmarks to Notion database | Free |
| **Obsidian (local)** | Export as markdown files | Free |
| **IFTTT/Zapier webhooks** | Trigger actions on bookmark add | Limited free |
| **RSS feed generation** | Expose your bookmarks as RSS | Self-implement, free |
| **Archive.today / Wayback Machine** | Auto-archive bookmarked pages | Free |

---

## Browser Extensions

| Extension Idea | What it does |
|----------------|--------------|
| **Chrome/Firefox extension** | One-click save with popup preview (better than bookmarklet) |
| **Context menu "Save to ContentDeck"** | Right-click any link to save |
| **Highlight & save** | Select text → save quote + URL |

---

## Recommended Quick Wins

These require minimal effort and provide high impact:

### 1. Read Time Estimation
- Parse article length from URL
- Show "5 min read" badge on bookmark cards
- No external API needed — fetch page + word count calculation
- Formula: `words / 200` (average reading speed)

### 2. Open Graph Images / Thumbnails
- Show preview thumbnails on bookmark cards
- Already have Microlink API integrated — just need to fetch `og:image`
- Makes the UI more visual and scannable

### 3. Browser Extension
- Much better UX than bookmarklet
- Can show confirmation popup with title/tag selection
- Works on pages where bookmarklet is blocked (CSP restrictions)
- Manifest V3 for Chrome, WebExtensions for Firefox

---

## API Links

- Postlight Parser: https://github.com/postlight/parser
- Pocket API: https://getpocket.com/developer/
- Instapaper API: https://www.instapaper.com/api
- Raindrop.io API: https://developer.raindrop.io/
- YouTube Data API: https://developers.google.com/youtube/v3
- Microlink API: https://microlink.io/ (already integrated)
- OpenRouter (AI): https://openrouter.ai/ (already integrated)

---

## Notes

- All recommendations prioritize **free tiers** suitable for personal use
- Browser extension would be the biggest UX improvement
- Import from Pocket/Instapaper would help onboard users with existing collections
