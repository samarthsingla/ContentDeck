---
name: perf-check
description: Check build performance, bundle size, and deployment readiness.
disable-model-invocation: true
---

# Performance Check

Quick performance and deployment readiness check.

## Steps

### 1. Run quality checks

Run all quality steps in order — stop if any fail:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

### 2. Measure bundle size

Extract from the `npm run build` output:
- JS bundle size (raw + gzip)
- CSS bundle size (raw + gzip)
- Build time

Compare against v3.0 baselines:

| Metric | Baseline (v3.0) | Current | Delta |
|--------|-----------------|---------|-------|
| JS (raw) | ~511 KB | ? | ? |
| JS (gzip) | ~142 KB | ? | ? |
| CSS (raw) | ~46 KB | ? | ? |
| Build time | ~5s | ? | ? |

Flag if:
- JS gzip > 160 KB (warn) or > 200 KB (critical)
- CSS gzip > 20 KB (warn)
- Build time > 15s (warn)

**After checking:** update the baseline row in this table with the current values so the next perf-check has accurate numbers.

### 3. Deployment config check

Verify these files are correct:

**`vercel.json`**:
- [ ] SPA rewrite rule present (all routes → `index.html`)
- [ ] `/assets/*` has `immutable` cache headers
- [ ] `/sw.js` has `no-cache` headers
- [ ] `/manifest.json` has `no-cache` headers
- [ ] `index.html` is NOT in the immutable cache group (it must revalidate)

**`public/sw.js`**:
- [ ] `CACHE_NAME` version matches latest changes
- [ ] Navigation requests use network-first strategy
- [ ] Asset requests use stale-while-revalidate
- [ ] API calls (supabase, openrouter, microlink) bypass cache entirely

**`index.html`**:
- [ ] Inline loading spinner present inside `#root`
- [ ] OG meta tags present (`og:title`, `og:description`, `og:image`)
- [ ] `apple-touch-icon` points to existing file
- [ ] No render-blocking external resources

**`public/manifest.json`**:
- [ ] `start_url: "/"` (not `"./"`)
- [ ] `share_target` configured
- [ ] Icon references valid files

### 4. TTFB investigation (if poor)

If Vercel Speed Insights shows poor TTFB:
- Check `vercel.json` — is `index.html` accidentally getting `immutable` cache? That forces every visitor to origin instead of edge.
- Check Vercel dashboard → Analytics → "Fastest region" — if it's `iad1` (US East) and you're in India, all requests have ~200ms baseline latency.
- The Supabase project region (default `us-east-1`) affects API latency but not TTFB — those are separate.

### 5. Report

Output a summary:

```
PERF CHECK — <date>
Build:     PASS/FAIL (JS: X KB gzip, CSS: X KB gzip, time: Xs)
Deploy:    PASS/FAIL (list config issues)
Types:     PASS (tsc --noEmit passes as part of typecheck step)
Tests:     PASS/FAIL (X passing)
Overall:   SHIP IT / NEEDS FIXES
```
