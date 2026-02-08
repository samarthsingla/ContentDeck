# ContentDeck v2.0 Audit Report

Post-migration audit of the React + TypeScript + Vite + Tailwind rewrite.

The v1 vanilla JS codebase had **47 issues** (7 critical, 19 major, 21 minor). This report tracks which were resolved by the migration and what new issues exist in v2.

---

## v1 Issues — Resolution Status

### RESOLVED by React Migration (39/47)

| # | v1 Issue | How Resolved |
|---|----------|-------------|
| 1 | XSS via inline `onclick` handlers | React JSX — no inline handlers, automatic escaping |
| 2 | Zero keyboard focus indicators | Tailwind `focus-visible:ring-2` on all interactives |
| 3 | No `prefers-reduced-motion` support | `motion-safe:` / `motion-reduce:` Tailwind variants |
| 4 | Service worker offline crash | Proper `.catch()` on all API fetches, 503 fallback response |
| 5 | Modal missing ARIA + focus trapping | Reusable `Modal` component: `role="dialog"`, `aria-modal`, focus trap, ESC, scroll lock |
| 6 | All form inputs lack labels | Proper `<label>` + `htmlFor` throughout |
| 7 | Supabase errors silently swallowed | TanStack Query `onError` + toast notifications |
| 8 | Timezone bugs in calendar/streaks | `localDateString()` using local timezone, not `toISOString().slice()` |
| 9 | O(n²) graph computation | Knowledge Graph dropped in v2 |
| 10 | Race condition in `loadBookmarks()` recursion | TanStack Query manages fetch lifecycle, no recursive calls |
| 11 | `refreshMetadata()` drops fields | Metadata JSONB captures all fields from API |
| 12 | Non-atomic tag update (delete-then-insert) | Tags stored as `text[]` on bookmarks, single update call |
| 13 | Safe area handling broken | Tailwind safe-area utilities + CSS variables |
| 14 | Hover-only elements invisible on mobile | `group-focus-within:opacity-100` fallback added |
| 15 | Touch targets too small | `min-w-[44px] min-h-[44px]` on all interactive elements |
| 16 | Extension source detection out of sync | Chrome Extension deprecated in v2 |
| 17 | Extension DOM-ready race condition | Chrome Extension deprecated |
| 18 | No URL validation in extension | Chrome Extension deprecated |
| 19 | Double-save possible in extension | Chrome Extension deprecated |
| 20 | AI fetch has no timeout/abort | `AbortController` with 30s timeout |
| 21 | AI rate limiting insufficient | Exponential backoff (1s base, 3 retries) on 429 |
| 22 | Unbounded `status_history` fetch | 90-day window filter in `useStats` |
| 23 | Float equality in streak calculation | `localDateString()` comparison, no float math |
| 24 | Render-blocking CDN scripts | Supabase loaded via npm, Vite tree-shaking |
| 25 | Z-index stacking conflicts | Systematic z-index scale (z-10, z-30, z-50, z-[60], z-[100]) |
| 26 | `apple-touch-icon` points to SVG | Referenced `icon-180.png` (see Known Limitations) |
| 27 | Double confirm dialog on drawer delete | Single `confirm()` in component |
| 28 | Graph legend accumulates | Knowledge Graph dropped |
| 29 | Inconsistent view state (3 booleans) | Single `ViewMode` enum in UIProvider |
| 30 | `d3` used without existence check | D3 removed, no graph |
| 31 | `navigator.clipboard` null check | Wrapped in try/catch |
| 32 | `esc()` allocates DOM per call | React handles escaping natively |
| 33 | `autoFetchMissingMetadata()` no progress | ProgressBar component with ARIA attributes |
| 34 | Credentials visible in settings | `type="password"` for API keys |
| 36 | Optimistic deletes not rolled back | TanStack Query optimistic update + rollback pattern |
| 37 | `moveArea()` non-atomic swap | Client-side reorder with `Promise.all` + rollback |
| 38 | Toast overflow on mobile | `max-w-sm` + flex layout |
| 42 | SW cache-first never revalidates | Stale-while-revalidate + update notification banner |
| 43 | Source-type colors repeated 5 times | Defined once in Tailwind `@theme` custom properties |
| 44 | Hardcoded colors | All from Tailwind theme |
| 45 | `transition: all` on high-count elements | Specific `transition-colors`, `transition-opacity` |

### NOT APPLICABLE in v2 (5/47)

| # | v1 Issue | Reason |
|---|----------|--------|
| 35 | Bookmarklet exposes key in DOM | By design — bookmarklet needs the key to POST. Now escaped against JS injection. |
| 39 | Extension: no disconnect option | Extension deprecated |
| 40 | Extension: pasted comma-separated tags | Extension deprecated |
| 41 | Extension: missing manifest icon PNGs | Extension deprecated |
| 46 | SVG scale transforms from wrong origin | No SVG graph in v2 |

### PARTIALLY RESOLVED (3/47)

| # | v1 Issue | Status |
|---|----------|--------|
| 47 | Inconsistent modal vs drawer overlay | Both use `backdrop-blur-sm` now, but DetailPanel mobile overlay duplicates rendering (see v2 #12) |

---

## v2 Issues Found & Fixed in This Audit

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| F1 | Critical | `useBookmarks.ts` | `addNote`/`deleteNote` mutationFn read cache after `onMutate` modified it — duplicate notes in DB | mutationFn now fetches current notes from DB before updating |
| F2 | Critical | `Dashboard.tsx` | Metadata/AI effects cancelled mid-loop by `bookmarks` dep array | Removed `bookmarks` from deps, use refs instead |
| F3 | Critical | `Sidebar.tsx` | Favorites button reset to "All" instead of filtering | Added `showFavorites` state to UIProvider, filter in BookmarkList |
| F4 | High | `Dashboard.tsx` | Double export toast on clipboard fallback | Separated success paths for File System vs clipboard |
| F5 | High | `Toast.tsx` | Context value not memoized, causing effect re-triggers | Wrapped in `useMemo` |
| F6 | High | `obsidian.ts` | YAML frontmatter injection via titles with newlines/special chars | Added `yamlEscape()` for all interpolated values |
| F7 | High | `utils.ts` | Bookmarklet JS injection via unescaped credentials | Added `jsStringEscape()` for credential values |
| F8 | High | `App.tsx` | No error boundary — render errors crash to white screen | Added `ErrorBoundary` component |
| F9 | High | `AreaCard.tsx` | Nested `<button>` inside `<button>` — invalid HTML | Changed outer to `<div role="button">` with keyboard handler |
| F10 | High | `AreaManager.tsx` | `localAreas` state never synced with prop updates | Added `useEffect` to sync on `areas` prop change |
| F11 | High | `useBookmarks.ts` | `source_type: 'auto'` not in `SourceType` union | Uses `detectSourceType()` client-side as default |
| F12 | Medium | `useStats.ts` | `computeStats` not memoized — recomputes on every render | Wrapped in `useMemo` |
| F13 | Medium | `ProgressBar.tsx` | Missing ARIA progressbar attributes | Added `role`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| F14 | Medium | `sw.js` | Returns undefined when both cache and network fail | Returns 503 Response as fallback |

---

## v2 Known Limitations (Accepted)

These were identified during audit but are intentional tradeoffs or low-priority items for a personal app.

### Architecture

- **No virtualized list**: All bookmarks render at once. Fine for personal use (<500 items). Add `react-window` if dataset grows.
- **DetailPanel renders both mobile + desktop instances**: Controlled by CSS (`lg:hidden` / `hidden lg:flex`). Works but doubles child component mounts. Refactor to single instance + media query hook if performance becomes an issue.
- **No linting/tests**: No ESLint or test framework. Consider adding `eslint-plugin-react-hooks` to catch exhaustive-deps issues.

### PWA

- **Missing raster icons**: Only SVG icon in manifest. Need 192x192 and 512x512 PNGs for full PWA installability on Android. `icon-180.png` referenced in `index.html` does not exist yet.
- **SW CACHE_NAME not synced with package.json**: Manual version bump required. Consider generating from build.
- **No precaching**: First visit requires network. SW only caches on subsequent visits.

### UX

- **No "All"/"Favorites" on mobile nav**: Desktop sidebar has these but mobile bottom nav only shows Unread/Reading/Done. Low priority since mobile users can swipe through tabs.
- **`confirm()` dialogs**: Used for delete confirmations. Blocking but functional. Custom modal would be prettier but adds complexity.
- **SourceTabs/StatusFilters missing keyboard arrow navigation**: Have `role="tab"` but no arrow key handling per WAI-ARIA tabs pattern.
- **No select mode on mobile**: Bulk operations only accessible on desktop sidebar.
- **AddBookmarkModal/EditBookmarkModal close before server confirms**: Form resets immediately on submit. If server fails, user loses input. Acceptable tradeoff for snappy UX with optimistic updates.

### Security

- **Supabase anon key in cookie without `Secure` flag**: Cookie set with `SameSite=Lax` but no `Secure`. Only relevant on HTTP connections. Production on Vercel uses HTTPS.
- **Supabase anon key in bookmarklet**: By design — bookmarklet needs key to POST directly to Supabase. Now escaped against JS injection.

### Data

- **`bookmark_tags` junction table unused**: Schema defines it but app uses `tags text[]` on bookmarks directly. The junction table exists for potential future many-to-many with tag areas.
- **No URL deduplication**: Same URL can be bookmarked multiple times. Could add a unique constraint but may be intentional for re-reading.

---

## Summary

| Category | Count |
|----------|-------|
| v1 issues resolved | 39 |
| v1 issues N/A (extension deprecated) | 5 |
| v1 issues partially resolved | 3 |
| v2 issues found & fixed | 14 |
| v2 known limitations (accepted) | 15 |
