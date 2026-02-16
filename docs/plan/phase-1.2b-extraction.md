# Phase 1.2 Part B — Content Extraction Pipeline (Implementation Plan)

**Status:** SHIPPED — 2026-02-16 — see [log/v3.0-content-extraction.md](../log/v3.0-content-extraction.md)

## Context

ContentDeck needs to extract readable article text from bookmarked URLs. This enables future full-text search (1.3) and powers better metadata for blogs/substack/linkedin. Part A (metadata quality fixes) is shipped. Part B adds the extraction edge function and client integration.

Currently, Microlink provides reading_time/word_count for non-YouTube/Twitter sources (50 req/day free limit). The extraction pipeline will produce richer data (full text, author, accurate word count) with no API limits since it runs server-side.

---

## What Gets Built

### 1. SQL Migration — `sql/migrations/005_add_content_extraction.sql`

Add 3 columns to `bookmarks`:
- `content` JSONB (default `'{}'`)
- `content_status` text (default `'pending'`, CHECK: pending/extracting/success/failed/skipped)
- `content_fetched_at` timestamptz
- Partial index on content_status for efficient pending/failed queries

Also update `sql/setup.sql` canonical schema.

### 2. Edge Function — `supabase/functions/extract-content/index.ts`

- **Auth**: Supabase JWT (deploy WITHOUT `--no-verify-jwt`)
- **Input**: POST `{ bookmark_id }` — client calls via `supabase.functions.invoke()`
- **Flow**:
  1. Verify JWT → get user ID via `auth.getUser()`
  2. Fetch bookmark (service role) → verify `user_id === authenticated user`
  3. YouTube/Twitter → set `content_status='skipped'`, return
  4. Set `content_status='extracting'`
  5. Fetch URL HTML (10s timeout via AbortController, custom User-Agent)
  6. Parse with `linkedom` → extract with `@mozilla/readability`
  7. Store `content` JSONB: `{ text, author, word_count, reading_time, excerpt, extracted_at, method }`
  8. Set `content_status='success'` / `'failed'`
  9. Backfill `excerpt` if Readability found one and it's empty
- **Imports** (ESM CDN, same pattern as save-bookmark):
  - `@supabase/supabase-js@2`
  - `@mozilla/readability@0.5.0`
  - `linkedom@0.16.11`
- **Text cap**: 100KB per bookmark
- **Technical note**: Set `document.documentURI = bookmark.url` before passing to Readability (it expects this)

### 3. TypeScript Types — `src/types/index.ts`

```typescript
export type ContentStatus = 'pending' | 'extracting' | 'success' | 'failed' | 'skipped';

export interface BookmarkContent {
  text?: string;
  author?: string;
  word_count?: number;
  reading_time?: number;
  lead_image?: string;
  excerpt?: string;
  extracted_at?: string;
  method?: 'readability' | 'failed';
  error?: string;
}
```

Extend `Bookmark` with `content: BookmarkContent`, `content_status: ContentStatus`, `content_fetched_at: string | null`.

### 4. Client Hook — `src/hooks/useBookmarks.ts`

- Add `triggerExtraction(bookmark)` — calls `db.functions.invoke('extract-content', { body: { bookmark_id } })`
- Skip in demo mode and for YouTube/Twitter
- Fire-and-forget, invalidates query on success
- Wired into `addBookmark.onSuccess` (after `autoFetchMetadata`)
- Wired into `refreshMetadata` (refresh button also re-extracts)
- Update `normalizeBookmark` for new fields

### 5. Mock Supabase — `src/lib/mock-supabase.ts`

Add `functions: { invoke: async () => ({ data: null, error: null }) }` to mock object. Without this, demo mode crashes when `triggerExtraction` calls `db.functions.invoke()`.

### 6. Demo Data — `src/lib/demo-data.ts`

Add `content: {}`, `content_status: 'pending'`, `content_fetched_at: null` to all demo bookmarks. Set 1-2 blog bookmarks to `content_status: 'success'` with sample content for UI testing.

### 7. UI Indicator — `src/components/detail/MetadataHeader.tsx`

In the badges row, after the synced badge:
- `extracting` → spinning icon + "Extracting..."
- `success` + word_count → green "X words extracted" with FileText icon
- `failed` → red "Extract failed — retry" button (reuses `onRefreshMetadata`)
- `pending`/`skipped` → nothing shown

---

## Files

| File | Action |
|------|--------|
| `sql/migrations/005_add_content_extraction.sql` | CREATE |
| `supabase/functions/extract-content/index.ts` | CREATE |
| `sql/setup.sql` | MODIFY — add 3 columns |
| `src/types/index.ts` | MODIFY — add types, extend Bookmark |
| `src/hooks/useBookmarks.ts` | MODIFY — add triggerExtraction |
| `src/lib/mock-supabase.ts` | MODIFY — add functions.invoke stub |
| `src/lib/demo-data.ts` | MODIFY — add new fields |
| `src/components/detail/MetadataHeader.tsx` | MODIFY — status indicator |

## Implementation Order

1. SQL migration → run in Supabase SQL editor
2. Update `setup.sql`
3. TypeScript types
4. Demo data + mock supabase
5. Edge function
6. Client hook integration
7. MetadataHeader UI
8. Quality pipeline (format → lint → typecheck → build)
9. Deploy: `npx supabase functions deploy extract-content`
10. Test end-to-end

## Verification

1. Deploy succeeds
2. curl test edge function with a blog bookmark → content_status becomes 'success'
3. Add blog bookmark in UI → extraction triggers automatically
4. Detail panel shows "X words extracted" badge
5. YouTube bookmark → content_status = 'skipped'
6. Demo mode doesn't crash
7. Refresh metadata button also triggers extraction
8. Quality pipeline passes
