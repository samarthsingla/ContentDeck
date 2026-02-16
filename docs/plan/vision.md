# ContentDeck — Vision & Architecture

> From personal bookmark manager to full-stack knowledge capture platform.
> All components free-tier. No compromises on scale, security, or reliability.

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
