---
name: audit
description: Comprehensive codebase audit for bugs, performance, security, and quality issues.
disable-model-invocation: true
---

# Audit

Run a full codebase audit across all quality dimensions. Report findings organized by severity.

## Audit Checklist

### Build & Types
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npx vite build` — clean build, note bundle size
- [ ] Compare bundle size to last known good (485KB JS / 44KB CSS gzip ~135KB)

### Linting & Formatting
- [ ] `npx eslint src/` — zero errors (warnings acceptable if justified)
- [ ] `npx prettier --check "src/**/*.{ts,tsx}" "*.{js,json}"` — all files pass
- [ ] No inappropriate `eslint-disable` comments (each must have a justifying comment)

### Test Coverage
- [ ] `npx vitest run` — all tests pass (when test infrastructure exists)
- [ ] Lib functions (`src/lib/`) have unit tests
- [ ] No `.skip` or `.todo` tests that should be implemented

### Code Quality
- [ ] TODO/FIXME/HACK/XXX comments in `src/`
- [ ] `console.log` / `console.error` in production code (ErrorBoundary is acceptable)
- [ ] Unused imports or dead code
- [ ] TypeScript `any` types or `@ts-ignore` directives
- [ ] Hardcoded URLs, secrets, or tokens in `src/` or `public/`

### Security
- [ ] No secrets in code (Supabase keys, API keys must be runtime-only)
- [ ] Bookmarklet credential escaping (`jsStringEscape` in utils.ts)
- [ ] YAML frontmatter escaping (`yamlEscape` in obsidian.ts)
- [ ] No SQL injection vectors (Supabase client handles parameterization)
- [ ] XSS prevention (React auto-escaping, no `dangerouslySetInnerHTML`)

### Performance
- [ ] Service worker strategy correct (network-first for navigation, SWR for assets)
- [ ] `vercel.json` has SPA rewrites + immutable cache headers for `/assets/*`
- [ ] No render-blocking resources in `index.html`
- [ ] Inline loading state present in `index.html` (CSS spinner inside `#root`)

### PWA & Deployment
- [ ] `manifest.json` — `start_url: "/"` (not `"./"`)
- [ ] `apple-touch-icon` points to existing file
- [ ] OG meta tags present (`og:title`, `og:description`, `twitter:card`)
- [ ] SW `CACHE_NAME` version is current

### Accessibility
- [ ] All interactive elements have `min-h-[44px]` touch targets
- [ ] All form inputs have associated `<label>` elements
- [ ] All icon-only buttons have `aria-label`
- [ ] Modal has `role="dialog"` + `aria-modal` + focus trapping
- [ ] `focus-visible:ring-2` on all interactives

### React Patterns
- [ ] All `useEffect` hooks with listeners have cleanup functions
- [ ] No memory leaks (event listeners, intervals, subscriptions)
- [ ] TanStack Query mutations have optimistic update + rollback
- [ ] Notes mutations fetch from DB (not cache) before updating

### Dependencies
- [ ] `npm audit` — no high/critical vulnerabilities
- [ ] All dependencies in `package.json` are actively used
- [ ] Dev dependencies are in `devDependencies` (not `dependencies`)
- [ ] ESLint and Prettier configs are committed
- [ ] `.gitignore` covers: `node_modules/`, `dist/`, `.env`, `nul`, `.vercel`

### Documentation
- [ ] `CLAUDE.md` matches current architecture
- [ ] `README.md` matches current features and project structure
- [ ] `AUDIT.md` is up to date with latest fixes

## Output Format

Organize findings into:

| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |
| Clean | X categories passed |

For each finding, provide: file, line, issue, suggested fix.
