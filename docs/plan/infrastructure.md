# Infrastructure & DevOps

## Testing Pyramid
```
E2E (Playwright)     — 10 critical user journeys
Integration          — API endpoints, auth flows, edge functions
Component (RTL)      — 30+ component tests for UI logic
Unit (Vitest)        — 50+ tests for lib/ pure functions
Type checking (tsc)  — Zero tolerance for type errors
```

## CI/CD Pipeline (GitHub Actions — free)
```yaml
on: [push, pull_request]
jobs:
  quality:
    - npm ci
    - npx tsc --noEmit          # Type check
    - npx vitest run             # Unit + component tests
    - npx playwright test        # E2E tests
    - npx vite build             # Build verification

  deploy:
    - Vercel auto-deploy (already configured)

  scheduled:
    - Weekly: dependency audit (npm audit)
    - Weekly: Lighthouse CI score check
    - Daily: health check ping to production
```

## Monitoring & Observability
- **Sentry** (free: 5K events/month): Error tracking, performance monitoring
- **Vercel Analytics** (free: basic web vitals)
- **Supabase Dashboard**: Database metrics, API usage, auth stats
- **UptimeRobot** (free: 50 monitors): Uptime monitoring with alerts
- **Custom health endpoint**: `/api/health` edge function

## Security Hardening
- **Content Security Policy**: Strict CSP headers in `vercel.json`
- **Rate limiting**: Supabase RLS + edge function rate limits
- **Input validation**: Zod schemas for all API inputs
- **SQL injection**: Parameterized queries via Supabase client (already safe)
- **XSS**: React's automatic escaping + DOMPurify for rendered HTML (reader mode)
- **CORS**: Restrictive CORS headers on API endpoints
- **Dependency scanning**: GitHub Dependabot (free) + `npm audit` in CI

## Performance Targets
| Metric | Target | How |
|--------|--------|-----|
| First Contentful Paint | < 1.5s | Inline loading state, preconnect hints |
| Largest Contentful Paint | < 2.5s | Code splitting, lazy load modals |
| Time to Interactive | < 3.5s | Defer non-critical JS, tree-shake icons |
| Bundle size (gzipped) | < 120KB | Code split: core + modals + detail + areas |
| Lighthouse Performance | > 90 | Optimize images, preload critical assets |
| Lighthouse Accessibility | 100 | Already close, maintain with CI checks |

## Code Splitting Strategy
```
Entry chunk:        React, Router, TanStack Query, core UI  (~80KB gzip)
Dashboard chunk:    Feed, source tabs, toolbar               (~20KB gzip)
Detail chunk:       Detail panel, notes, export              (~15KB gzip, lazy)
Modals chunk:       Add/Edit/Settings/Stats/Areas            (~15KB gzip, lazy)
AI chunk:           OpenRouter client, summarization          (~5KB gzip, lazy)
```

---

## Free Tier Budget

Every service used must have a free tier sufficient for the project's scale.

| Service | Free Tier | Our Usage | Headroom |
|---------|-----------|-----------|----------|
| **Supabase** | 500MB DB, 1GB storage, 50K MAU, 500K edge fn | ~50MB DB, ~100MB storage, <1K MAU | 10x |
| **Vercel** | 100GB bandwidth, 100K fn invocations | ~5GB/mo bandwidth | 20x |
| **OpenRouter** | Free models (Llama, Gemma, Qwen) | ~500 req/day | Unlimited |
| **GitHub Actions** | 2,000 min/month | ~200 min/month | 10x |
| **Sentry** | 5K events/month | ~500 events/month | 10x |
| **UptimeRobot** | 50 monitors, 5-min checks | 1 monitor | 50x |
| **Cloudflare** | Unlimited bandwidth, email workers | Email-to-save | Unlimited |
| **Chrome Web Store** | Free to publish | 1 extension | N/A |
| **npm** | Free to publish | 1 CLI package | N/A |
| **Resend** | 100 emails/day | ~50 digests/week | 14x |
| **Semantic Scholar API** | 100 req/sec | Occasional lookups | 100x |

**Total monthly cost: $0.00**

---

## Quality Gates

Every PR must pass before merge:

1. `tsc --noEmit` — zero type errors
2. `vitest run` — all tests pass
3. `vite build` — clean production build
4. Bundle size delta — no more than +5KB gzip without justification
5. Accessibility — Lighthouse a11y score >= 95
6. Security — no `npm audit` high/critical vulnerabilities
7. Code review — at least one review (even if self-review with Claude Code)

---

## Implementation Priority Matrix

```
                        HIGH IMPACT
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         │  Auth (1.1) ✅    │  AI Summary(2.1) │
         │  Fixes (1.1a/b)  │  Extension (3.1) │
         │  Import (1.4)    │  Chat (2.5)      │
         │  Search (1.3)    │  Public API (3.3)│
         │  Testing (1.6)   │                  │
         │                  │                  │
LOW ─────┼──────────────────┼──────────────────┼───── HIGH
EFFORT   │                  │                  │    EFFORT
         │  Reader (1.5)    │  Offline (3.2)   │
         │  Review (2.6)    │  Social (4.1-4)  │
         │  Digest (4.5)    │  Obsidian (5.1)  │
         │  RSS (3.7)       │  Podcasts (5.4)  │
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                        LOW IMPACT
```

**Execution order**: Top-left quadrant first (high impact, low effort), then top-right (high impact, high effort), then bottom-left, then bottom-right.
