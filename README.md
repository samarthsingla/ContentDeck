# ContentDeck
Area Magnet Feature Branch
A personal content intelligence dashboard — save articles, videos, tweets, and more from any device, organize with AI-powered tagging, and track your reading progress.

**Live:** [contentdeck.vercel.app](https://contentdeck.vercel.app)

## Features

### Core
- **Multi-source bookmarking** — YouTube, Twitter/X, LinkedIn, Substack, Blogs, Books
- **Auto source detection** — paste a URL and it's categorized automatically
- **Auto metadata fetching** — titles + Open Graph thumbnails via YouTube oEmbed, Twitter oEmbed, Microlink API
- **Status tracking** — cycle bookmarks through `unread → reading → done`
- **Search** — filter by title, URL, notes, or tags

### v3 — Content Intelligence
- **Tag Areas** — organize bookmarks into visual category cards (home screen grid view)
- **AI-powered tagging** — OpenRouter integration auto-classifies new bookmarks
- **Auto-tag on load** — iOS Shortcut and PC bookmarklet saves get AI-tagged when you open the dashboard
- **Re-tag all** — batch process existing bookmarks with AI suggestions
- **Suggested areas** — after re-tagging, AI suggests new tag areas to create
- **Edit bookmarks** — modify URL, title, source, status, tags, notes
- **Bulk actions** — select multiple bookmarks to change status or delete
- **Sort options** — newest, oldest, title A-Z/Z-A, source, status
- **Reading stats** — track completions, streaks, average time to finish, per-tag breakdown
- **Cookie persistence** — credentials survive localStorage clears

### v3.5 — Visual Enhancement
- **Open Graph thumbnails** — bookmark cards display article/video preview images
- **Smart fallbacks** — source badge overlays thumbnail, graceful error handling

### Design
- **Dark theme** — minimal, clean, mobile-first
- **Desktop grid** — responsive 2-4 column layout
- **PWA** — installable with offline support

## Save from Anywhere

| Platform | Method |
|----------|--------|
| **iPhone/iPad** | iOS Shortcut via Share Sheet |
| **PC Browser** | Bookmarklet — one click |
| **Dashboard** | Manual add with + button |

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + REST API)
- **AI:** [OpenRouter](https://openrouter.ai) (free models: Llama 3.3 70B, Gemma 3, Mistral, Qwen)
- **Hosting:** [Vercel](https://vercel.com)

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `setup-v3.sql` (fresh install) or `migrate-v3.sql` (upgrading from v2)
3. Copy your **Project URL** and **anon key** from Settings > API

### 2. Deploy

The app is static — deploy anywhere:

```bash
npx vercel --prod
```

Or push to GitHub and connect Vercel for auto-deploy.

### 3. Connect

Open the deployed URL, paste your Supabase credentials, done.

### 4. AI Setup (Optional)

1. Get a free API key at [openrouter.ai](https://openrouter.ai)
2. In the app: Settings → AI Tag Suggestions → paste API key → Save
3. New bookmarks will auto-tag, or use "Re-tag All" for existing ones

### 5. iOS Shortcut

1. Open **Shortcuts** → tap **+**
2. Tap **info (i)** → enable **Show in Share Sheet** → select **URLs**
3. Add: **Get URLs from Input**
4. Add: **Get Contents of URL** → Show More:
   - URL: `<supabase-url>/rest/v1/bookmarks`
   - Method: `POST`
   - Headers: `apikey`, `Authorization` (Bearer + key), `Content-Type` (application/json), `Prefer` (return=minimal)
   - Body: JSON → key `url` → value: **URLs** variable
5. Name it "Bookmark" → Done

### 6. PC Bookmarklet

Dashboard → Settings → drag **+ ContentDeck** to bookmarks bar.

## Local Development

No build step required:

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node
npx serve .

# Option 3: VS Code Live Server extension
```

Then open http://localhost:8000

## File Structure

```
index.html        Dashboard UI
style.css         Styles (dark theme, responsive)
app.js            Main application logic
ai.js             OpenRouter AI integration
stats.js          Reading statistics
sw.js             Service worker (offline caching)
manifest.json     PWA manifest
icon.svg          App icon

setup-v3.sql      Fresh database setup (new users)
migrate-v3.sql    v2 → v3 migration (existing users)
migrate-v3.5.sql  v3.4 → v3.5 migration (adds image column)

setup.sql         Legacy v1 setup (deprecated)
migrate-v2.sql    Legacy v1 → v2 migration (deprecated)
fix-sources.sql   Legacy source detection fix (deprecated)
```

## Version History

- **v3.5.0** — Open Graph thumbnails on bookmark cards
- **v3.4.0** — Production polish, auto-tag for iOS/PC bookmarks, re-tag summary modal
- **v3.0.0** — Tag areas, AI integration, stats, edit/bulk/sort
- **v2.0.0** — Tags support
- **v1.0.0** — Initial release

## Known Issues

- OpenRouter free models have rate limits — if AI tagging fails, wait a few minutes
- Service worker may cache old JS — hard refresh (`Ctrl+Shift+R`) or clear site data if updates don't appear

## Contributing

Issues and PRs welcome at [github.com/aditya30103/ContentDeck](https://github.com/aditya30103/ContentDeck)

## License

MIT
