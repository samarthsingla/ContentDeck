# Phase 2b: Review System (v3.6)

> Goal: Shift the mental model from "status tracking" to "knowledge review" — every
> piece of content you save is a candidate for deliberate recall, not a task in a queue.

**Status:** Complete (2b.1–2b.5 shipped)
**Depends on:** Phase 2 (Notes System — complete)
**Unlocks:** Phase 4 (Thinking Companion — AI-enhanced spaced repetition)
**Version target:** v3.6

---

## Why This Phase Exists

The Unread / Reading / Done workflow treats content as tasks to check off. Once "Done",
items disappear. This is anti-learning: the value of a piece of content is highest the
second time you engage with it, not the first.

Replace "Have I consumed this?" with "When did I last actively engage with this?". Every
bookmark becomes a knowledge piece that can be surfaced for review. You are not working
through a queue — you are tending a garden.

This is the first mechanical step toward the guiding vision: **boost the user's memory,
strengthen recall**. Status tracking does not strengthen recall. Deliberate review does.

**What gets deferred:** Sophisticated spaced repetition (SM-2, adaptive intervals, recall
quality ratings) is explicitly Phase 4 territory where the AI Thinking Companion enhances it.

---

## Design Decision: Coexist, Don't Replace Status

`status` is preserved. Rationale:
- It touches 11 files — removal is a large refactor with no core value
- Status (unread/reading/done) captures _initial read state_; `last_reviewed_at` captures
  _deliberate review cadence_ — different concepts
- Sidebar navigation by status remains useful for triage

**What changes in the status UX:**
- Label `'done'` → `'Read'` in `statusLabels` and filter labels (one-line change each).
  Shifts language from task-completion to initial-read without touching the type system.

**New fields on `bookmarks`:**
- `last_reviewed_at timestamptz DEFAULT NULL` — review timestamp
- `review_count integer NOT NULL DEFAULT 0` — counter Phase 4 uses for SRS seeding

---

## 2b.1 Schema Migration

New file: `sql/migrations/review-system.sql`

```sql
-- Phase 2b: Review System
ALTER TABLE bookmarks
  ADD COLUMN last_reviewed_at timestamptz DEFAULT NULL,
  ADD COLUMN review_count     integer NOT NULL DEFAULT 0;

CREATE INDEX idx_bookmarks_review
  ON bookmarks (user_id, last_reviewed_at NULLS FIRST);

-- Returns bookmarks due for review. Hardcoded 7-day interval.
-- Phase 4 replaces this with per-item adaptive intervals.
CREATE OR REPLACE FUNCTION get_review_queue(p_limit int DEFAULT 20)
RETURNS SETOF bookmarks
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM bookmarks
  WHERE user_id = auth.uid()
    AND (
      last_reviewed_at IS NULL
      OR last_reviewed_at < now() - interval '7 days'
    )
  ORDER BY last_reviewed_at NULLS FIRST, created_at ASC
  LIMIT p_limit;
$$;
```

---

## 2b.2 Type System

`src/types/index.ts`:
- Add to `Bookmark` interface: `last_reviewed_at: string | null`, `review_count: number`
- Add to `ViewMode` union: `'review'`

`src/hooks/useBookmarks.ts`:
- Update `normalizeBookmark` to include `last_reviewed_at` and `review_count` fields

---

## 2b.3 `useReview` Hook

New file: `src/hooks/useReview.ts`
Pattern: mirrors `useNotes.ts`

- `useQuery` calling `get_review_queue` RPC → `queryKey: ['reviewQueue']`
- `recordReview(bookmarkId)` mutation — sets `last_reviewed_at = now()`, increments
  `review_count`. Optimistic update following `cycleStatus` pattern in `useBookmarks.ts`
- `skipReview(bookmarkId)` — no DB write; removes from local queue state (moves to end)
- Exposes `dueCount` (queue length) used for sidebar badge

**Demo mode:** `mock-supabase.ts` must handle `rpc('get_review_queue')`. `DEMO_BOOKMARKS`
in `demo-data.ts` should have `last_reviewed_at: null, review_count: 0` on most items.

---

## 2b.4 Review Pane UI

New components:
- `src/components/review/ReviewPane.tsx` — main review view
- `src/components/review/ReviewCard.tsx` — single bookmark card in review context

**ReviewPane layout:**
- Header: "Review" + count badge ("12 due")
- **One card at a time** (deliberate — forces engagement, not skimming)
- Card shows: title, source type badge, excerpt (≤150 chars), tags/areas,
  "Never reviewed" or "Reviewed 12 days ago"
- Actions: **"Reviewed"** (calls `recordReview`, advances) + **"Skip"** (moves to end)
- "Open Details" link → opens existing DetailPanel
- Progress: "3 of 12 reviewed this session"
- Empty state: "You're all caught up. Come back tomorrow." + next-due date

**Sidebar entry point:** New "Review" nav item in `Sidebar.tsx` + `MobileNav.tsx`,
`RotateCcw` or `Brain` icon, badge showing `dueCount`. Same pattern as "Notes" button.

**Mobile tradeoff:** MobileNav is at 5 tabs. Replace "Done" tab with "Review" — Done
remains accessible via sidebar filter on desktop. Document this in MobileNav.

**Dashboard wiring:** `Dashboard.tsx` adds `case 'review': return <ReviewPane />` to
view renderer.

---

## 2b.5 Review Interval Logic

**"Due for review" rules:**
1. `last_reviewed_at IS NULL` — never reviewed, ordered oldest `created_at` first
2. `last_reviewed_at < now() - 7 days` — overdue, ordered most-overdue first

Queue limit: 20 items per session.

**Recording a review:** Sets `last_reviewed_at = now()`, increments `review_count`. Does
NOT change `status`.

**Non-features (deferred to Phase 4):**
- No recall quality rating (1–5 stars)
- No adaptive interval per item
- No review history table
- No AI reflection questions in the review pane
- Notes do not appear in the queue yet (bookmarks only for tight scope)

---

## 2b.6 Files to Modify

| File | Change |
|---|---|
| `src/types/index.ts` | Add `last_reviewed_at`, `review_count` to `Bookmark`; add `'review'` to `ViewMode` |
| `src/hooks/useBookmarks.ts` | Update `normalizeBookmark` to include new fields |
| `src/components/ui/Badge.tsx` | `statusLabels.done` → `'Read'` |
| `src/components/feed/StatusFilters.tsx` | `labels.done` → `'Read'` |
| `src/components/layout/Sidebar.tsx` | Add Review nav item with `dueCount` badge |
| `src/components/layout/MobileNav.tsx` | Add Review tab; replace Done tab; note tradeoff |
| `src/pages/Dashboard.tsx` | Add `'review'` case to view renderer |
| `src/lib/mock-supabase.ts` | Handle `rpc('get_review_queue')` and `recordReview` update |
| `src/lib/demo-data.ts` | Add `last_reviewed_at: null, review_count: 0` to demo bookmarks |
| `sql/migrations/` | Add `review-system.sql` |

---

## 2b.7 What Phase 4 Builds On

Phase 4 (Thinking Companion AI) gains:
- `review_count` as usage signal for AI reasoning
- `last_reviewed_at` as a timestamp the AI can contextualize ("saved 3 months ago,
  reviewed twice")
- ReviewPane as the UI surface for injecting AI reflection questions post-review
- Extension point: add `review_history` table in Phase 4 (event log with recall quality
  rating) → enables SM-2 interval calculation
- `get_review_queue` RPC can be replaced in Phase 4 with an adaptive-interval version

---

## Verification

1. Run migration SQL in Supabase → confirm `last_reviewed_at` and `review_count` columns
   appear on `bookmarks`
2. Open demo mode → Review pane shows cards, "Reviewed" and "Skip" work, progress counter
   updates
3. Mark item reviewed → `last_reviewed_at` written to DB, item disappears from queue
4. After 7 days (or set `last_reviewed_at` to 8 days ago manually) → item reappears
5. `npm run typecheck && npm run lint && npm run test && npm run build` — all pass
