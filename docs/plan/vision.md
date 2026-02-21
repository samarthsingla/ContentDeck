# ContentDeck — Vision & Architecture

> Augment your thinking, don't replace it.
> Bridge between consuming content and building knowledge - on a low cost infrastructure

---

## Vision

ContentDeck today: a personal bookmark manager with status tracking, full-text search, and reader mode.

ContentDeck tomorrow: **a personal knowledge and thinking augmentation system** — where you capture content, write notes to develop your understanding, discover hidden connections across everything you've saved, and use AI as a thinking partner that asks the right questions instead of giving you summaries.

```
v3.0 (current)    v3.5               v3.6                v4.0                    v4.5                  v5.0
Foundation    →   Notes System    →  Review System    →  Knowledge Graph      →  Thinking Companion →  Life Management
Auth, search      Standalone notes   Review pane         Embeddings, pgvector     AI reflection         Telegram capture
Reader mode       TipTap editor      7-day intervals     Topic clusters           Bias detection        Reminders
Testing & CI      Bookmark linking   last_reviewed_at    Semantic search          Socratic prompts      People & context
```

---

## Architecture Evolution

### Current (v3.0)
```
React PWA ─────────┐
iOS Shortcut ──────┼→ Supabase (Auth + RLS + Edge Functions)
Bookmarklet ───────┘     ├→ PostgreSQL (full-text search, tsvector, JSONB)
                         └→ Edge Functions (content extraction, bookmark save)
                    → OpenRouter (AI tagging, free models)
                    → Microlink/oEmbed (metadata)
```

### Target (v5.0)
```
React PWA ─────────┐
iOS Shortcut ──────┤
Bookmarklet ───────┼→ Supabase (Auth + RLS + Edge Functions + Realtime)
Telegram Bot ──────┘     ├→ PostgreSQL (tsvector + pgvector + pg_cron)
                         ├→ Edge Functions (embeddings, companion AI, reminders)
                         └→ Realtime (live sync across devices)
                    → OpenRouter (tagging, reflection prompts, connection analysis)
                    → Hugging Face Inference API (embeddings, free tier)
```

---

## Dependency Graph

```
Phase 2 (Notes) ──┬──→ Phase 2b (Review) ──┬──→ Phase 4 (Thinking Companion) ──→ Phase 5
                  └──→ Phase 3 (Embeddings) ─┘
```

- **Phase 2** is the foundation — notes are required for everything that follows.
- **Phase 2b** ships next — mechanical review cadence, no AI yet.
- **Phase 3** (Embeddings) and **Phase 2b** (Review) can progress in parallel.
- **Phase 4** (Thinking Companion) builds on both — `review_count`/`last_reviewed_at` from Phase 2b, embeddings from Phase 3.
- **Phase 5** requires both Phase 3 (embeddings for contextual recall) and Phase 4 (companion for people context).

---

## Core Principles

### 1. Questions over summaries
AI prompts reflection, it doesn't summarize for you. Every AI output is a prompt for the user to think deeper. "What surprised you about this?" not "Here are the key points."

### 2. Notes are first-class
Notes aren't just annotations on bookmarks — they're standalone thinking artifacts. A note can link to multiple bookmarks, belong to topic areas, and exist independently as your own thought.

### 3. Connections emerge
Embeddings and topic modeling surface what you'd miss on your own. "You saved 3 articles about distributed systems last month and wrote a note about CAP theorem — have you connected these?"

### 4. Free tier for now. Paid later
Supabase (500MB DB) + OpenRouter (free models) + Vercel (100GB bandwidth) + Hugging Face (free inference) = $0/month. 

### 5. Progressive enhancement
Each phase is independently useful. Notes are valuable without embeddings. Embeddings are valuable without AI companion. You never need to "finish" the roadmap to get value.
