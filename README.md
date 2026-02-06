# ContentDeck

A personal content intelligence dashboard — save articles, videos, tweets, and more from any device, reflect with structured notes, and export ideas to Obsidian.

**Live:** [contentdeck.vercel.app](https://contentdeck.vercel.app)

## Features

### Core
- **Multi-source bookmarking** — YouTube, Twitter/X, LinkedIn, Substack, Blogs, Books
- **Auto source detection** — paste a URL and it's categorized automatically
- **Auto metadata fetching** — titles, thumbnails, YouTube duration/channel via APIs
- **Status tracking** — cycle bookmarks through `unread → reading → done`
- **Search** — filter by title, URL, notes, or tags

### v4 — Second Brain Integration

#### Detail Drawer
- **Slide-in panel** — click any bookmark to open full details
- **Rich metadata** — thumbnail, duration, channel, source badge
- **Structured notes** — add Insights, Questions, Highlights, or general Notes
- **Quick actions** — edit, open link, export to Obsidian, delete

#### Knowledge Graph
- **Visual connections** — see how bookmarks relate via shared tags, domains, or sources
- **Interactive** — drag nodes, zoom/pan, click to open drawer
- **Filter modes** — view by tags only, domains only, or all connections

#### Daily Notes
- **Calendar view** — see bookmarks saved per day
- **Date navigation** — browse history by month
- **Quick access** — "Today" button, click any date to filter

#### Obsidian Integration
- **One-click export** — opens Obsidian and creates the note directly
- **Smart formatting** — YAML frontmatter, wikilinks for tags
- **Structured sections** — Key Insights, Highlights, Questions, Notes, Reflections
- **Vault configuration** — set your vault name in Settings for seamless export

### Content Intelligence (v3)
- **Tag Areas** — organize bookmarks into visual category cards
- **AI-powered tagging** — OpenRouter integration auto-classifies new bookmarks
- **Re-tag all** — batch process existing bookmarks with AI
- **Reading stats** — track completions, streaks, per-tag breakdown

### Design
- **Dark theme** — minimal, clean, mobile-first
- **Desktop grid** — responsive 2-4 column layout
- **PWA** — installable with offline support

## Save from Anywhere

| Platform | Method |
|----------|--------|
| **iPhone/iPad** | iOS Shortcut via Share Sheet |
| **PC Browser** | Chrome Extension or Bookmarklet |
| **Dashboard** | Manual add with + button |

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + REST API)
- **AI:** [OpenRouter](https://openrouter.ai) (free models: Llama 3.3 70B, Gemma 3, Mistral, Qwen)
- **Video Metadata:** [YouTube Data API v3](https://console.cloud.google.com)
- **Article Metadata:** [Microlink API](https://microlink.io)
- **Visualization:** [D3.js](https://d3js.org) (knowledge graph)
- **Hosting:** [Vercel](https://vercel.com)

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `setup-v3.sql` (fresh install)
3. Then run `migrate-v4.sql` for v4 features
4. Copy your **Project URL** and **anon key** from Settings > API

### 2. Deploy

The app is static — deploy anywhere:

```bash
npx vercel --prod
```

Or push to GitHub and connect Vercel for auto-deploy.

### 3. Connect

Open the deployed URL, paste your Supabase credentials, done.

### 4. Optional Integrations

#### AI Tagging (OpenRouter)
1. Get a free API key at [openrouter.ai](https://openrouter.ai)
2. Settings → AI Tag Suggestions → paste API key → Save

#### YouTube Metadata
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable YouTube Data API v3 → Create API Key
3. Settings → YouTube API → paste key → Save

#### Obsidian Export
1. Settings → Obsidian Integration → enter your vault name
2. Click "Export" in any bookmark's drawer → note opens in Obsidian

### 5. Chrome Extension

1. Open `extension/generate-icons.html` in browser to create icons
2. Go to `chrome://extensions` → Enable Developer Mode
3. Click "Load unpacked" → select the `extension` folder
4. Click extension icon on any page to save

### 6. iOS Shortcut

1. Open **Shortcuts** → tap **+**
2. Tap **info (i)** → enable **Show in Share Sheet** → select **URLs**
3. Add: **Get URLs from Input**
4. Add: **Get Contents of URL** → Show More:
   - URL: `<supabase-url>/rest/v1/bookmarks`
   - Method: `POST`
   - Headers: `apikey`, `Authorization` (Bearer + key), `Content-Type` (application/json), `Prefer` (return=minimal)
   - Body: JSON → key `url` → value: **URLs** variable
5. Name it "Bookmark" → Done

### 7. PC Bookmarklet

Dashboard → Settings → drag **+ ContentDeck** to bookmarks bar.

## File Structure

```
index.html          Dashboard UI
style.css           Styles (dark theme, responsive)
app.js              Main application logic
ai.js               OpenRouter AI integration
stats.js            Reading statistics
sw.js               Service worker (offline caching)
manifest.json       PWA manifest
icon.svg            App icon

extension/          Chrome extension
  manifest.json     Extension manifest (v3)
  popup.html        Extension popup UI
  popup.js          Extension logic

setup-v3.sql        Fresh database setup
migrate-v4.sql      v3 → v4 migration (YouTube metadata, notes tables)
migrate-v3.5.sql    Adds image column
migrate-v3.sql      v2 → v3 migration
```

## Version History

- **v4.0.0** — Detail drawer, knowledge graph, daily notes, Obsidian integration, YouTube API, Chrome extension
- **v3.5.0** — Open Graph thumbnails on bookmark cards
- **v3.4.0** — Production polish, auto-tag for iOS/PC bookmarks
- **v3.0.0** — Tag areas, AI integration, stats, edit/bulk/sort
- **v2.0.0** — Tags support
- **v1.0.0** — Initial release

## The Workflow

```
CAPTURE           CONSUME          REFLECT            EXPORT
   │                 │                │                  │
   ▼                 ▼                ▼                  ▼
Save URL    →   Read/Watch   →   Add insights   →   One-click to
(extension,     (track status)   (in drawer)        Obsidian
shortcut, +)
```

ContentDeck is your **capture and reflection layer**. Obsidian is your **knowledge layer**. Ideas flow naturally from consumption to permanent notes.

## Known Issues

- OpenRouter free models have rate limits — if AI tagging fails, wait a few minutes
- Service worker may cache old JS — run in console: `caches.keys().then(k => k.forEach(c => caches.delete(c))); location.reload();`
- YouTube API has 10,000 units/day free quota — sufficient for personal use

## Contributing

Issues and PRs welcome at [github.com/aditya30103/ContentDeck](https://github.com/aditya30103/ContentDeck)

## License

MIT
