# feat/12-notes Branch Log

Branch: `feat/12-notes`
GitHub Issue: #12 — feat: notes list, editor, bookmark linking, and export (phases 2.2–2.5)
Started: 2026-02-20

## Steps Completed

### Step 1 — Types + ViewMode + Sidebar + NotesList (Phase 2.2) ✅
- Fixed duplicate `StandaloneNote`, `NoteBookmark`, `NoteTag` types in `src/types/index.ts`
- Added `'notes'` to `ViewMode` union
- Added Notes nav button to Sidebar (with noteCount prop)
- AppShell threads noteCount to both Sidebar and MobileNav
- MobileNav: Notes tab added (FileText icon, 56px, aria-current)
- Created `src/components/notes/StandaloneNoteCard.tsx` — role=button, area pills, linked count, delete confirm
- Created `src/components/notes/NotesList.tsx` — grid layout, search filter via useUI, empty state, loading
- Dashboard: useNotes hook, notes view conditional, noteCount threaded

### Step 2 — TipTap Editor + NoteEditorModal + Auto-save (Phase 2.3) ✅
- Created `src/components/notes/TipTapEditor.tsx` — TipTap with StarterKit + Link + Placeholder; toolbar with aria-label + aria-pressed; lazy-loadable chunk
- Created `src/components/notes/NoteEditorModal.tsx` — React.lazy TipTapEditor, auto-save debounce 1000ms, Saving/Saved indicator, export button, ESC close, flush on close
- NoteCard: added `onPromote` prop (ArrowUpRight button)
- NotesTab: added `onPromoteToNote` prop
- DetailPanel: added `linkedNotes`, `onPromoteToNote`, `onCreateNoteForBookmark`, `onOpenNote` props + linked notes section
- Dashboard: wires NoteEditorModal + `onCreate`/`onSave` handlers

### Step 3 — useNoteBookmarks + LinkedBookmarks + DetailPanel (Phase 2.4) ✅
- Created `src/hooks/useNoteBookmarks.ts` — two-step query (junction → bookmarks), linkBookmark/unlinkBookmark mutations
- Created `src/components/notes/LinkedBookmarks.tsx` — linked list + combobox search (role=combobox, listbox/option ARIA)
- Created `src/hooks/useLinkedNoteIds.ts` — thin hook for bookmark→notes reverse lookup
- NoteEditorModal: allBookmarks + initialBookmarkId props; link pending bookmark after create
- DetailPanel: linked notes section, onCreateNoteForBookmark, onOpenNote

### Step 4 — Areas + Export + Search + Tests + A11y (Phase 2.5) ✅
- Created `src/hooks/useNoteTags.ts` — mirrors useNoteBookmarks for note_tags
- NoteEditorModal: area picker (select dropdown, area chips with X to remove)
- Added `convertHtmlToMarkdown()` to `src/lib/utils.ts` (~25 lines)
- Export handler: converts HTML to Markdown, downloads .md file
- Verified NotesList search via searchQuery from useUI()
- A11y: role=button + keyboard handlers on NoteCard, toolbar aria-label + aria-pressed, role=combobox + role=listbox/option
- `vite.config.ts`: TipTap manual chunk (tiptap-*.js ~165KB gzip, separate from main bundle)

## Tests Added
- `src/components/__tests__/StandaloneNoteCard.test.tsx` — 7 cases
- `src/components/__tests__/NotesList.test.tsx` — 5 cases
- `src/hooks/__tests__/useNotes.test.ts` — 6 cases

## Quality Results
- format:check ✓
- lint: 0 errors ✓
- typecheck ✓
- test: 152/152 passing ✓ (+19 new tests)
- build ✓ (TipTap in separate chunk ~165KB gzip)
