# Phase 3: Knowledge Graph + Topic Modeling (v4.0)

> Goal: Surface connections you'd miss on your own. Embeddings make your library searchable by meaning, not just keywords.

**Status:** Not started
**Depends on:** Phase 2 (Notes System)
**Unlocks:** Phase 5 (Life Management — contextual recall)

---

## Why Embeddings?

Full-text search finds exact matches. Embeddings find *meaning*. Search "distributed systems" and also surface your note about "CAP theorem trade-offs" and that article about "eventual consistency in DynamoDB" — even though they don't share keywords.

### Free Tier Budget

- **pgvector**: Built into Supabase (free), no extra cost
- **384 dimensions** (all-MiniLM-L6-v2): good quality, small vectors
- **2,000 items × 384 dims × 4 bytes** = ~3MB — well within Supabase's 500MB free tier
- **Hugging Face Inference API**: free tier for embedding generation (30K chars/min)
- **Fallback**: Transformers.js in-browser if HF API is unavailable

---

## 3.1 Embeddings Infrastructure

**Database:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE bookmarks ADD COLUMN embedding vector(384);
ALTER TABLE notes ADD COLUMN embedding vector(384);

-- ivfflat indexes (efficient for < 1M rows)
CREATE INDEX bookmarks_embedding_idx ON bookmarks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX notes_embedding_idx ON notes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

**Edge Function: `generate-embedding`**
- Input: text (bookmark title + excerpt, or note content)
- Calls Hugging Face Inference API (`all-MiniLM-L6-v2`, free tier)
- Returns 384-dim vector, stored in `embedding` column
- Triggered on: bookmark insert/update (if content changes), note save (debounced)
- Fallback: queue for retry if HF API rate-limited

**RPC Functions:**
```sql
-- Find similar bookmarks
CREATE FUNCTION match_bookmarks(query_embedding vector(384), match_count int)
RETURNS TABLE (id uuid, title text, similarity float)
AS $$
  SELECT id, title, 1 - (embedding <=> query_embedding) AS similarity
  FROM bookmarks
  WHERE embedding IS NOT NULL AND user_id = auth.uid()
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;

-- Find similar notes
CREATE FUNCTION match_notes(query_embedding vector(384), match_count int)
RETURNS TABLE (id uuid, title text, similarity float)
AS $$
  SELECT id, title, 1 - (embedding <=> query_embedding) AS similarity
  FROM notes
  WHERE embedding IS NOT NULL AND user_id = auth.uid()
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;
```

## 3.2 Related Items UI

- **"Related content" panel** in bookmark DetailPanel: shows top 5 similar bookmarks + notes (by embedding cosine similarity)
- **"Related content" panel** in NoteEditorModal: same, shows related bookmarks + other notes
- Similarity threshold: only show items with > 0.5 cosine similarity
- Lazy loaded: only fetches when panel is expanded
- Graceful degradation: hidden if embedding not yet generated

## 3.3 Topic Clusters

**Database:**
```sql
CREATE TABLE topic_clusters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  label text NOT NULL,
  description text,
  centroid vector(384),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE cluster_members (
  cluster_id uuid REFERENCES topic_clusters ON DELETE CASCADE,
  bookmark_id uuid REFERENCES bookmarks ON DELETE CASCADE,
  note_id uuid REFERENCES notes ON DELETE CASCADE,
  CHECK (bookmark_id IS NOT NULL OR note_id IS NOT NULL),
  UNIQUE (cluster_id, bookmark_id),
  UNIQUE (cluster_id, note_id)
);
```

- **K-means clustering** on user's embeddings (run via Edge Function, triggered manually or weekly)
- **AI-generated labels**: send cluster centroids + sample titles to OpenRouter → get human-readable topic names
- **UI in Areas view**: "Discovered Topics" section showing auto-generated clusters with member counts
- "Convert to Area" action: turn a discovered topic cluster into a tag area with pre-assigned items

## 3.4 Semantic Search

- **"Search by meaning"** toggle alongside existing full-text search
- Embed the search query → find nearest neighbors via `match_bookmarks` + `match_notes`
- Layered on top of existing tsvector search: users can switch between keyword and semantic modes
- Results ranked by cosine similarity, displayed with similarity score
- Combined mode (future): merge tsvector rank + cosine similarity for best results
