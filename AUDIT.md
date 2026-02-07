# ContentDeck Codebase Audit Report

Full review of all source files. Findings grouped by priority, with file/line references.

---

## CRITICAL (Must Fix)

### 1. XSS via inline `onclick` handlers
**app.js:697, 701-705, 891, 2467** — `esc()` escapes HTML entities but NOT single quotes inside `onclick` JS string literals. The browser decodes `&#39;` back to `'` before executing JS, so a tag like `Tag's Name` or an AI suggestion with a quote breaks out of the string. This is exploitable XSS.

### 2. Zero keyboard focus indicators
**style.css** (throughout) — `outline: none` on inputs (lines 100, 407, 442) with no replacement. 14+ interactive elements (`.icon-btn`, `.tab`, `.status-filter`, `.tag-pill`, `.fab`, `.btn`, `.drawer-close`, etc.) have **no focus styles at all**. The app is unusable for keyboard-only users. WCAG 2.4.7 failure.

### 3. No `prefers-reduced-motion` support
**style.css** — Six animations (`cardIn`, `fadeIn`, `slideUp`, `toastIn`, `toastOut`, `spin`) with no `@media (prefers-reduced-motion: reduce)` override anywhere. `cardIn` runs on every bookmark card with staggered delays. WCAG 2.3.3 failure.

### 4. Service worker offline crash
**sw.js:31-33** — API calls (Supabase/OpenRouter) use `fetch()` with no `.catch()`. Going offline while any API call is in-flight produces an unhandled rejection. The PWA shell loads but all data operations crash with a browser-level error.

### 5. Modal/drawer missing ARIA and focus trapping
**index.html:169-178** — Modal overlay and detail drawer have no `role="dialog"`, `aria-modal="true"`, or `aria-labelledby`. No focus trapping — Tab key escapes into hidden background content. No scroll lock on body when open.

### 6. All form inputs lack proper labels
**index.html:26-27, app.js:749-766, 936-957** — Setup inputs and dynamically generated modal inputs rely solely on `placeholder` text. No `<label>`, `aria-label`, or `aria-labelledby`. Screen readers cannot identify any form field.

### 7. Supabase errors silently swallowed
**stats.js:9-15, app.js:288-294** — `loadHistory()` and `loadTagAreas()` destructure only `{ data }`, ignoring `{ error }`. Network failures or missing tables silently produce empty data. `loadBookmarks()` chain at line 71 has no `.catch()`.

---

## MAJOR (Should Fix Soon)

### 8. Timezone bugs in calendar and streaks
**app.js:1209, stats.js:70-95** — Both use `toISOString().slice(0,10)` which returns UTC dates. Users in non-UTC timezones see bookmarks on wrong days in Daily Notes view. Streak calculations count late-night activity on the wrong day.

### 9. O(n^2) graph computation
**app.js:1380-1413** — Nested loop with tag comparison: 500 bookmarks = ~3.1M operations, 1000 bookmarks = ~12.5M. Freezes the UI thread.

### 10. Race condition in `loadBookmarks()` recursion
**app.js:284-285, 525** — `loadBookmarks()` calls `autoFetchMissingMetadata()` and `autoTagUntaggedBookmarks()`, both of which call `loadBookmarks()` again. The guard flag prevents infinite loops but causes double-fetching.

### 11. `refreshMetadata()` drops fields
**app.js:1130-1160** — Handles `title`, `image`, `duration`, `channel` but silently drops `excerpt`, `word_count`, `reading_time` even though `fetchMetadata()` returns them.

### 12. Non-atomic tag update (delete-then-insert)
**app.js:997-1005** — `handleEdit()` deletes all `bookmark_tags` then inserts new ones. If insert fails after delete succeeds, bookmark permanently loses all tags.

### 13. Safe area handling broken on notched devices
**style.css:1521-1528, 1734-1740** — `.daily-view` and `.graph-view` use hardcoded `top: 60px` ignoring `var(--safe-top)`. Overlap the header on notched iPhones. `.daily-view` also missing `padding-bottom` for home indicator.

### 14. Hover-only elements invisible on mobile
**style.css:293-298, 304-308** — `.area-edit-btn` and `.area-sort-btns` are only visible on `:hover`. No mobile override exists (unlike `.refresh-btn`/`.edit-btn` which have one). Area cards cannot be edited or reordered on touch devices.

### 15. Touch targets too small
**style.css** — `.area-sort-btn` (~18x12px), `.area-edit-btn` (~20x14px), `.delete-btn` (~20x17px), `.active-tag .remove-tag` (~12x14px) — all well below the 44x44px minimum.

### 16. Extension source detection out of sync
**extension/popup.js:10-15** — Missing patterns: `youtube.app.goo.gl`, `t.co`, `lnkd.in`. Also missing `book` source type entirely. Users see "Blog" badge in extension for URLs the dashboard correctly categorizes.

### 17. Extension DOM-ready race condition
**extension/popup.js:198-218** — Event listeners bind at script parse time (outside `DOMContentLoaded` callback). If `$()` returns `null`, all subsequent listener registrations throw and fail silently.

### 18. No URL validation in extension
**extension/popup.js:79-98** — Can save `chrome://`, `about:blank`, `file:///` URLs to the database.

### 19. Double-save possible in extension
**extension/popup.js:149-150** — Save button re-enables on success path before `window.close()` fires (1 second delay). User can click again and create duplicate.

### 20. AI fetch has no timeout/abort
**ai.js:84** — No `AbortController`. If OpenRouter is unresponsive, the fetch hangs indefinitely. Bulk retag (line 129-142) has no cancellation — user starts 200 bookmarks, can't stop it.

### 21. AI rate limiting insufficient
**ai.js:140** — 500ms between requests, but OpenRouter free tier often allows only ~10 req/min. No retry logic on 429 errors.

### 22. Unbounded `status_history` fetch
**stats.js:10-13** — Fetches entire table with no `.limit()` or date filter. Grows unboundedly over time.

### 23. Float equality in streak calculation
**stats.js:89-92** — `diff === 1` uses exact floating-point comparison. Should use `Math.round(diff) === 1`.

### 24. Render-blocking CDN scripts
**index.html:180-181** — Supabase JS and D3.js loaded synchronously from CDN with no `defer`/`async`. No fallback if CDN is down.

### 25. Z-index stacking conflicts
**style.css** — `.graph-tooltip` and `.modal-overlay` both use `z-index: 100`. FAB and view overlays both use `z-index: 10`.

### 26. `apple-touch-icon` points to SVG
**index.html:12** — iOS doesn't support SVG for apple-touch-icon. Needs a 180x180 PNG.

---

## MINOR (Fix When Convenient)

### 27. Double confirm dialog on drawer delete
**app.js:2469 + 1114** — Drawer onclick has `confirm('Delete?')`, then `deleteBookmark()` shows `confirm('Delete this bookmark?')` again.

### 28. Graph legend accumulates
**app.js:1495-1502** — Each `renderGraph()` call appends a new legend div without clearing old ones.

### 29. Inconsistent view state (3 booleans)
**app.js:115-138** — `currentView`, `graphVisible`, `dailyVisible` can get out of sync. Opening graph doesn't check/clear daily state.

### 30. `d3` used without existence check
**app.js:1356** — If D3 CDN fails to load, clicking graph throws `ReferenceError` with no user message.

### 31. `navigator.clipboard` null check missing
**app.js:2096-2100** — `navigator.clipboard` is `undefined` in non-secure (HTTP) contexts. `.writeText()` on `undefined` throws synchronous TypeError.

### 32. `esc()` allocates DOM element per call
**app.js:2330-2335** — Creates a `<div>` for every escape call. ~2000-3000 allocations per render with 200 bookmarks.

### 33. `autoFetchMissingMetadata()` runs silently
**app.js:314-336** — Sequential fetch for N bookmarks with no progress indicator. 50 bookmarks = 2+ minutes of invisible work.

### 34. Credentials visible in settings modal
**app.js:1941** — Supabase key uses `type="text"` (visible) while AI key correctly uses `type="password"`.

### 35. Bookmarklet exposes key in DOM
**app.js:2302-2304** — Supabase key embedded in bookmarklet `href` attribute, visible in DOM inspector.

### 36. Optimistic deletes not properly rolled back
**app.js:1113-1128** — Item removed from `allBookmarks` immediately, but if DB delete fails, `loadBookmarks()` is fire-and-forget — stale state visible briefly.

### 37. `moveArea()` non-atomic swap
**app.js:1760-1774** — Two separate DB updates for sort_order swap. If second fails, two areas share same sort_order.

### 38. Toast overflow on mobile
**style.css:1475** — `white-space: nowrap` with no `max-width`. Long messages overflow viewport.

### 39. Extension: no disconnect/reset option
**extension/popup.html** — Once connected, no UI to change or clear Supabase credentials.

### 40. Extension: pasted comma-separated tags not split
**extension/popup.js:204-211** — Only keypress commas trigger tag splitting; paste is not handled.

### 41. Extension: missing manifest icon PNGs
**extension/manifest.json:12-15** — References `icon16.png`, `icon48.png`, `icon128.png` but these files don't exist.

### 42. Service worker cache-first never revalidates
**sw.js:37-39** — Cached assets served forever until `CACHE_NAME` is manually bumped. No update notification to user.

### 43. Source-type colors repeated 5 times
**style.css:655, 709, 1708, 2018, 2037** — Same youtube/twitter/linkedin/substack/blog color mapping duplicated. Adding a source type requires 5 edits.

### 44. Hardcoded colors instead of CSS variables
**style.css:1465, 2087, 2108-2111, 2234-2236** — Toast background, reading-time badge, drawer note borders, Obsidian button all use raw hex instead of defined variables.

### 45. `transition: all 0.2s` on high-count elements
**style.css:485, 528, 1599** — On tabs, status filters, and 42 daily-calendar cells. Should specify only properties that change.

### 46. SVG scale transforms from wrong origin
**style.css:1777-1784** — `.graph-node:hover` uses `scale(1.1)` but SVG defaults `transform-origin` to viewport `(0,0)`, not element center.

### 47. Inconsistent modal vs drawer overlay style
**style.css:1889-1900 vs 918-929** — Modal has `backdrop-filter: blur(6px)`, drawer does not. Different opacity values.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 7 |
| Major    | 19 |
| Minor    | 21 |
| **Total** | **47** |

### Top Themes

1. **Accessibility is near-zero** — No focus styles, no ARIA, no labels, no motion respect, no skip nav. The app fails basic WCAG 2.1 AA across the board.
2. **Error handling is sparse** — Supabase errors silently swallowed, API calls without catch/timeout, optimistic updates not rolled back.
3. **Mobile experience is incomplete** — Hover-only elements invisible on touch, safe area gaps, tiny touch targets, toast overflow.
4. **XSS vector in inline handlers** — Using `onclick` with string interpolation throughout the codebase is inherently unsafe.
5. **State management is fragile** — 3 view booleans, recursive `loadBookmarks()`, no loading states for long operations.
6. **Extension is out of sync with main app** — Different source patterns, missing fields, no duplicate detection.
