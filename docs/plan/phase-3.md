# Phase 3: Platform (v4.0)

> Goal: ContentDeck everywhere. Save from any context, access from any device.

## 3.1 Browser Extension (Manifest V3)
- **Chrome + Firefox** (same codebase via WebExtension API)
- Popup: current page title/URL, source detection, tag selection, one-click save
- Context menu: right-click any link → "Save to ContentDeck"
- Highlight mode: select text on any page → save as highlight note
- Side panel: browse your bookmarks without leaving the current tab
- Auth: uses Supabase session token from the main app
- Published on Chrome Web Store + Firefox Add-ons (both free)

## 3.2 Offline-First PWA
- **IndexedDB** (via Dexie.js) for local bookmark storage
- Full CRUD works offline — syncs when back online
- Conflict resolution: last-write-wins with timestamp comparison
- Background sync API: queue mutations → replay on reconnect
- Service worker: precache app shell + critical assets on install

## 3.3 Public API
- RESTful API via Supabase Edge Functions
- Endpoints: `/api/bookmarks`, `/api/areas`, `/api/search`
- API key authentication (generated in Settings)
- Rate limiting: 100 req/min per key
- OpenAPI spec auto-generated
- Enables: CLI tools, Zapier/IFTTT integration, third-party apps

## 3.4 CLI Tool
- `npx contentdeck save <url>` — save from terminal
- `npx contentdeck list --status=unread --source=youtube`
- `npx contentdeck search "react server components"`
- `npx contentdeck export --format=obsidian --area=engineering`
- Auth via `contentdeck login` (opens browser for OAuth)
- Published on npm (free)

## 3.5 Telegram Bot
- `/save <url>` — save a bookmark
- `/list` — show recent unread
- `/random` — get a random unread bookmark to read
- Forward any message with a URL → auto-save
- Hosted on Supabase Edge Functions (webhook mode, no server needed)
- Telegram Bot API is free, unlimited

## 3.6 Email-to-Save
- Dedicated email address (via Cloudflare Email Workers, free)
- Forward newsletters → auto-saved as bookmarks
- Subject line → title, body URLs → extracted and saved
- Great for Substack newsletters that don't have clean URLs

## 3.7 RSS Feed Monitoring
- Add RSS feeds in Settings → new items auto-saved as unread bookmarks
- pg_cron job checks feeds every 30 minutes
- Supabase Edge Function parses RSS XML
- Use cases: follow blogs, YouTube channels, Substack writers
- Max 20 feeds per user (free tier budget)
