# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ContentDeck — a personal content bookmarking PWA dashboard for the Capture → Consume → Reflect → Export workflow. Bridges web browsing and Obsidian knowledge management.

**Status: v3.0 — React + Vite + Tailwind + TypeScript. Supabase Auth, demo mode, PWA share target.**

See `docs/reference/audit.md` for the full audit trail (39/47 v1 issues resolved, 14 v2.0 bugs fixed, 8 v2.2 shipping fixes).

## Documentation

All project docs live in `docs/`. Start each session by reading `docs/INDEX.md`.

| Directory | Purpose |
|-----------|---------|
| `docs/plan/` | Feature roadmap chunked by phase |
| `docs/log/` | Implementation records for shipped features |
| `docs/guides/` | Development workflow and setup guides |
| `docs/reference/` | Audit trail, integrations, lookup tables |

**Current phase:** Phase 1 (Foundation) — see `docs/plan/phase-1.md`

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (dark/light mode via `class` strategy)
- **State:** TanStack Query (server state) + React Context (UI state)
- **Icons:** Lucide React
- **Auth:** Supabase Auth (magic link + Google OAuth + GitHub OAuth)
- **Backend:** Supabase (PostgreSQL + REST API + RLS per user)
- **AI:** OpenRouter (client-side, user-provided API key, free models)
- **Hosting:** Vercel (auto-deploy from `main` branch, `vercel.json` for SPA rewrites + cache headers)

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint check on src/
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier auto-format
npm run format:check # Prettier check (CI-friendly)
npm run typecheck    # TypeScript type check (no emit)
npm run test         # Run Vitest regression tests
npm run test:watch   # Run tests in watch mode
```

## Architecture

```
src/
├── components/      # React components (layout, feed, detail, modals, areas, auth, settings, ui)
├── hooks/           # TanStack Query hooks (useBookmarks, useTagAreas, useStats, useAuth, useTokens, etc.)
├── context/         # SupabaseProvider, UIProvider
├── lib/             # supabase.ts, metadata.ts, ai.ts, obsidian.ts, tokens.ts, utils.ts, mock-supabase.ts, demo-data.ts
├── types/           # TypeScript interfaces (Bookmark, TagArea, UserToken, Note, etc.)
├── pages/           # Dashboard.tsx (orchestrator)
├── App.tsx          # Root: auth check, demo mode detection, share target
└── main.tsx         # Entry point

supabase/
└── functions/
    └── save-bookmark/   # Edge function: token-authenticated bookmark save (bookmarklet + iOS Shortcut)
```

### Key patterns

- **Supabase Auth:** `useAuth` hook manages session via `supabase.auth`. OAuth callback detected automatically via `onAuthStateChange`. No separate callback page.
- **Supabase client:** Singleton created from env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). SupabaseProvider passes it via context; mock client used for demo mode.
- **All data mutations** use TanStack Query with optimistic updates + automatic rollback on error
- **Source type colors** defined once in `tailwind.config.ts` (not duplicated in CSS)
- **Reusable `Modal` component** has focus trapping, ARIA attributes, ESC handling built in
- **Accessibility first:** `focus-visible:ring-2` on all interactives, proper `<label>` elements, `motion-safe:`/`motion-reduce:` variants
- **Demo mode:** `localStorage.getItem('contentdeck_demo') === 'true'` → mock Supabase client operates on in-memory arrays, zero hook changes needed
- **PWA Share Target:** `manifest.json` `share_target` + `?url=` query param handling in App.tsx → AddBookmarkModal pre-fill
- **Service worker:** Network-first for navigation, stale-while-revalidate for assets. Version in `CACHE_NAME` must be bumped manually on deploys.
- **Loading state:** Inline CSS spinner in `index.html` shown until React mounts (no blank page)
- **Edge Functions:** `save-bookmark` accepts `{ token, url, title? }`, validates token hash against `user_tokens`, inserts bookmark via service role key (bypasses RLS). Enables bookmarklet + iOS Shortcut.

## Database (Supabase PostgreSQL)

Schema defined in `sql/setup.sql`. Key tables:
- `bookmarks` — user_id, url, title, source_type, status (unread/reading/done), is_favorited, notes (JSONB array), metadata (JSONB), synced
- `tag_areas` — user_id, name, emoji, color, sort_order
- `bookmark_tags` — junction table (scoped via bookmark's user_id)
- `status_history` — user_id, audit trail for streak/stats calculations
- `user_tokens` — user_id, name, token_hash (SHA-256), last_used_at (for bookmarklet/iOS Shortcut auth)

DB triggers:
- `detect_source_type()` — auto-classifies URLs using `~*` (case-insensitive regex)
- `track_status_change()` — logs status transitions, sets `started_reading_at`/`finished_at`
- `set_user_id()` — auto-sets `user_id` to `auth.uid()` on insert (bookmarks, tag_areas, status_history)

RLS policies:
- All tables have row-level security enabled
- Users can only read/write their own data (`auth.uid() = user_id`)
- `bookmark_tags` scoped via subquery on `bookmarks.user_id`

## Important rules

- **PostgreSQL regex:** Always use `~*` (case-insensitive), never `~`
- **YouTube URL detection** must handle `youtube.com`, `youtu.be`, AND `youtube.app.goo.gl`
- **Twitter URL detection** must handle `twitter.com`, `x.com`, AND `t.co`
- **LinkedIn URL detection** must handle `linkedin.com` AND `lnkd.in`
- **No secrets in code.** Supabase URL and anon key in env vars. OpenRouter/YouTube API keys entered at runtime, stored in localStorage.
- **Tab counts** should reflect current status filter
- **Dates:** Always use local timezone (`toLocaleDateString()`), never `toISOString().slice()` for display
- **Touch targets:** Minimum 44x44px on all interactive elements
- **Demo mode** is detected by `localStorage.getItem('contentdeck_demo') === 'true'` — metadata fetch and AI tagging are skipped
- **No Knowledge Graph** — dropped in v2 (Obsidian handles this)

## External APIs (all free tier)

- **Supabase Auth** — magic link, Google OAuth, GitHub OAuth
- **Supabase REST API** — all CRUD (RLS-protected, user-scoped)
- **Supabase Edge Functions** — `save-bookmark` (token-authenticated external save)
- **OpenRouter** — AI tagging (free models: Llama 3.3 70B, Gemma 3, Mistral, Qwen)
- **YouTube oEmbed** — video titles (no key needed)
- **YouTube Data API v3** — video duration/channel (free 10K units/day)
- **Twitter oEmbed** — tweet titles (no key needed)
- **Microlink API** — generic title fetching (50 req/day free tier)

## Error Handling

- **Error Boundary**: Wraps the entire app — catches render errors, shows reload button
- **TanStack Query**: All mutations have optimistic update + automatic rollback on error + toast notification
- **Notes mutations**: `addNote`/`deleteNote` fetch current state from DB (not cache) to prevent race conditions
- **AI/Metadata**: Fire-and-forget with silent failure — non-critical features. Metadata fetch completes before AI tagging so the LLM has title + excerpt context.

## Development Workflow

### Branching Strategy

- **`main`** = production (auto-deploys to Vercel)
- **Feature branches** for all non-trivial work: `feat/`, `fix/`, `refactor/`, `chore/`
- **Pull requests** to merge back to `main`

### Conventional Commits

All commits use conventional commit format:

- `feat: <description>` — new feature
- `fix: <description>` — bug fix
- `refactor: <description>` — code restructuring (no behavior change)
- `chore: <description>` — tooling, deps, config
- `docs: <description>` — documentation only
- `test: <description>` — tests only

### Quality Checks

Run in this order before every commit — all must pass:

1. `npm run format:check` — Prettier formatting
2. `npm run lint` — ESLint (zero errors required, warnings acceptable)
3. `npm run typecheck` — TypeScript strict mode
4. `npm run test` — Vitest regression tests (all must pass)
5. `npm run build` — Vite production build

### Claude Code Skills

| Skill | Description |
|-------|-------------|
| `/feature` | Full branch-to-PR workflow: plan → implement → verify → ship |
| `/ship` | End-of-session: lint, build, commit, push |
| `/audit` | Comprehensive codebase quality audit |
| `/perf-check` | Performance profiling and optimization |
| `/supabase-migrate` | Generate SQL migration files |
