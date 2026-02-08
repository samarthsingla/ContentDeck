# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ContentDeck — a personal content bookmarking PWA dashboard for the Capture → Consume → Reflect → Export workflow. Bridges web browsing and Obsidian knowledge management.

**Status: v2.0 — React + Vite + Tailwind + TypeScript (migration complete).**

See `AUDIT.md` for the post-migration audit (39/47 v1 issues resolved, 14 new issues found and fixed).

## v2 Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (dark/light mode via `class` strategy)
- **State:** TanStack Query (server state) + React Context (UI state)
- **Icons:** Lucide React
- **Backend:** Supabase (PostgreSQL + REST API) — no auth, anon key approach
- **AI:** OpenRouter (client-side, user-provided API key, free models)
- **Hosting:** Vercel (auto-deploy from `main` branch)

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
```

## Architecture (v2)

```
src/
├── components/      # React components (layout, feed, detail, modals, areas, ui)
├── hooks/           # TanStack Query hooks (useBookmarks, useTagAreas, useStats, etc.)
├── context/         # SupabaseProvider, UIProvider
├── lib/             # supabase.ts, metadata.ts, ai.ts, obsidian.ts, utils.ts, mock-supabase.ts, demo-data.ts
├── types/           # TypeScript interfaces (Bookmark, TagArea, Note, etc.)
├── pages/           # Dashboard.tsx (orchestrator)
├── App.tsx          # Root: setup screen vs dashboard, demo mode detection, share target
└── main.tsx         # Entry point
```

### Key patterns

- **All data mutations** use TanStack Query with optimistic updates + automatic rollback on error
- **Source type colors** defined once in `tailwind.config.ts` (not duplicated in CSS)
- **Reusable `Modal` component** has focus trapping, ARIA attributes, ESC handling built in
- **Accessibility first:** `focus-visible:ring-2` on all interactives, proper `<label>` elements, `motion-safe:`/`motion-reduce:` variants
- **Demo mode:** credentials `{ url: 'demo', key: 'demo' }` → mock Supabase client operates on in-memory arrays, zero hook changes needed
- **PWA Share Target:** `manifest.json` `share_target` + `?url=` query param handling in App.tsx → AddBookmarkModal pre-fill

## Database (Supabase PostgreSQL)

Schema defined in `sql/setup.sql`. Key tables:
- `bookmarks` — url, title, source_type, status (unread/reading/done), is_favorited, notes (JSONB array), metadata (JSONB), synced
- `tag_areas` — name, emoji, color, sort_order
- `bookmark_tags` — junction table
- `status_history` — audit trail for streak/stats calculations

DB triggers:
- `detect_source_type()` — auto-classifies URLs using `~*` (case-insensitive regex)
- `track_status_change()` — logs status transitions, sets `started_reading_at`/`finished_at`

## Important rules

- **PostgreSQL regex:** Always use `~*` (case-insensitive), never `~`
- **YouTube URL detection** must handle `youtube.com`, `youtu.be`, AND `youtube.app.goo.gl`
- **Twitter URL detection** must handle `twitter.com`, `x.com`, AND `t.co`
- **LinkedIn URL detection** must handle `linkedin.com` AND `lnkd.in`
- **No secrets in code.** Supabase keys and API keys entered at runtime, stored in localStorage
- **Credentials** stored in both localStorage and 400-day cookies (fallback for iOS)
- **Tab counts** should reflect current status filter
- **Dates:** Always use local timezone (`toLocaleDateString()`), never `toISOString().slice()` for display
- **Touch targets:** Minimum 44x44px on all interactive elements
- **Demo mode** is detected by `credentials.url === 'demo'` — metadata fetch and AI tagging are skipped
- **No Knowledge Graph** — dropped in v2 (Obsidian handles this)
- **No Chrome Extension** — deprecated in v2

## External APIs (all free tier)

- **Supabase REST API** — all CRUD (also used by iOS Shortcut and bookmarklet)
- **OpenRouter** — AI tagging (free models: Llama 3.3 70B, Gemma 3, Mistral, Qwen)
- **YouTube oEmbed** — video titles (no key needed)
- **YouTube Data API v3** — video duration/channel (free 10K units/day)
- **Twitter oEmbed** — tweet titles (no key needed)
- **Microlink API** — generic title fetching (50 req/day free tier)

## Error Handling

- **Error Boundary**: Wraps the entire app — catches render errors, shows reload button
- **TanStack Query**: All mutations have optimistic update + automatic rollback on error + toast notification
- **Notes mutations**: `addNote`/`deleteNote` fetch current state from DB (not cache) to prevent race conditions
- **AI/Metadata**: Fire-and-forget with silent failure — non-critical features
