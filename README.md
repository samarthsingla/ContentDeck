# ContentDeck

A personal content bookmarking dashboard — save articles, videos, tweets, and more from any device, then consume them in focused reading sessions.

**Live:** [contentdeck.vercel.app](https://contentdeck.vercel.app)

## Features

- **Multi-source bookmarking** — YouTube, Twitter/X, LinkedIn, Substack, Blogs, Books
- **Auto source detection** — paste a URL and it's categorized automatically (client-side + database trigger)
- **Auto title fetching** — YouTube (oEmbed), Twitter (oEmbed), blogs/Substack (Microlink API)
- **Search** — filter bookmarks by title, URL, notes, or tags
- **Tags** — add custom tags (e.g. `must-read`, `weekend`), click to filter
- **Status tracking** — cycle bookmarks through `unread → reading → done`
- **Stats bar** — live counts of unread, reading, done, total
- **Tab counts** — each source tab shows its bookmark count
- **Desktop grid layout** — responsive 2-3 column grid on wider screens
- **Dark theme** — minimal, clean, mobile-first design

## Save from anywhere

| Platform | Method |
|----------|--------|
| **iPhone/iPad** | iOS Shortcut via Share Sheet — one tap from any app |
| **PC Browser** | Bookmarklet — one click on any webpage |
| **Dashboard** | Manual add with the + button |

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + REST API)
- **Hosting:** [Vercel](https://vercel.com)
- **PWA:** Service worker + manifest for installable app experience

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run `setup.sql` in the SQL Editor to create the `bookmarks` table
3. Copy your **Project URL** and **anon key** from Settings > API

### 2. Deploy

The app is a static site — deploy anywhere. It's currently on Vercel:

```bash
npx vercel --prod
```

### 3. Connect

Open the deployed URL, paste your Supabase credentials, and you're in.

### 4. iOS Shortcut

1. Open **Shortcuts** app → tap **+**
2. Tap **info (i)** button → enable **Show in Share Sheet** → select **URLs**
3. Add action: **Get URLs from Input**
4. Add action: **Get Contents of URL** → tap **Show More**:
   - URL: `<your-supabase-url>/rest/v1/bookmarks`
   - Method: `POST`
   - Headers: `apikey`, `Authorization` (Bearer + key), `Content-Type` (application/json), `Prefer` (return=minimal)
   - Body: JSON → key `url` → value: select **URLs** variable
5. Name it **"Bookmark"** → Done

### 5. PC Bookmarklet

Open the dashboard → Settings (gear icon) → drag the **+ ContentDeck** button to your bookmarks bar, or copy the bookmarklet code.

## File Structure

```
index.html        Main dashboard page
style.css         All styles (dark theme, responsive grid)
app.js            Application logic (filtering, CRUD, modals)
sw.js             Service worker for offline caching
manifest.json     PWA manifest
icon.svg          App icon
setup.sql         Supabase table + trigger creation
migrate-v2.sql    Migration: adds tags column
fix-sources.sql   Fix: case-insensitive source detection
```
