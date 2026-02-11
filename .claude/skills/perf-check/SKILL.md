---
name: perf-check
description: Check build performance, bundle size, and deployment readiness.
disable-model-invocation: true
---

# Performance Check

Quick performance and deployment readiness check.

## Steps

### 1. Build and measure

Run production build:
```
npx vite build
```

Extract from output:
- JS bundle size (raw + gzip)
- CSS bundle size (raw + gzip)
- Build time

### 2. Compare to baselines

| Metric | Baseline (v2.2) | Current | Delta |
|--------|-----------------|---------|-------|
| JS (gzip) | 135 KB | ? | ? |
| CSS (gzip) | 8.2 KB | ? | ? |
| Build time | ~5s | ? | ? |

Flag if:
- JS gzip > 150 KB (warn) or > 180 KB (critical)
- CSS gzip > 15 KB (warn)
- Build time > 15s (warn)

### 3. Deployment config check

Verify these files are correct:

**`vercel.json`**:
- [ ] SPA rewrite rule present (all routes → `index.html`)
- [ ] `/assets/*` has `immutable` cache headers
- [ ] `/sw.js` has `no-cache` headers
- [ ] `/manifest.json` has `no-cache` headers

**`public/sw.js`**:
- [ ] `CACHE_NAME` version matches latest changes
- [ ] Navigation requests use network-first strategy
- [ ] Asset requests use stale-while-revalidate
- [ ] API calls (supabase, openrouter, microlink) bypass cache entirely

**`index.html`**:
- [ ] Inline loading spinner present inside `#root`
- [ ] OG meta tags present
- [ ] `apple-touch-icon` points to existing file
- [ ] No render-blocking external resources

**`public/manifest.json`**:
- [ ] `start_url: "/"` (not `"./"`)
- [ ] `share_target` configured
- [ ] Icon references valid files

### 4. Type safety

```
npx tsc --noEmit
```

Must be zero errors.

### 5. Report

Output a summary:

```
PERF CHECK — <date>
Build:     PASS/FAIL (size, time)
Deploy:    PASS/FAIL (config issues)
Types:     PASS/FAIL (error count)
Overall:   SHIP IT / NEEDS FIXES
```
