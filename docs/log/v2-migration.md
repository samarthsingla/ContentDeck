# ContentDeck v2.0 — React Migration Plan

## Context

ContentDeck is a personal content bookmarking PWA (vanilla JS, ~5000 lines) with 47 known issues from audit including XSS vulnerabilities, zero accessibility, race conditions, and broken mobile UX. The codebase has reached a point where incremental fixes can't address structural problems (2500-line single file, inline onclick handlers, ad-hoc state management).

This plan migrates to React + Vite + Tailwind + TypeScript in 4 shippable phases, preserving all existing features except Knowledge Graph (moved to Obsidian) and Chrome Extension (deprecated).

---

## Decisions Summary

| Decision | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v4 + dark/light mode |
| State | TanStack Query (server) + React Context (UI) |
| Icons | Lucide React |
| Auth | None — keep anon key in localStorage |
| AI | OpenRouter (client-side, user API key) |
| Reader Mode | No — link out to original |
| Routing | No router — state-based views |
| Knowledge Graph | Dropped |
| Chrome Extension | Deprecated |
| Status Model | unread → reading → done + is_favorited boolean |
| Notes | JSONB array on bookmarks: [{type, content, created_at}] |

---

## Project Structure

```
contentdeck/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── icon.svg
│   ├── manifest.json
│   └── sw.js
├── sql/
│   ├── setup.sql              (clean v2 schema)
│   └── migrate-from-v1.sql    (if ever needed)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css               (Tailwind directives + CSS vars)
│   ├── types/
│   │   └── index.ts            (Bookmark, TagArea, Note, etc.)
│   ├── lib/
│   │   ├── supabase.ts         (client init + credential helpers)
│   │   ├── metadata.ts         (YouTube oEmbed, Twitter oEmbed, Microlink)
│   │   ├── ai.ts               (OpenRouter integration)
│   │   ├── obsidian.ts         (markdown generation + File System API)
│   │   └── utils.ts            (escaping, date formatting, source detection)
│   ├── hooks/
│   │   ├── useBookmarks.ts     (TanStack Query: fetch, add, edit, delete, cycle status)
│   │   ├── useTagAreas.ts      (TanStack Query: CRUD for tag areas)
│   │   ├── useStats.ts         (TanStack Query: status_history + computed stats)
│   │   ├── useCredentials.ts   (localStorage + cookie read/write)
│   │   └── useTheme.ts         (dark/light mode, system detection, localStorage)
│   ├── context/
│   │   ├── SupabaseProvider.tsx (provides db client to tree)
│   │   └── UIProvider.tsx       (currentView, filters, search, selectMode)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          (desktop left nav)
│   │   │   ├── MobileHeader.tsx     (mobile top bar)
│   │   │   ├── MobileNav.tsx        (mobile bottom nav)
│   │   │   └── AppShell.tsx         (responsive shell: sidebar+main or mobile)
│   │   ├── setup/
│   │   │   └── SetupScreen.tsx      (credential entry form)
│   │   ├── feed/
│   │   │   ├── BookmarkCard.tsx     (single bookmark card)
│   │   │   ├── BookmarkList.tsx     (scrollable list of cards)
│   │   │   ├── SourceTabs.tsx       (all/youtube/twitter/... with counts)
│   │   │   ├── StatusFilters.tsx    (unread/reading/done with counts)
│   │   │   ├── SearchBar.tsx        (debounced search input)
│   │   │   ├── SortSelect.tsx       (newest/oldest/title dropdown)
│   │   │   └── FeedToolbar.tsx      (search + sort + view toggle row)
│   │   ├── areas/
│   │   │   ├── AreaCard.tsx         (tag area card with count + emoji)
│   │   │   ├── AreasView.tsx        (grid of area cards)
│   │   │   └── AreaManager.tsx      (CRUD modal for areas)
│   │   ├── detail/
│   │   │   ├── DetailPanel.tsx      (desktop right column / mobile modal)
│   │   │   ├── MetadataHeader.tsx   (favicon, domain, reading stats, status pill)
│   │   │   ├── NotesTab.tsx         (notes timeline + composer)
│   │   │   ├── NoteComposer.tsx     (type toggles + text input)
│   │   │   ├── NoteCard.tsx         (single note with type icon/color)
│   │   │   └── DetailActions.tsx    (open link, export, delete)
│   │   ├── modals/
│   │   │   ├── Modal.tsx            (reusable: overlay, focus trap, ESC, ARIA)
│   │   │   ├── AddBookmarkModal.tsx
│   │   │   ├── EditBookmarkModal.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── StatsModal.tsx
│   │   │   └── BulkActionBar.tsx
│   │   └── ui/
│   │       ├── Toast.tsx            (notification system)
│   │       ├── Button.tsx           (variants: primary, danger, ghost)
│   │       ├── Badge.tsx            (source type + status badges)
│   │       ├── Spinner.tsx
│   │       └── EmptyState.tsx
│   └── pages/
│       └── Dashboard.tsx            (orchestrates sidebar + feed + detail)
├── CLAUDE.md
├── AUDIT.md
└── README.md
```

---

## Database Schema (v2 — clean setup)

```sql
-- sql/setup.sql

-- Bookmarks table
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text,
  image text,
  excerpt text,                          -- AI-generated summary
  source_type text default 'auto',       -- youtube, twitter, linkedin, substack, blog, book
  status text default 'unread' check (status in ('unread', 'reading', 'done')),
  is_favorited boolean default false,
  notes jsonb default '[]'::jsonb,       -- [{type, content, created_at}]
  tags text[] default '{}',              -- flat tag array (legacy compat)
  metadata jsonb default '{}'::jsonb,    -- {duration, channel, word_count, reading_time, ...}
  synced boolean default false,          -- Obsidian sync tracking
  created_at timestamptz default now(),
  status_changed_at timestamptz default now(),
  started_reading_at timestamptz,
  finished_at timestamptz
);

create index idx_bookmarks_source on bookmarks(source_type);
create index idx_bookmarks_status on bookmarks(status);
create index idx_bookmarks_created on bookmarks(created_at desc);

-- Tag areas
create table tag_areas (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  color text,
  emoji text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Junction table
create table bookmark_tags (
  bookmark_id uuid references bookmarks(id) on delete cascade,
  tag_area_id uuid references tag_areas(id) on delete cascade,
  primary key (bookmark_id, tag_area_id)
);

-- Status history (for streaks/stats)
create table status_history (
  id uuid primary key default gen_random_uuid(),
  bookmark_id uuid references bookmarks(id) on delete cascade,
  old_status text,
  new_status text,
  changed_at timestamptz default now()
);

-- Auto-detect source type trigger (case-insensitive)
create or replace function detect_source_type()
returns trigger as $$
begin
  if NEW.source_type is null or NEW.source_type = 'auto' then
    if NEW.url ~* 'youtube\.com|youtu\.be|youtube\.app\.goo\.gl' then
      NEW.source_type := 'youtube';
    elsif NEW.url ~* 'twitter\.com|x\.com|t\.co' then
      NEW.source_type := 'twitter';
    elsif NEW.url ~* 'linkedin\.com|lnkd\.in' then
      NEW.source_type := 'linkedin';
    elsif NEW.url ~* 'substack\.com' then
      NEW.source_type := 'substack';
    else
      NEW.source_type := 'blog';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger auto_detect_source
  before insert on bookmarks
  for each row execute function detect_source_type();

-- Status history trigger
create or replace function track_status_change()
returns trigger as $$
begin
  if OLD.status is distinct from NEW.status then
    insert into status_history (bookmark_id, old_status, new_status)
    values (NEW.id, OLD.status, NEW.status);
    NEW.status_changed_at := now();
    if NEW.status = 'reading' and OLD.status = 'unread' then
      NEW.started_reading_at := now();
    end if;
    if NEW.status = 'done' and OLD.status != 'done' then
      NEW.finished_at := now();
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger on_status_change
  before update on bookmarks
  for each row execute function track_status_change();

-- RLS (open access since no auth)
alter table bookmarks enable row level security;
create policy "Allow all" on bookmarks for all using (true) with check (true);
alter table tag_areas enable row level security;
create policy "Allow all" on tag_areas for all using (true) with check (true);
alter table bookmark_tags enable row level security;
create policy "Allow all" on bookmark_tags for all using (true) with check (true);
alter table status_history enable row level security;
create policy "Allow all" on status_history for all using (true) with check (true);
```

Key schema changes from v1:
- `notes` is now JSONB on bookmarks (was separate table)
- `is_favorited` boolean added
- `synced` boolean added for Obsidian tracking
- `metadata` JSONB for extensible fields (duration, channel, word_count, reading_time)
- Source detection trigger includes `youtube.app.goo.gl`, `t.co`, `lnkd.in` (audit #16 fix)

---

## TanStack Query Patterns

```typescript
// Query keys
const queryKeys = {
  bookmarks: ['bookmarks'] as const,
  tagAreas: ['tagAreas'] as const,
  stats: ['stats'] as const,
};

// useBookmarks hook pattern
function useBookmarks() {
  const { db } = useSupabase();

  const query = useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: async () => {
      const { data, error } = await db
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Optimistic status cycling
  const cycleStatus = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      const { error } = await db
        .from('bookmarks')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bookmarks });
      const prev = queryClient.getQueryData(queryKeys.bookmarks);
      queryClient.setQueryData(queryKeys.bookmarks, (old) =>
        old.map(b => b.id === id ? { ...b, status: newStatus } : b)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeys.bookmarks, context.prev); // rollback
      toast.error('Update failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks }),
  });

  return { ...query, cycleStatus };
}
```

All mutations follow this pattern: optimistic update → rollback on error → invalidate on settle.

---

## Tailwind Theme

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',  // manual toggle + system detection
  theme: {
    extend: {
      colors: {
        // Zinc for neutrals (grays)
        // Indigo for primary accent
        // Keep semantic colors for source types
        source: {
          youtube: { bg: '#ff000018', text: '#ff4444' },
          twitter: { bg: '#1da1f218', text: '#1da1f2' },
          linkedin: { bg: '#0077b518', text: '#0077b5' },
          substack: { bg: '#ff681818', text: '#ff6818' },
          blog: { bg: '#6c63ff18', text: '#6c63ff' },
          book: { bg: '#4ecdc418', text: '#4ecdc4' },
        },
        note: {
          insight: '#fbbf24',   // amber
          question: '#f87171',  // red
          highlight: '#4ade80', // green
          note: '#818cf8',      // indigo
        },
      },
    },
  },
};
```

Source type colors defined ONCE (fixes audit #43 — currently duplicated 5 times in CSS).

---

## Phase 1 — Foundation + Core Feed

**Goal**: Get the React app running with basic bookmark management. Feature parity with v1's list view.

### Features
- [x] Vite + React + TypeScript + Tailwind scaffold
- [x] Setup screen (Supabase URL + anon key, stored in localStorage + cookie)
- [x] Supabase client initialization
- [x] Feed view: bookmark cards in scrollable list
- [x] Source tabs with counts (all, youtube, twitter, linkedin, substack, blog, book)
- [x] Status filters with counts (unread, reading, done)
- [x] Search (debounced 200ms)
- [x] Sort (newest, oldest, title)
- [x] Add bookmark modal (URL + title + source + tags + notes)
- [x] Delete bookmark (with confirm)
- [x] Status cycling (click badge: unread → reading → done)
- [x] Favorite toggle (heart icon on card)
- [x] Auto metadata fetching (YouTube oEmbed, Twitter oEmbed, Microlink)
- [x] Toast notification system
- [x] Dark/light mode (system detection + manual toggle, persisted)
- [x] Responsive layout: desktop 2-column (sidebar + feed), mobile single column
- [x] PWA manifest + basic service worker
- [x] Accessible: focus-visible styles on all interactives, proper form labels, ARIA on modals

### Components Built
`SetupScreen`, `AppShell`, `Sidebar`, `MobileHeader`, `MobileNav`, `BookmarkList`, `BookmarkCard`, `SourceTabs`, `StatusFilters`, `SearchBar`, `SortSelect`, `FeedToolbar`, `AddBookmarkModal`, `Modal` (reusable), `Toast`, `Button`, `Badge`, `Spinner`, `EmptyState`

### Hooks Built
`useBookmarks` (fetch + add + delete + cycleStatus + toggleFavorite), `useCredentials`, `useTheme`

### Lib Built
`supabase.ts`, `metadata.ts`, `utils.ts`

### Audit Issues Addressed
- #1 XSS (React JSX, no inline handlers)
- #2 Focus indicators (Tailwind `focus-visible:ring-2`)
- #3 Reduced motion (`motion-safe:` / `motion-reduce:` Tailwind variants)
- #4 Service worker offline handling (proper `.catch()` on API fetches)
- #5 Modal ARIA + focus trapping (reusable `Modal` component)
- #6 Form labels (proper `<label>` + `htmlFor`)
- #7 Error handling (TanStack Query `onError`, toast on failure)
- #8 Timezone fix (use `toLocaleDateString()` not `toISOString().slice()`)
- #24 Defer CDN scripts (Supabase loaded via npm, no CDN)
- #26 apple-touch-icon (generate PNG from SVG)

### Verification
- `npm run dev` — app loads, setup screen works
- Enter Supabase credentials → bookmarks load
- Add/delete/status cycle work with optimistic updates + rollback on error
- Dark/light toggle works, persists across refresh
- Mobile responsive: single column, no sidebar
- Tab through all interactive elements — focus ring visible
- Lighthouse PWA audit passes basic checks

---

## Phase 2 — Organization + Management

**Goal**: Tag system, areas view, bulk operations, settings. Full organizational capabilities.

### Features
- [x] Tag areas CRUD (create with name/emoji/color, edit, delete, reorder)
- [x] Areas view (tag-first grid with area cards showing bookmark counts)
- [x] View toggle (list vs areas), persisted in localStorage
- [x] Bookmark-tag associations (assign/remove areas in edit modal)
- [x] Filter by tag (click tag on card → filter feed)
- [x] Edit bookmark modal (all fields editable)
- [x] Bulk operations: select mode, bulk status change, bulk delete
- [x] Settings panel (credentials, AI key, YouTube key, Obsidian vault path, bookmarklet)
- [x] Bookmarklet generation (same approach, Supabase key embedded)
- [x] iOS Shortcut compatibility verified (POST still works unchanged)

### Components Built
`AreaCard`, `AreasView`, `AreaManager`, `EditBookmarkModal`, `SettingsModal`, `BulkActionBar`

### Hooks Built
`useTagAreas` (fetch + CRUD + reorder)

### Audit Issues Addressed
- #14 Hover-only elements (area edit/sort buttons visible on mobile via tap/long-press)
- #15 Touch targets (minimum 44x44px on all interactive elements)
- #29 View state consistency (single `currentView` state variable, no booleans)
- #37 moveArea atomicity (update both sort_orders in single call or handle errors)
- #43 Source colors (defined once in Tailwind config)
- #44 Hardcoded colors (all from Tailwind theme)

### Verification
- Create/edit/delete tag areas — changes persist
- Reorder areas — sort_order updates correctly
- Areas view shows correct bookmark counts per area
- Click area card → filters feed to that tag
- Bulk select → change status / delete → works with optimistic updates
- Settings: change credentials, generate bookmarklet, copy works
- iOS Shortcut POST creates bookmark visible in feed

---

## Phase 3 — Deep Work (The Differentiator)

**Goal**: Detail panel with enhanced note-taking, Obsidian export, statistics. This is what makes ContentDeck unique.

### Features
- [x] Detail panel: desktop = right column (3-col layout), mobile = full-screen slide-up modal
- [x] Metadata header: favicon, domain, reading stats (word count, reading time), status pill
- [x] Enhanced note composer with type toggles: 💡 Insight, ❓ Question, 🖍️ Highlight, 📝 Note
- [x] Notes stored as JSONB array: [{type, content, created_at}]
- [x] Notes rendered as colored timeline cards, grouped or chronological
- [x] Obsidian export — single item: generates markdown with YAML frontmatter + structured notes
- [x] Obsidian export — batch: `window.showDirectoryPicker()` for desktop, clipboard fallback for mobile/Firefox/Safari
- [x] Synced tracking: `synced=true` after export, visual indicator on cards
- [x] Statistics modal: completed this week/month, current streak, avg completion time, per-tag breakdown, daily chart
- [x] Status history tracking (existing DB trigger)

### Components Built
`DetailPanel`, `MetadataHeader`, `NotesTab`, `NoteComposer`, `NoteCard`, `DetailActions`, `StatsModal`

### Hooks Built
`useStats` (fetch status_history + compute streak/stats)

### Lib Built
`obsidian.ts` (markdown generation, File System API write, clipboard fallback)

### Note Composer UX Detail
```
┌─────────────────────────────────┐
│ [💡 Insight] [❓ Question]       │  ← type toggle buttons
│ [🖍️ Highlight] [📝 Note]        │
├─────────────────────────────────┤
│ Type your thought...            │  ← textarea, auto-grows
│                                 │
├─────────────────────────────────┤
│                      [Add Note] │  ← saves to JSONB array
└─────────────────────────────────┘

Notes Timeline:
┌──── 💡 ──────────────────────────┐
│ This article's key insight is... │
│ 2 hours ago                      │
├──── ❓ ──────────────────────────┤
│ How does this compare to...      │
│ 1 hour ago                       │
├──── 📝 ──────────────────────────┤
│ Follow up with the author        │
│ 30 min ago                       │
└──────────────────────────────────┘
```

### Audit Issues Addressed
- #8 Timezone bugs (local dates throughout stats + calendar)
- #11 refreshMetadata drops fields (metadata JSONB includes all fields)
- #22 Unbounded history fetch (add `.gte('changed_at', thirtyDaysAgo)`)
- #23 Float equality in streak (use `Math.round()`)
- #27 Double confirm dialog (single confirm in component)
- #34 Credentials visible (settings uses `type="password"` for keys)
- #36 Optimistic delete rollback (TanStack Query handles this)

### Verification
- Click bookmark → detail panel opens (desktop: right column, mobile: modal)
- Add notes with different types → saved to DB as JSONB → rendered as timeline
- Export single bookmark to Obsidian → correct markdown with frontmatter + notes
- Batch export → File picker opens (Chrome/Edge), clipboard fallback (Firefox/Safari/mobile)
- Stats modal shows accurate streak, weekly/monthly counts
- Streak calculation correct across timezone boundaries

---

## Phase 4 — Intelligence + Polish

**Goal**: AI features, keyboard shortcuts, accessibility audit, performance, mobile polish.

### Features
- [x] AI auto-tagging on new bookmarks (OpenRouter, user-provided API key)
- [x] AI area suggestion (when no area fits)
- [x] Bulk re-tag operation with progress indicator and cancellation
- [x] AI rate limiting with retry logic (exponential backoff on 429)
- [x] Fetch timeout/abort (AbortController, 30s timeout)
- [x] Keyboard shortcuts: `/` focus search, `n` new bookmark, `j/k` navigate, `Esc` close panels
- [x] Auto-fetch missing metadata on load (with progress indicator)
- [x] Accessibility audit pass: screen reader testing, contrast ratios, skip nav link
- [x] Mobile polish: proper safe-area handling, adequate touch targets throughout
- [x] Performance: virtualized list for 500+ bookmarks (react-window or similar)
- [x] Service worker: proper cache versioning, update notification banner

### Lib Updated
`ai.ts` (OpenRouter with AbortController, retry logic, cancellation support)

### Audit Issues Addressed
- #9 O(n²) computation (removed — no graph)
- #13 Safe area handling (Tailwind `safe-area` utilities)
- #20 AI no timeout (AbortController)
- #21 AI rate limiting (exponential backoff)
- #25 Z-index conflicts (systematic z-index scale in Tailwind config)
- #32 esc() allocations (React handles escaping)
- #33 autoFetch no progress (progress bar component)
- #38 Toast overflow (max-width + text-wrap)
- #42 SW never revalidates (stale-while-revalidate strategy + update banner)
- #45 transition: all (specific properties only)

### Verification
- Add bookmark → AI suggests tags after save → toast shows suggestions
- Bulk re-tag: start → shows progress → cancel mid-way → stops cleanly
- Keyboard shortcuts work throughout (test with screen reader)
- Lighthouse accessibility score > 90
- Lighthouse performance score > 90
- Test on iPhone Safari: safe areas correct, touch targets adequate
- Test with 500+ bookmarks: smooth scrolling, no jank

---

## Files Modified/Created Summary

### New (React app)
- Everything under `src/` (~40 files)
- `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `package.json`
- `sql/setup.sql` (clean v2 schema)

### Preserved
- `CLAUDE.md` (updated for new stack)
- `AUDIT.md` (reference during build)
- `manifest.json` (updated paths)
- `icon.svg`
- iOS Shortcut (unchanged — same Supabase API)
- Bookmarklet pattern (same approach)

### Deprecated/Removed
- `app.js`, `ai.js`, `stats.js`, `style.css`, `index.html` (replaced by React app)
- `sw.js` (rewritten)
- `extension/` (deprecated)
- `setup.sql`, `setup-v3.sql`, `migrate-*.sql`, `fix-sources.sql` (replaced by `sql/setup.sql`)

### Updated
- `CLAUDE.md` — updated for React + Vite + Tailwind stack, new commands
- `.gitignore` — add `node_modules/`, `dist/`, `.env`
