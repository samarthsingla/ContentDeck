---
name: ui
description: Systematic UI work — component states, mobile parity, accessibility, and design system compliance.
disable-model-invocation: false
---

# UI

Systematic guide for building and auditing UI in ContentDeck. Use this when building new components or auditing existing ones for quality.

## Usage

```
/ui <component name or area>      # Audit or build a specific component
/ui parity                        # Check mobile vs desktop parity
/ui audit                         # Full UI audit across the codebase
```

---

## Principle: Component-First, Not Screen-First

Don't think "fix the close button." Think "what are all the states this component needs, and are they all handled?" Build and review components in terms of their complete state surface, not individual visual complaints.

---

## Step 1: Component State Coverage

Every component that displays data must handle all four states. Read the component and verify each is implemented:

| State | What it looks like | What to check |
|-------|--------------------|---------------|
| **Loading** | Skeleton or spinner | Is it shown during async ops? Does layout shift when data arrives? |
| **Empty** | Empty state message | Is there a helpful message + CTA? Not just a blank space. |
| **Error** | Error message | Is it shown? Does it give the user an action (retry, reload)? |
| **Data** | Normal content | The happy path — is it correct? |

For each state, ask: **would a new user know what's happening and what to do?**

The `EmptyState` component (`src/components/ui/EmptyState.tsx`) is the standard — use it for empty and error states.

---

## Step 2: Mobile Parity Check

Desktop and mobile are separate component trees. Any new navigation item or action added to desktop must be manually added to mobile.

**Read both files:**
- `src/components/layout/Sidebar.tsx` — desktop nav + actions
- `src/components/layout/MobileNav.tsx` — mobile bottom tabs
- `src/components/layout/MobileHeader.tsx` — mobile top bar

**Current parity table:**

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Add bookmark | Sidebar header button | MobileHeader + button |
| Search | FeedToolbar | MobileHeader search button |
| Unread / Reading / Done | Sidebar statusNav | MobileNav tabs |
| Favorites | Sidebar Star button | MobileNav Star tab |
| Areas/List toggle | Sidebar View section | MobileNav toggle button |
| Settings | Sidebar footer | MobileHeader gear button |
| Theme toggle | Sidebar footer | MobileHeader sun/moon button |
| Statistics | Sidebar footer | ❌ Not on mobile (known gap) |
| Sign Out | Sidebar footer | ❌ Not on mobile (via Settings modal) |
| All Bookmarks filter | Sidebar statusNav | ❌ Not in MobileNav (known gap) |

**Rule:** If you add a new item to Sidebar navigation or footer, check both `MobileNav.tsx` and `MobileHeader.tsx` before committing.

---

## Step 3: Touch Targets

All interactive elements on mobile must be at least 44×44px. This is enforced via `min-h-[44px]` + `min-w-[44px]` (or `min-h-[56px]` for bottom nav tabs).

Check:
- [ ] Every `<button>` has `min-h-[44px]` or is inside a container that provides it
- [ ] Bottom nav tabs use `min-h-[56px]` (extra height for thumb reach)
- [ ] Icon-only buttons have both `min-w-[44px]` and `min-h-[44px]`
- [ ] Clickable areas don't shrink on mobile viewports

---

## Step 4: Accessibility

- [ ] Every icon-only button has `aria-label` describing its action (not its icon): `aria-label="Delete bookmark"`, not `aria-label="trash"`
- [ ] Active nav items have `aria-current="page"`
- [ ] All interactive elements have `focus-visible:ring-2` (check the Tailwind classes)
- [ ] Form inputs have associated `<label>` elements (not just placeholder text)
- [ ] Modal: focus trap works (Tab cycles within), ESC closes, `role="dialog"` + `aria-modal="true"`
- [ ] Color is not the only way information is conveyed (status badges have text, not just color)

---

## Step 5: Dark/Light Mode Compliance

- [ ] No hardcoded color values (`text-gray-500`, `bg-white` without a dark equivalent)
- [ ] All colors use paired Tailwind classes: `text-surface-600 dark:text-surface-400`
- [ ] Source type badge colors are defined in `tailwind.config.ts` — do not add new ones in component files
- [ ] Test by toggling theme in the app: does anything look broken in dark mode?

**Color system — use these token pairs:**

| Use | Light | Dark |
|-----|-------|------|
| Page background | `bg-surface-50` | `dark:bg-surface-950` |
| Card / panel | `bg-white` | `dark:bg-surface-900` |
| Borders | `border-surface-200` | `dark:border-surface-800` |
| Primary text | `text-surface-900` | `dark:text-surface-100` |
| Secondary text | `text-surface-600` | `dark:text-surface-400` |
| Muted text | `text-surface-400` | `dark:text-surface-500` |
| Primary action | `bg-primary-600` | (same — primary-600 works in both) |

---

## Step 6: Design Consistency

- [ ] New components use existing patterns — don't invent new ones unless the existing ones are wrong
- [ ] Spacing: use Tailwind scale (`p-4`, `gap-3`, `mt-6`) — no arbitrary values unless justified
- [ ] Border radius: `rounded-lg` for cards/modals, `rounded-md` for buttons, `rounded-full` for badges/pills
- [ ] Shadows: `shadow-sm` for elevated cards, none for inline elements
- [ ] Typography scale: `text-sm` for body, `text-xs` for metadata/labels, `text-lg`/`text-xl` for headings

---

## Output Format

For each component or area audited:

```
COMPONENT: <name>
File: src/components/...

States:
  Loading:  PASS / MISSING — [description]
  Empty:    PASS / MISSING — [description]
  Error:    PASS / MISSING — [description]
  Data:     PASS

Mobile parity: PASS / GAP — [what's missing]
Touch targets: PASS / FAIL — [which elements]
Accessibility: PASS / ISSUES — [list]
Dark mode:     PASS / ISSUES — [list]
Consistency:   PASS / ISSUES — [list]

Priority fixes:
  HIGH:   [issue + file:line]
  MEDIUM: [issue + file:line]
  LOW:    [issue + file:line]
```
