# ContentDeck — Engineering Plan

> From personal bookmark manager to full-stack knowledge capture platform.
> All components free-tier. No compromises on scale, security, or reliability.

---

## Table of Contents

1. [Vision](#vision)
2. [Architecture Evolution](#architecture-evolution)
3. [Phase 1: Foundation (v3.0)](#phase-1-foundation-v30)
4. [Phase 2: Intelligence (v3.5)](#phase-2-intelligence-v35)
5. [Phase 3: Platform (v4.0)](#phase-3-platform-v40)
6. [Phase 4: Social & Scale (v5.0)](#phase-4-social--scale-v50)
7. [Phase 5: Ecosystem (v6.0)](#phase-5-ecosystem-v60)
8. [Infrastructure & DevOps](#infrastructure--devops)
9. [Free Tier Budget](#free-tier-budget)
10. [Quality Gates](#quality-gates)

---

## Vision

ContentDeck today: a personal bookmark manager with status tracking and Obsidian export.

ContentDeck tomorrow: **the bridge between consuming content and building knowledge** — a platform where you capture anything, an AI helps you understand it, and your insights flow into your permanent knowledge system.

```
v2.2 (today)     v3.0              v3.5               v4.0              v5.0
Bookmarks    →   Auth + Import  →  AI Intelligence  →  Multi-platform →  Social
Save URLs        Real users        Summarize, link     Extension, API    Public lists
Demo mode        Full-text search  Smart queue         Offline-first     Collaboration
PWA share        Reader mode       Spaced review       Webhooks          Analytics
```

---

## Architecture Evolution

### Current (v2.2)
```
Browser (React SPA) → Supabase REST API → PostgreSQL
                    → OpenRouter (AI tagging)
                    → Microlink/oEmbed (metadata)
```

### Target (v5.0)
```
Browser Extension ─┐
React PWA ─────────┤
iOS Shortcut ──────┼→ Supabase (Auth + RLS + Edge Functions + Realtime)
Telegram Bot ──────┤     ├→ PostgreSQL (full-text search, JSONB, pg_cron)
CLI Tool ──────────┘     ├→ Supabase Storage (article snapshots, PDFs)
                         ├→ Edge Functions (content extraction, AI pipeline)
                         └→ Realtime (live sync across devices)
                    → OpenRouter (summarize, tag, recommend, chat)
                    → GitHub Actions (scheduled jobs, health checks)
```

### Key Architectural Principles
1. **Edge-first**: Processing at Supabase Edge Functions, not client-side
2. **Offline-capable**: Service worker + IndexedDB for full offline CRUD
3. **Event-driven**: Database triggers + webhooks for automation pipelines
4. **Progressive enhancement**: Every feature degrades gracefully without API keys
5. **Zero vendor lock-in**: Standard PostgreSQL, portable data, open formats

---

## Phase 1: Foundation (v3.0)

> Goal: Real users, real data, real reliability. The "production-grade" release.

### 1.1 Supabase Auth ✅ DONE (v3.0)
**Why first**: Every feature after this depends on user identity.

- Email + magic link authentication (free, no password management)
- Google OAuth (free via Supabase, massive adoption boost)
- GitHub OAuth (developer audience)
- Row-Level Security (RLS) on all tables — data isolation per user
- Migration path: existing anon-key users get a "claim your data" flow
- Demo mode remains unchanged (no auth needed)

**Schema changes:**
```sql
-- Add user_id to all tables
ALTER TABLE bookmarks ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE tag_areas ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE status_history ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- RLS policies
CREATE POLICY "Users see own bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id);
```

**What shipped:**
- AuthScreen with magic link + Google + GitHub OAuth, demo mode preserved
- RLS policies, `set_user_id()` trigger, env-var singleton Supabase client
- Legacy credential flow removed (useCredentials, SetupScreen, bookmarklet code)

**What broke (intentional clean break):**
- Existing data invisible — old rows with `user_id = NULL` don't match RLS
- Bookmarklet removed — relied on raw anon key embedded in JS
- iOS Shortcut broken — relied on raw anon key in HTTP headers

### 1.1a Fix Bookmarklet (post-auth) ✅ DONE
**Why**: Power users on desktop need a one-click save from any page.

- **Approach**: Supabase Edge Function `POST /save-bookmark` that accepts a user API token
- User generates a personal API token in Settings (stored in `user_tokens` table)
- Bookmarklet sends URL + title + token to the edge function
- Edge function validates token → inserts bookmark with correct `user_id`
- Settings UI: "Generate Bookmarklet" → copies personalized bookmarklet code
- Token revocation in Settings

### 1.1b Fix iOS Shortcut (post-auth) ✅ DONE
**Why**: iPhone users need background save from the Share Sheet without opening the app.

- **Approach**: Same edge function as 1.1a (`POST /save-bookmark`)
- iOS Shortcut sends URL + token via "Get Contents of URL" action
- Settings UI: "iOS Shortcut Setup" → shows token + copy-paste instructions
- Same `user_tokens` table and validation as bookmarklet
- Edge function is shared — one implementation covers both use cases

**Shared implementation (1.1a + 1.1b):**
```sql
-- User API tokens table
CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX idx_user_tokens_hash ON user_tokens(token_hash);

-- RLS
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own tokens" ON user_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Edge function** (`supabase/functions/save-bookmark/index.ts`):
- Accepts `{ url, title?, token }` in POST body
- Looks up `token_hash` → gets `user_id`
- Inserts into `bookmarks` with that `user_id` (bypasses RLS via service role)
- Returns `201` with bookmark ID or `401` on bad token

### 1.2 Content Extraction Pipeline
**Why**: Enables full-text search, summaries, reader mode, and offline reading.

- **Supabase Edge Function**: `extract-content`
  - Input: URL
  - Uses Mozilla Readability (npm package, runs in Deno)
  - Extracts: title, author, text content, word count, reading time, lead image
  - Stores in new `content` JSONB column on bookmarks
  - Triggered on bookmark insert (database webhook → edge function)
- **Fallback chain**: Readability → Microlink → title-only
- **Rate limiting**: Process max 10 URLs/minute per user (pg_cron queue)

### 1.3 Full-Text Search
**Why**: Searching bookmark titles is limiting. Users want to search *what they read*.

- PostgreSQL `tsvector` column on bookmarks (title + extracted content)
- `GIN` index for fast full-text queries
- Supabase `.textSearch()` in existing `useBookmarks` hook
- Search UI: results highlight matching terms
- Zero additional cost (PostgreSQL built-in)

```sql
ALTER TABLE bookmarks ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content->>'text', '')), 'B')
  ) STORED;

CREATE INDEX bookmarks_search_idx ON bookmarks USING GIN (search_vector);
```

### 1.4 Import System
**Why**: Nobody switches tools without their existing data.

- **Pocket**: Export HTML → parse `<li>` tags → bulk insert
- **Instapaper**: CSV export → parse → bulk insert
- **Raindrop.io**: CSV/HTML export → parse → bulk insert
- **Browser bookmarks**: Chrome/Firefox HTML export → parse
- **Generic CSV**: Column mapping UI for any bookmark manager
- **Implementation**: Client-side parser + batch `addBookmark` mutations
- **Progress UI**: Reuse existing `ProgressBar` component

### 1.5 Reader Mode
**Why**: The gap between "saving" and "reading" is leaving the app.

- Extracted content (from 1.2) rendered in a clean, distraction-free view
- Typography: configurable font size, serif/sans-serif, line height
- Dark/light/sepia themes
- Inline highlighting: select text → save as `highlight` note
- Reading progress tracking (scroll position saved per bookmark)
- Estimated reading time with live "X min remaining"

### 1.6 Testing & CI
**Why**: Moving fast without breaking things requires automated verification.

- **Vitest**: Unit tests for lib/ functions (utils, metadata, ai, obsidian)
- **React Testing Library**: Component tests for critical flows (add bookmark, demo mode, auth)
- **Playwright**: E2E tests (setup → demo → add → read → export flow)
- **GitHub Actions**: Run tests on every PR, block merge on failure
- **Type checking**: `tsc --noEmit` in CI (already works locally)

---

## Phase 2: Intelligence (v3.5)

> Goal: AI that actively helps you learn, not just tag.

### 2.1 AI Summarization
- **One-click summarize** in detail panel
- Edge function: send extracted text to OpenRouter → get 3-5 bullet summary
- Store in `metadata.summary` (JSONB)
- Show summary card above notes in detail panel
- **Progressive**: Short summary on card, full summary in detail
- **Model**: Gemma 3 or Llama 3.3 70B (free on OpenRouter)

### 2.2 Smart Connections
- When viewing a bookmark, show "Related" bookmarks
- Algorithm: TF-IDF on extracted text + shared tags + same source type
- Computed via edge function, cached in `metadata.related_ids`
- UI: "Related" section at bottom of detail panel
- No external API — pure PostgreSQL full-text ranking

### 2.3 Reading Queue Prioritization
- **Smart queue**: AI suggests what to read next based on:
  - Time in queue (older unread items bubble up)
  - Topic diversity (don't read 5 React articles in a row)
  - Reading history (prefer sources you finish, deprioritize sources you abandon)
  - Freshness (time-sensitive content like news ranked higher)
- Displayed as a "Up Next" card at the top of the feed
- Uses existing `status_history` data — no new tables needed

### 2.4 Auto-Collections
- AI groups related bookmarks into suggested collections
- "You've saved 8 articles about system design — create a collection?"
- One-click accept → creates a tag area with pre-assigned bookmarks
- Runs weekly via pg_cron → edge function → OpenRouter

### 2.5 Chat with Your Library
- "What did I save about React Server Components?"
- "Summarize my top 5 insights from this month"
- "What topics am I reading most about?"
- Implementation: RAG over extracted content using pgvector (free in Supabase)
- Embeddings: generated via edge function on content extraction
- Chat UI: slide-out panel, conversation history

```sql
-- pgvector extension (free in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE bookmarks ADD COLUMN embedding vector(384);
CREATE INDEX bookmarks_embedding_idx ON bookmarks USING ivfflat (embedding vector_cosine_ops);
```

### 2.6 Spaced Review
- Bookmarks marked "done" enter a review queue
- Spaced repetition algorithm (SM-2 variant) schedules reviews
- Daily "Review" card: shows 3-5 bookmarks with your notes
- "Still remember?" → push to next interval
- "Forgot" → resurface sooner
- Goal: turn passive reading into retained knowledge

---

## Phase 3: Platform (v4.0)

> Goal: ContentDeck everywhere. Save from any context, access from any device.

### 3.1 Browser Extension (Manifest V3)
- **Chrome + Firefox** (same codebase via WebExtension API)
- Popup: current page title/URL, source detection, tag selection, one-click save
- Context menu: right-click any link → "Save to ContentDeck"
- Highlight mode: select text on any page → save as highlight note
- Side panel: browse your bookmarks without leaving the current tab
- Auth: uses Supabase session token from the main app
- Published on Chrome Web Store + Firefox Add-ons (both free)

### 3.2 Offline-First PWA
- **IndexedDB** (via Dexie.js) for local bookmark storage
- Full CRUD works offline — syncs when back online
- Conflict resolution: last-write-wins with timestamp comparison
- Background sync API: queue mutations → replay on reconnect
- Service worker: precache app shell + critical assets on install

### 3.3 Public API
- RESTful API via Supabase Edge Functions
- Endpoints: `/api/bookmarks`, `/api/areas`, `/api/search`
- API key authentication (generated in Settings)
- Rate limiting: 100 req/min per key
- OpenAPI spec auto-generated
- Enables: CLI tools, Zapier/IFTTT integration, third-party apps

### 3.4 CLI Tool
- `npx contentdeck save <url>` — save from terminal
- `npx contentdeck list --status=unread --source=youtube`
- `npx contentdeck search "react server components"`
- `npx contentdeck export --format=obsidian --area=engineering`
- Auth via `contentdeck login` (opens browser for OAuth)
- Published on npm (free)

### 3.5 Telegram Bot
- `/save <url>` — save a bookmark
- `/list` — show recent unread
- `/random` — get a random unread bookmark to read
- Forward any message with a URL → auto-save
- Hosted on Supabase Edge Functions (webhook mode, no server needed)
- Telegram Bot API is free, unlimited

### 3.6 Email-to-Save
- Dedicated email address (via Cloudflare Email Workers, free)
- Forward newsletters → auto-saved as bookmarks
- Subject line → title, body URLs → extracted and saved
- Great for Substack newsletters that don't have clean URLs

### 3.7 RSS Feed Monitoring
- Add RSS feeds in Settings → new items auto-saved as unread bookmarks
- pg_cron job checks feeds every 30 minutes
- Supabase Edge Function parses RSS XML
- Use cases: follow blogs, YouTube channels, Substack writers
- Max 20 feeds per user (free tier budget)

---

## Phase 4: Social & Scale (v5.0)

> Goal: From personal tool to community platform.

### 4.1 Public Reading Lists
- Toggle any tag area to "public" → generates a shareable URL
- `/u/username/area-name` — beautiful public page
- OG meta tags per list (dynamic via edge function)
- Anyone can view, only owner can edit
- "Copy to my library" button for viewers

### 4.2 User Profiles
- `/u/username` — public profile page
- Reading stats (opt-in): books read this year, articles completed, streak
- Pinned collections
- "Follow" button → get notified when they publish a new list

### 4.3 Discover Feed
- Curated feed of popular public bookmarks across all users
- Trending: most-saved URLs in the last 7 days
- Categories: filtered by source type or tag
- "Save to my library" one-click action
- Moderation: report button + admin flag system

### 4.4 Collaborative Collections
- Invite others to contribute to a shared tag area
- Real-time sync via Supabase Realtime
- Activity log: "Alice added 3 bookmarks to Design"
- Use case: team reading lists, study groups, content curation

### 4.5 Weekly Digest Email
- Automated weekly email with:
  - Reading stats (completed, streak)
  - Oldest unread bookmarks ("these have been waiting 30+ days")
  - AI-generated topic summary ("This week you focused on...")
- Sent via Supabase Edge Function + Resend (free tier: 100 emails/day)
- Configurable: daily/weekly/off

### 4.6 Achievements & Gamification
- Reading milestones: "Read 100 articles", "7-day streak", "Completed a book"
- Source diversity: "Explored all 6 source types"
- Export badges: "Exported 50 bookmarks to Obsidian"
- Displayed on profile, shareable as images
- Motivates consistent reading habits

---

## Phase 5: Ecosystem (v6.0)

> Goal: ContentDeck as the hub of your information diet.

### 5.1 Obsidian Plugin
- Bidirectional sync between ContentDeck and Obsidian
- Obsidian → ContentDeck: save links from your vault
- ContentDeck → Obsidian: auto-export on status change to "done"
- Uses Obsidian's plugin API (free to publish on community plugins)

### 5.2 Notion Integration
- Export bookmarks as Notion database entries
- Map: tags → Notion multi-select, notes → Notion blocks, status → Notion status
- Uses Notion API (free)
- One-time export or continuous sync

### 5.3 Readwise Integration
- Import Kindle highlights as notes on book-type bookmarks
- Sync article highlights from Readwise Reader
- Two-way: ContentDeck highlights → Readwise
- Uses Readwise API (requires Readwise subscription — optional integration)

### 5.4 Podcast Support
- Save podcast episode URLs (Spotify, Apple Podcasts, Overcast)
- Extract episode metadata: title, show name, duration, description
- Timestamp notes: "At 14:32 — interesting point about..."
- Source type: `podcast` added to schema

### 5.5 PDF & Document Support
- Upload PDFs to Supabase Storage (1GB free)
- Extract text via edge function (pdf-parse library)
- Inline PDF viewer in reader mode
- Highlight and annotate PDFs
- Source type: `document`

### 5.6 Research Paper Support
- Detect arXiv, Semantic Scholar, Google Scholar URLs
- Auto-fetch: title, authors, abstract, citation count
- BibTeX export for academic users
- Related papers via Semantic Scholar API (free, 100 req/sec)

### 5.7 GitHub Stars Import
- Import your GitHub starred repos as bookmarks
- Auto-tagged with repo language and topics
- Keep in sync: new stars auto-imported via webhook
- Great for developer audience

### 5.8 Hacker News / Reddit Save
- Browser extension detects HN/Reddit comment pages
- "Save with discussion" — saves URL + top comments as notes
- Captures the context around *why* something was interesting

---

## Infrastructure & DevOps

### Testing Pyramid
```
E2E (Playwright)     — 10 critical user journeys
Integration          — API endpoints, auth flows, edge functions
Component (RTL)      — 30+ component tests for UI logic
Unit (Vitest)        — 50+ tests for lib/ pure functions
Type checking (tsc)  — Zero tolerance for type errors
```

### CI/CD Pipeline (GitHub Actions — free)
```yaml
on: [push, pull_request]
jobs:
  quality:
    - npm ci
    - npx tsc --noEmit          # Type check
    - npx vitest run             # Unit + component tests
    - npx playwright test        # E2E tests
    - npx vite build             # Build verification

  deploy:
    - Vercel auto-deploy (already configured)

  scheduled:
    - Weekly: dependency audit (npm audit)
    - Weekly: Lighthouse CI score check
    - Daily: health check ping to production
```

### Monitoring & Observability
- **Sentry** (free: 5K events/month): Error tracking, performance monitoring
- **Vercel Analytics** (free: basic web vitals)
- **Supabase Dashboard**: Database metrics, API usage, auth stats
- **UptimeRobot** (free: 50 monitors): Uptime monitoring with alerts
- **Custom health endpoint**: `/api/health` edge function

### Security Hardening
- **Content Security Policy**: Strict CSP headers in `vercel.json`
- **Rate limiting**: Supabase RLS + edge function rate limits
- **Input validation**: Zod schemas for all API inputs
- **SQL injection**: Parameterized queries via Supabase client (already safe)
- **XSS**: React's automatic escaping + DOMPurify for rendered HTML (reader mode)
- **CORS**: Restrictive CORS headers on API endpoints
- **Dependency scanning**: GitHub Dependabot (free) + `npm audit` in CI

### Performance Targets
| Metric | Target | How |
|--------|--------|-----|
| First Contentful Paint | < 1.5s | Inline loading state, preconnect hints |
| Largest Contentful Paint | < 2.5s | Code splitting, lazy load modals |
| Time to Interactive | < 3.5s | Defer non-critical JS, tree-shake icons |
| Bundle size (gzipped) | < 120KB | Code split: core + modals + detail + areas |
| Lighthouse Performance | > 90 | Optimize images, preload critical assets |
| Lighthouse Accessibility | 100 | Already close, maintain with CI checks |

### Code Splitting Strategy
```
Entry chunk:        React, Router, TanStack Query, core UI  (~80KB gzip)
Dashboard chunk:    Feed, source tabs, toolbar               (~20KB gzip)
Detail chunk:       Detail panel, notes, export              (~15KB gzip, lazy)
Modals chunk:       Add/Edit/Settings/Stats/Areas            (~15KB gzip, lazy)
AI chunk:           OpenRouter client, summarization          (~5KB gzip, lazy)
```

---

## Free Tier Budget

Every service used must have a free tier sufficient for the project's scale.

| Service | Free Tier | Our Usage | Headroom |
|---------|-----------|-----------|----------|
| **Supabase** | 500MB DB, 1GB storage, 50K MAU, 500K edge fn | ~50MB DB, ~100MB storage, <1K MAU | 10x |
| **Vercel** | 100GB bandwidth, 100K fn invocations | ~5GB/mo bandwidth | 20x |
| **OpenRouter** | Free models (Llama, Gemma, Qwen) | ~500 req/day | Unlimited |
| **GitHub Actions** | 2,000 min/month | ~200 min/month | 10x |
| **Sentry** | 5K events/month | ~500 events/month | 10x |
| **UptimeRobot** | 50 monitors, 5-min checks | 1 monitor | 50x |
| **Cloudflare** | Unlimited bandwidth, email workers | Email-to-save | Unlimited |
| **Chrome Web Store** | Free to publish | 1 extension | N/A |
| **npm** | Free to publish | 1 CLI package | N/A |
| **Resend** | 100 emails/day | ~50 digests/week | 14x |
| **Semantic Scholar API** | 100 req/sec | Occasional lookups | 100x |

**Total monthly cost: $0.00**

---

## Quality Gates

Every PR must pass before merge:

1. `tsc --noEmit` — zero type errors
2. `vitest run` — all tests pass
3. `vite build` — clean production build
4. Bundle size delta — no more than +5KB gzip without justification
5. Accessibility — Lighthouse a11y score >= 95
6. Security — no `npm audit` high/critical vulnerabilities
7. Code review — at least one review (even if self-review with Claude Code)

---

## Implementation Priority Matrix

```
                        HIGH IMPACT
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         │  Auth (1.1) ✅    │  AI Summary(2.1) │
         │  Fixes (1.1a/b)  │  Extension (3.1) │
         │  Import (1.4)    │  Chat (2.5)      │
         │  Search (1.3)    │  Public API (3.3)│
         │  Testing (1.6)   │                  │
         │                  │                  │
LOW ─────┼──────────────────┼──────────────────┼───── HIGH
EFFORT   │                  │                  │    EFFORT
         │  Reader (1.5)    │  Offline (3.2)   │
         │  Review (2.6)    │  Social (4.1-4)  │
         │  Digest (4.5)    │  Obsidian (5.1)  │
         │  RSS (3.7)       │  Podcasts (5.4)  │
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                        LOW IMPACT
```

**Execution order**: Top-left quadrant first (high impact, low effort), then top-right (high impact, high effort), then bottom-left, then bottom-right.

---

## Session Workflow

Each development session should follow this pattern:

1. **Check ENGINEERING-PLAN.md** — pick the next item from current phase
2. **Read CLAUDE.md** — refresh on architecture and rules
3. **Check AUDIT.md** — any regressions to watch for?
4. **Implement** — use Claude Code with plan mode for non-trivial features
5. **Test** — `tsc --noEmit && vite build` minimum; run tests when available
6. **Update docs** — CLAUDE.md, AUDIT.md, README.md as needed
7. **Commit with clear message** — one feature per commit
8. **Push** — Vercel auto-deploys

---

*This plan is a living document. Update it as priorities shift and features ship.*
*Last updated: 2026-02-11 — v3.0 auth shipped. v2.2 → v3.0 migration complete.*
