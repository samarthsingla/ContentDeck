# ContentDeck

A personal content bookmarking PWA — save articles, videos, tweets, and more from any device, reflect with structured notes, and export to Obsidian.

**Live:** [contentdeck.vercel.app](https://contentdeck.vercel.app)

## Try It

Visit [contentdeck.vercel.app](https://contentdeck.vercel.app) and click **Try Demo** — no account or setup required. Explore with sample data, then sign in with email, Google, or GitHub to save your own bookmarks.

## Features

### Capture
- **Multi-source bookmarking** — YouTube, Twitter/X, LinkedIn, Substack, Blogs, Books
- **Auto source detection** — paste a URL and it's categorized automatically
- **Auto metadata fetching** — titles, thumbnails, reading time via YouTube oEmbed, Twitter oEmbed, Microlink
- **Save from anywhere** — PWA share target, iOS Shortcut, PC bookmarklet, or dashboard

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
- **Obsidian URI** — opens directly in your vault via `obsidian://` protocol
- **Clipboard fallback** — copies markdown when vault name not configured
- **Sync tracking** — marks exported bookmarks so you know what's been processed

## Save from Anywhere

| Platform | Method |
|----------|--------|
| **Android** | Install PWA → share any URL → pick ContentDeck |
| **iPhone/iPad** | Install PWA (Safari → Share → Add to Home Screen) or iOS Shortcut |
| **PC Browser** | Bookmarklet (generate in Settings → API Tokens) |
| **Dashboard** | Manual add with + button |

The PWA Share Target works on Android Chrome and iOS Safari 16.4+. Install ContentDeck to your home screen, then share URLs from any app — ContentDeck appears in the system share sheet and opens with the URL pre-filled.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (dark/light mode)
- **State:** TanStack Query (server) + React Context (UI)
- **Icons:** Lucide React
- **Auth:** Supabase Auth (magic link + Google OAuth + GitHub OAuth)
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + REST API + RLS + Edge Functions)
- **AI:** [OpenRouter](https://openrouter.ai) (free models: Llama 3.3 70B, Gemma 3, Mistral, Qwen)
- **Metadata:** YouTube oEmbed, Twitter oEmbed, [Microlink](https://microlink.io)
- **Hosting:** [Vercel](https://vercel.com)

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `sql/setup.sql`
3. Enable auth providers (magic link, Google, GitHub) — see `docs/guides/supabase-auth-setup.md`

### 2. Environment Variables

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Find these in Supabase Dashboard → Settings → API.

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Deploy

Push to GitHub and connect Vercel for auto-deploy, or:

```bash
npm run build
npx vercel --prod
```

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel environment variables.

### 5. Deploy Edge Function

The `save-bookmark` edge function enables the bookmarklet and iOS Shortcut:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase functions deploy save-bookmark --no-verify-jwt
```

### 6. Optional Integrations

#### AI Tagging (OpenRouter)
1. Get a free API key at [openrouter.ai](https://openrouter.ai)
2. Settings → AI API Key → paste key
3. New bookmarks get auto-tagged; existing untagged bookmarks are tagged on load

#### Obsidian Export
1. Settings → Obsidian Vault Folder → enter your folder name
2. Click "Export" on any bookmark's detail panel
3. Chrome/Edge: picks folder via File System API. Other browsers: copies markdown to clipboard.

### 7. Bookmarklet & iOS Shortcut

Both require an API token generated in Settings → API Tokens.

#### PC Bookmarklet
1. Settings → API Tokens → Generate API Token
2. Drag **+ ContentDeck** to your bookmarks bar
3. Click the bookmarklet on any page to save it

#### iOS Shortcut
1. Settings → API Tokens → Generate API Token → copy token and URL
2. Open **Shortcuts** app → tap **+** → name it "Save to ContentDeck"
3. Tap shortcut name → Privacy → enable **Show in Share Sheet** → select **URLs**
4. Add action: **URL** → paste the edge function URL
5. Add action: **Get Contents of URL** → tap **Show More**:
   - Method: **POST**
   - Request Body: **JSON**
   - Add keys: `token` (paste your token), `url` (tap **Shortcut Input**), `title` (tap **Shortcut Input**)
6. Share any URL → pick "Save to ContentDeck"

## Project Structure

```
src/
  components/     React components (layout, feed, detail, modals, areas, settings, auth, ui)
  hooks/          TanStack Query hooks (useBookmarks, useTagAreas, useStats, useAuth, useTokens)
  context/        SupabaseProvider, UIProvider
  lib/            supabase, metadata, ai, obsidian, tokens, utils, mock-supabase, demo-data
  types/          TypeScript interfaces
  pages/          Dashboard (orchestrator)
  App.tsx         Root: auth check, demo mode detection, share target
  main.tsx        Entry point

supabase/
  functions/
    save-bookmark/  Edge function: token-authenticated bookmark save

public/
  sw.js           Service worker (network-first navigation, stale-while-revalidate assets)
  manifest.json   PWA manifest + share target
  icon.svg        App icon

sql/
  setup.sql       Database schema (bookmarks, tag_areas, user_tokens, triggers, RPC functions)
  migrations/     Incremental migrations

vercel.json       SPA rewrites, cache headers for static assets
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

## Known Limitations

- OpenRouter free models have rate limits — AI tagging retries with exponential backoff
- Missing raster PWA icons (192px, 512px) — installability limited on some Android devices
- SW cache version (`CACHE_NAME` in `sw.js`) requires manual bump on major deploys

## Contributing

Issues and PRs welcome at [github.com/samarthsingla/ContentDeck](https://github.com/samarthsingla/ContentDeck)

## License

MIT
