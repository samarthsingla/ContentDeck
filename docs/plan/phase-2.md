# Phase 2: Intelligence (v3.5)

> Goal: AI that actively helps you learn, not just tag.

## 2.1 AI Summarization
- **One-click summarize** in detail panel
- Edge function: send extracted text to OpenRouter → get 3-5 bullet summary
- Store in `metadata.summary` (JSONB)
- Show summary card above notes in detail panel
- **Progressive**: Short summary on card, full summary in detail
- **Model**: Gemma 3 or Llama 3.3 70B (free on OpenRouter)

## 2.2 Smart Connections
- When viewing a bookmark, show "Related" bookmarks
- Algorithm: TF-IDF on extracted text + shared tags + same source type
- Computed via edge function, cached in `metadata.related_ids`
- UI: "Related" section at bottom of detail panel
- No external API — pure PostgreSQL full-text ranking

## 2.3 Reading Queue Prioritization
- **Smart queue**: AI suggests what to read next based on:
  - Time in queue (older unread items bubble up)
  - Topic diversity (don't read 5 React articles in a row)
  - Reading history (prefer sources you finish, deprioritize sources you abandon)
  - Freshness (time-sensitive content like news ranked higher)
- Displayed as a "Up Next" card at the top of the feed
- Uses existing `status_history` data — no new tables needed

## 2.4 Auto-Collections
- AI groups related bookmarks into suggested collections
- "You've saved 8 articles about system design — create a collection?"
- One-click accept → creates a tag area with pre-assigned bookmarks
- Runs weekly via pg_cron → edge function → OpenRouter

## 2.5 Chat with Your Library
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

## 2.6 Spaced Review
- Bookmarks marked "done" enter a review queue
- Spaced repetition algorithm (SM-2 variant) schedules reviews
- Daily "Review" card: shows 3-5 bookmarks with your notes
- "Still remember?" → push to next interval
- "Forgot" → resurface sooner
- Goal: turn passive reading into retained knowledge
