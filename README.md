# ContentDeck

A personal content intelligence dashboard — save articles, videos, tweets, and more from any device, organize with AI-powered tagging, and track your reading progress.

**Live:** [contentdeck.vercel.app](https://contentdeck.vercel.app)

## Features

### Core
- **Multi-source bookmarking** — YouTube, Twitter/X, LinkedIn, Substack, Blogs, Books
- **Auto source detection** — paste a URL and it's categorized automatically
- **Auto title fetching** — YouTube (oEmbed), Twitter (oEmbed), generic (Microlink API)
- **Status tracking** — cycle bookmarks through `unread → reading → done`
- **Search** — filter by title, URL, notes, or tags

### v3 — Content Intelligence
- **Tag Areas** — organize bookmarks into visual category cards (home screen grid view)
- **AI-powered tagging** — OpenRouter integration auto-classifies new bookmarks
- **Re-tag all** — batch process existing bookmarks with AI suggestions
- **Edit bookmarks** — modify URL, title, source, status, tags, notes
- **Bulk actions** — select multiple bookmarks to change status or delete
- **Sort options** — newest, oldest, title A-Z/Z-A, source, status
- **Reading stats** — track completions, streaks, average time to finish, per-tag breakdown
- **Cookie persistence** — credentials survive localStorage clears

### Design
- **Dark theme** — minimal, clean, mobile-first
- **Desktop grid** — responsive 2-4 column layout
- **PWA** — installable with offline support

## Save from anywhere

| Platform | Method |
|----------|--------|
| **iPhone/iPad** | iOS Shortcut via Share Sheet |
| **PC Browser** | Bookmarklet — one click |
| **Dashboard** | Manual add with + button |

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + REST API)
- **AI:** [OpenRouter](https://openrouter.ai) (free models: Llama 3.3, Gemma 3, Mistral, Qwen)
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

## Files

```
index.html        Dashboard UI
style.css         Styles (dark theme, responsive)
app.js            Main app logic
ai.js             OpenRouter AI integration
stats.js          Reading statistics
sw.js             Service worker (offline caching)
manifest.json     PWA manifest
icon.svg          App icon
setup-v3.sql      Fresh database setup (new users)
migrate-v3.sql    v2 → v3 migration (existing users)
```

## License

MIT
