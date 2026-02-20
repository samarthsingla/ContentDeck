# Infrastructure & DevOps

## Testing Pyramid
```
E2E (Playwright)     — Deferred (overkill for personal app)
Integration          — API endpoints, auth flows, edge functions
Component (RTL)      — 30+ component tests for UI logic
Unit (Vitest)        — 100+ tests for lib/ pure functions and hooks
Type checking (tsc)  — Zero tolerance for type errors
```

Future additions (Phase 2+):
- Note CRUD hook tests (`useNotes`, `useNoteBookmarks`)
- NoteCard / NotesList component tests
- TipTap editor integration tests
- Embedding generation edge function tests

## CI/CD Pipeline (GitHub Actions — free)
```yaml
on: [push, pull_request]
jobs:
  quality:
    - npm ci
    - npm run format:check     # Prettier
    - npm run lint             # ESLint (zero errors)
    - npx tsc --noEmit         # Type check
    - npx vitest run           # Unit + component tests
    - npx vite build           # Build verification

  deploy:
    - Vercel auto-deploy (already configured)
```

## Security Hardening
- **Content Security Policy**: Strict CSP headers in `vercel.json`
- **Rate limiting**: Supabase RLS + edge function rate limits
- **Input validation**: Zod schemas for all API inputs
- **SQL injection**: Parameterized queries via Supabase client (already safe)
- **XSS**: React's automatic escaping + DOMPurify for rendered HTML (reader mode, TipTap output)
- **CORS**: Restrictive CORS headers on API endpoints
- **Dependency scanning**: GitHub Dependabot (free) + `npm audit` in CI

## Performance Targets
| Metric | Target | How |
|--------|--------|-----|
| First Contentful Paint | < 1.5s | Inline loading state, preconnect hints |
| Largest Contentful Paint | < 2.5s | Code splitting, lazy load modals |
| Time to Interactive | < 3.5s | Defer non-critical JS, tree-shake icons |
| Bundle size (gzipped) | < 150KB | Code split: core + modals + detail + editor + areas |
| Lighthouse Performance | > 90 | Optimize images, preload critical assets |
| Lighthouse Accessibility | 100 | Maintained with CI checks + jsx-a11y |

## Code Splitting Strategy
```
Entry chunk:        React, TanStack Query, core UI              (~80KB gzip)
Dashboard chunk:    Feed, source tabs, toolbar                   (~20KB gzip)
Detail chunk:       Detail panel, notes, export                  (~15KB gzip, lazy)
Modals chunk:       Add/Edit/Settings/Stats/Areas                (~15KB gzip, lazy)
Editor chunk:       TipTap + extensions (Phase 2)                (~45KB gzip, lazy)
AI chunk:           OpenRouter client, companion prompts          (~5KB gzip, lazy)
```

---

## Free Tier Budget

Every service used must have a free tier sufficient for the project's scale.

| Service | Free Tier | Our Usage | Headroom |
|---------|-----------|-----------|----------|
| **Supabase** | 500MB DB, 1GB storage, 50K MAU, 500K edge fn | ~50MB DB + ~3MB pgvector, <1K MAU | 10x |
| **Supabase pgvector** | Included in DB quota | 2K items × 384 dims = ~3MB | 150x |
| **Vercel** | 100GB bandwidth, 100K fn invocations | ~5GB/mo bandwidth | 20x |
| **OpenRouter** | Free models (Llama, Gemma, Qwen) | ~500 req/day (tagging + companion) | Unlimited |
| **Hugging Face Inference** | Free tier (30K chars/min, rate limited) | Embedding generation on save | Sufficient |
| **GitHub Actions** | 2,000 min/month | ~200 min/month | 10x |
| **Telegram Bot API** | Free, unlimited | Quick capture bot | Unlimited |

**Total monthly cost: $0.00**

---

## Quality Gates

Every PR must pass before merge:

1. `npm run format:check` — Prettier formatting
2. `npm run lint` — ESLint zero errors (jsx-a11y included)
3. `tsc --noEmit` — zero type errors
4. `vitest run` — all tests pass
5. `vite build` — clean production build
6. Bundle size delta — no more than +5KB gzip without justification (except editor chunk)
7. Accessibility — Lighthouse a11y score >= 95

---

## Implementation Priority Matrix

```
                        HIGH IMPACT
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         │  Notes Schema    │  Embeddings (3.1)│
         │  (2.1) ★         │  Topic Clusters  │
         │  Notes List (2.2)│  (3.3)           │
         │  Note Editor     │  Companion (4.1) │
         │  (2.3)           │                  │
         │                  │                  │
LOW ─────┼──────────────────┼──────────────────┼───── HIGH
EFFORT   │                  │                  │    EFFORT
         │  Bookmark Link   │  Telegram (5.1)  │
         │  (2.4)           │  People (5.3)    │
         │  Related Items   │  Contextual      │
         │  (3.2)           │  Recall (5.4)    │
         │  Semantic Search  │                  │
         │  (3.4)           │                  │
         └──────────────────┼──────────────────┘
                            │
                        LOW IMPACT
```

**Execution order**: Top-left quadrant first (high impact, low effort), then top-right (high impact, high effort), then bottom-left, then bottom-right.

★ = Current priority
