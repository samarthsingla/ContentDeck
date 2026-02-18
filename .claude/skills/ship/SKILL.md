---
name: ship
description: End-of-session shipping routine. Lint, type-check, build, update docs, commit, and push.
disable-model-invocation: true
---

# Ship

End-of-session routine to verify, document, commit, and push all changes.

## Steps

### 1. Quality checks

Run these in sequence — stop if any fail:

```
npx prettier --check "src/**/*.{ts,tsx}" "*.{js,json}"
npx eslint src/
npx tsc --noEmit
npx vite build
```

When test infrastructure exists, also run:
```
npx vitest run
```

If any check fails, fix the errors before continuing. Do NOT skip this step.

### 2. Update documentation

Check if any of these files need updates based on what changed this session:

- **CLAUDE.md** — Architecture, key patterns, important rules. Update if new files, patterns, or conventions were added.
- **README.md** — User-facing docs. Update if features, setup steps, project structure, or known limitations changed.
- **docs/INDEX.md** — Shipped features table and "next up" status. Update if features were shipped.
- **docs/plan/phase-1.md** — Active roadmap. Mark completed items, update priorities.
- **docs/reference/audit.md** — Bug tracking. Update if bugs were found and fixed.

Only update what actually changed. Don't touch docs that are already current.

### 3. Bump service worker cache version

If any code in `src/` or `public/` changed, bump the `CACHE_NAME` version in `public/sw.js`. Follow semver:
- Patch (x.x.+1) for bug fixes
- Minor (x.+1.0) for new features
- Major (+1.0.0) for breaking changes

### 4. Commit

- Stage specific files (never `git add -A` or `git add .`)
- Use conventional commit format:
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code restructuring
  - `chore:` tooling, deps, config
  - `docs:` documentation only
  - `test:` tests only
- End with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Use HEREDOC format for the message

### 5. Push

```
git push -u origin <current-branch>
```

### 6. Confirm

Show a summary table of what was shipped:
- Branch name
- Files changed (count)
- Commit hash + message
- Docs updated (which ones)
- Lint status (clean/warnings)
- Build status (clean/warnings)
