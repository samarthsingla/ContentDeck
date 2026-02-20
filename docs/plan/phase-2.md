# Phase 2: Notes System (v3.5)

> Goal: Notes as first-class thinking artifacts — not just bookmark annotations, but standalone objects you write, link, and organize.

**Status:** Complete ✅ (2.1–2.5 shipped in feat/12-notes)
**Depends on:** Phase 1 (complete)
**Unlocks:** Phase 3 (Knowledge Graph), Phase 4 (Thinking Companion)

---

## Why Notes First?

Everything in the roadmap builds on notes:
- **Knowledge Graph** (Phase 3) needs note embeddings to find connections
- **Thinking Companion** (Phase 4) needs notes as the surface for reflection prompts
- **Life Management** (Phase 5) needs notes for people context and reminders

Without standalone notes, ContentDeck is a bookmark manager. With them, it's a thinking tool.

### Design Decisions

- **Inline notes stay.** The existing JSONB `notes` array on bookmarks is perfect for quick annotations ("good explanation of X", "see also: Y"). No migration needed.
- **Standalone notes are new.** A `notes` table for longer-form thinking — connected to bookmarks but not owned by them.
- **"Promote to Note"** bridges the two: turn a quick inline annotation into a full standalone note with one click.
- **TipTap** for the editor: headless (works with Tailwind), markdown support, mobile-friendly, lazy-loadable (~45KB gzip).

---

## 2.1 Schema + Hook + Demo Data ✅

**Database:**
- `notes` table: `id`, `user_id`, `title`, `content` (markdown text), `created_at`, `updated_at`
- `note_bookmarks` junction: `note_id`, `bookmark_id` (many-to-many)
- `note_tags` junction: `note_id`, `tag_area_id` (notes belong to areas)
- RLS policies: user can only read/write own notes (scoped via `user_id`)
- Trigger: `set_user_id()` auto-sets `user_id` on insert (same pattern as bookmarks)

```sql
CREATE TABLE notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE note_bookmarks (
  note_id uuid REFERENCES notes ON DELETE CASCADE,
  bookmark_id uuid REFERENCES bookmarks ON DELETE CASCADE,
  PRIMARY KEY (note_id, bookmark_id)
);

CREATE TABLE note_tags (
  note_id uuid REFERENCES notes ON DELETE CASCADE,
  tag_area_id uuid REFERENCES tag_areas ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_area_id)
);

-- RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own notes" ON notes FOR ALL USING (auth.uid() = user_id);
-- note_bookmarks and note_tags scoped via subquery on notes.user_id
```

**React:**
- `useNotes` hook (TanStack Query): CRUD with optimistic updates, same pattern as `useBookmarks`
- `useNoteBookmarks` hook: link/unlink bookmarks to notes
- Mock client updates for demo mode: in-memory notes array
- Demo data: 5-8 sample notes linked to existing demo bookmarks

## 2.2 Notes List View ✅

- `NotesList` component: grid/list of note cards, sorted by `updated_at`
- `NoteCard`: title, preview (first ~100 chars of content), linked bookmark count, area badges, timestamp
- Sidebar navigation: add "Notes" entry alongside existing views
- `ViewMode` update: add `'notes'` to the view mode union type
- Mobile parity: responsive cards, touch targets, same filter/sort patterns as bookmarks
- Empty state: illustration + "Create your first note" CTA

## 2.3 Note Editor ✅

- **TipTap** markdown editor, lazy loaded (`React.lazy` + `Suspense`)
- `NoteEditorModal` (or full-page on mobile): title input + editor + toolbar
- Toolbar: bold, italic, headings, bullet list, numbered list, code block, link
- Auto-save: debounced (1s) save to Supabase on content change
- Keyboard shortcuts: standard markdown shortcuts (Ctrl+B, Ctrl+I, etc.)
- "Promote to Note" action on inline bookmark notes → creates standalone note pre-filled with the annotation text, auto-linked to the source bookmark

## 2.4 Bookmark Linking ✅

- `LinkedBookmarks` panel inside NoteEditorModal: shows bookmarks linked to this note, with search/add UI
- "Create Note" button in bookmark DetailPanel → opens NoteEditorModal with that bookmark pre-linked
- "Linked Notes" section in bookmark DetailPanel: shows notes that reference this bookmark
- Bidirectional navigation: note → bookmarks, bookmark → notes

## 2.5 Polish + Export ✅

- Area assignments: notes can be tagged with areas (same area picker as bookmarks)
- Markdown export: download note as `.md` file (title as filename)
- Search integration: extend existing full-text search to include note titles and content
- Tests: unit tests for `useNotes` hook, component tests for NoteCard and NotesList
- Accessibility: proper ARIA for editor, focus management in modal, keyboard navigation
