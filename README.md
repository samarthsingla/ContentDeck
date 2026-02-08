# ContentDeck

A personal content bookmarking PWA — save articles, videos, tweets, and more from any device, reflect with structured notes, and export to Obsidian.

**Live:** [contentdeck.vercel.app](https://contentdeck.vercel.app)

## Try It

Visit [contentdeck.vercel.app](https://contentdeck.vercel.app) and click **Try Demo** — no account or setup required. Explore with sample data, then connect your own Supabase database when ready.

## Features

### Capture
- **Multi-source bookmarking** — YouTube, Twitter/X, LinkedIn, Substack, Blogs, Books
- **Auto source detection** — paste a URL and it's categorized automatically
- **Auto metadata fetching** — titles, thumbnails, reading time via YouTube oEmbed, Twitter oEmbed, Microlink
- **Save from anywhere** — iOS Shortcut, PC bookmarklet, or dashboard

### Organize
- **Status tracking** — cycle bookmarks through `unread -> reading -> done`
- **Favorites** — star important bookmarks for quick access
- **Tag Areas** — organize bookmarks into visual category cards with emoji + color
- **AI-powered tagging** — OpenRouter auto-classifies new bookmarks and bulk-tags on load
- **Search + filter** — by title, URL, tags, source, status, or favorites
- **Sort** — newest, oldest, or title

### Reflect
- **Detail panel** — click any bookmark to open full details (desktop: right column, mobile: slide-up)
- **Structured notes** — add Insights, Questions, Highlights, or general Notes
- **Note timeline** — color-coded cards with type indicators
- **Reading stats** — completions, streaks, avg completion time, daily chart

### Export
- **Obsidian integration** — one-click export with YAML frontmatter + structured notes
- **File System API** — writes directly to your vault folder (Chrome/Edge)
- **Clipboard fallback** — copies markdown on Firefox/Safari/mobile
- **Sync tracking** — marks exported bookmarks so you know what's been processed

## Save from Anywhere

| Platform | Method |
|----------|--------|
| **Android** | Install PWA → share any URL → pick ContentDeck |
| **iPhone/iPad** | Install PWA (Safari → Share → Add to Home Screen) or iOS Shortcut |
| **PC Browser** | Bookmarklet (drag from Settings) |
| **Dashboard** | Manual add with + button |

The PWA Share Target works on Android Chrome and iOS Safari 16.4+. Install ContentDeck to your home screen, then share URLs from any app — ContentDeck appears in the system share sheet and opens with the URL pre-filled.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (dark/light mode)
- **State:** TanStack Query (server) + React Context (UI)
- **Icons:** Lucide React
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + REST API)
- **AI:** [OpenRouter](https://openrouter.ai) (Gemini 2.0 Flash)
- **Metadata:** YouTube oEmbed, Twitter oEmbed, [Microlink](https://microlink.io)
- **Hosting:** [Vercel](https://vercel.com)

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `sql/setup.sql`
3. Copy your **Project URL** and **anon key** from Settings > API

### 2. Install & Run

```bash
npm install
npm run dev
```

### 3. Deploy

```bash
npm run build
```

Push to GitHub and connect Vercel for auto-deploy, or `npx vercel --prod`.

### 4. Connect

Open the deployed URL. You can **Try Demo** to explore with sample data, or paste your Supabase credentials to connect.

### 5. Optional Integrations

#### AI Tagging (OpenRouter)
1. Get a free API key at [openrouter.ai](https://openrouter.ai)
2. Settings > AI API Key > paste key
3. New bookmarks get auto-tagged; existing untagged bookmarks are tagged on load

#### Obsidian Export
1. Settings > Obsidian Vault Folder > enter your folder name
2. Click "Export" on any bookmark's detail panel
3. Chrome/Edge: picks folder via File System API. Other browsers: copies markdown to clipboard.

### 6. iOS Shortcut

1. Open **Shortcuts** > tap **+**
2. Tap **info (i)** > enable **Show in Share Sheet** > select **URLs**
3. Add: **Get URLs from Input**
4. Add: **Get Contents of URL** > Show More:
   - URL: `<supabase-url>/rest/v1/bookmarks`
   - Method: `POST`
   - Headers: `apikey`, `Authorization` (Bearer + key), `Content-Type` (application/json), `Prefer` (return=minimal)
   - Body: JSON > key `url` > value: **URLs** variable
5. Name it "Bookmark" > Done

### 7. PC Bookmarklet

Dashboard > Settings > drag **+ ContentDeck** to your bookmarks bar.

## Project Structure

```
src/
  components/     React components (layout, feed, detail, modals, areas, ui)
  hooks/          TanStack Query hooks (useBookmarks, useTagAreas, useStats)
  context/        SupabaseProvider, UIProvider
  lib/            supabase, metadata, ai, obsidian, utils
  types/          TypeScript interfaces
  pages/          Dashboard (orchestrator)
  App.tsx          Root: setup screen vs dashboard
  main.tsx         Entry point

public/
  sw.js           Service worker (stale-while-revalidate)
  manifest.json   PWA manifest
  icon.svg        App icon

sql/
  setup.sql       Database schema (bookmarks, tag_areas, status_history, triggers)
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `n` | New bookmark |
| `j` / `k` | Navigate list |
| `Esc` | Close panel/modal |

## The Workflow

```
CAPTURE            ORGANIZE           REFLECT             EXPORT
  |                   |                  |                   |
  v                   v                  v                   v
Save URL     ->   Tag + status   ->   Add insights   ->   One-click to
(shortcut,        (AI auto-tags)      (in detail          Obsidian
bookmarklet, +)                        panel)
```

ContentDeck is your **capture and reflection layer**. Obsidian is your **knowledge layer**. Ideas flow from consumption to permanent notes.

## Known Issues

- OpenRouter free models have rate limits — if AI tagging fails, it retries with exponential backoff
- Missing raster PWA icons (192px, 512px) — installability limited on some Android devices
- Service worker caches grow unbounded — clear via DevTools if needed

## Contributing

Issues and PRs welcome at [github.com/aditya30103/ContentDeck](https://github.com/aditya30103/ContentDeck)

## License

MIT
