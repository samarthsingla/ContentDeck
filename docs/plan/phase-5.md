# Phase 5: Life Management + Messaging (v5.0)

> Goal: ContentDeck becomes your external brain — capturing not just content, but people, reminders, and context.

**Status:** Not started
**Depends on:** Phase 3 (embeddings for contextual recall), Phase 4 (companion for people context)

---

*This phase is intentionally less detailed — it's the furthest out and will be refined when Phases 2-4 are complete. The broad strokes are here to guide architectural decisions in earlier phases.*

---

## 5.1 Telegram Bot

Quick capture from anywhere — no need to open the app.

- **URL → bookmark**: send a URL, it's saved as a bookmark with auto-metadata
- **Text → note**: send plain text, it's saved as a standalone note
- **Forward message → auto-detect**: URLs become bookmarks, text becomes notes
- **`/list`**: show recent unread bookmarks
- **`/random`**: get a random unread bookmark to read

**Implementation:**
- Telegram Bot API (free, unlimited messages)
- Supabase Edge Function as webhook handler
- Auth: one-time linking via `/start <token>` (token generated in Settings)
- No polling — webhook mode only (free, no server needed)

## 5.2 Reminders

Resurface content at the right time.

- `reminder_at` column on bookmarks and notes
- "Remind me" action in DetailPanel and NoteEditorModal (date picker)
- **pg_cron** job checks for due reminders every 15 minutes
- Notification channels:
  - Telegram message (if bot is linked)
  - PWA push notification (if permission granted)
- Snooze options: +1 day, +1 week, +1 month
- Recurring reminders for notes (weekly review prompts)

## 5.3 People & Connections

Track the people in your content and thinking.

**Database:**
```sql
CREATE TABLE people (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  context text,              -- who they are, how you know them
  interests jsonb DEFAULT '[]',  -- topics they care about
  embedding vector(384),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE person_notes (
  person_id uuid REFERENCES people ON DELETE CASCADE,
  note_id uuid REFERENCES notes ON DELETE CASCADE,
  PRIMARY KEY (person_id, note_id)
);

CREATE TABLE person_bookmarks (
  person_id uuid REFERENCES people ON DELETE CASCADE,
  bookmark_id uuid REFERENCES bookmarks ON DELETE CASCADE,
  PRIMARY KEY (person_id, bookmark_id)
);
```

- Link people to notes and bookmarks: "Alice recommended this article", "Discuss with Bob"
- Embedding on people (based on linked content) enables: "What should I talk to Alice about?"
- People view: list of people with their linked content and interest tags

## 5.4 Contextual Recall

Natural language query across everything.

- "What did Alice recommend about distributed systems?"
- "What was that article I saved last month about React performance?"
- "Show me everything related to my job interview prep"

**Implementation:**
- Embed the natural language query
- Search across bookmarks, notes, and people embeddings
- Combine results with metadata filters (date, source type, person)
- Display as a unified result list with source type indicators
- Uses existing OpenRouter for query understanding + existing pgvector for retrieval
