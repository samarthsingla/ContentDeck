---
name: feature
description: Professional feature development workflow — branch, plan, implement, verify, and ship via PR.
disable-model-invocation: false
---

# Feature Development Workflow

Complete workflow for developing features professionally: branch → plan → implement → verify → PR.

## Usage

```
/feature <description of feature or fix>
```

## Phase 1 — PLAN

1. **Create feature branch** from `main`:
   - `feat/<name>` for new features
   - `fix/<name>` for bug fixes
   - `refactor/<name>` for refactoring
   - `chore/<name>` for tooling, deps, config

2. **Explore codebase** to understand affected areas:
   - Read relevant source files
   - Identify all files that need changes
   - Check for existing patterns to follow

3. **Write implementation plan:**
   - Files to create/modify
   - Dependencies or migrations needed
   - Risks or edge cases
   - Testing approach

4. **Get user approval** before writing any code.

## Phase 2 — IMPLEMENT

1. **Write code** following `CLAUDE.md` patterns:
   - Use existing conventions (TanStack Query, Supabase client, etc.)
   - Follow TypeScript strict mode
   - Maintain accessibility standards (44px touch targets, ARIA, focus-visible)
   - Use `type` imports for type-only imports

2. **Write tests** (when test infrastructure exists):
   - Unit tests for lib functions
   - Component tests for complex UI logic

## Phase 3 — VERIFY

Run all quality checks in order — stop and fix if any fail:

```bash
npx prettier --check "src/**/*.{ts,tsx}" "*.{js,json}"
npx eslint src/
npx tsc --noEmit
npx vite build
```

When test infrastructure exists, also run:
```bash
npx vitest run
```

## Phase 4 — SHIP

1. **Update documentation** (only what changed):
   - `CLAUDE.md` — if architecture, patterns, or rules changed
   - `README.md` — if user-facing features changed
   - `AUDIT.md` — if bugs were found/fixed
   - `ENGINEERING-PLAN.md` — if roadmap items were completed

2. **Bump SW cache version** in `public/sw.js` if `src/` or `public/` changed.

3. **Commit** with conventional commit format:
   - `feat: <description>` — new feature
   - `fix: <description>` — bug fix
   - `refactor: <description>` — code restructuring
   - `chore: <description>` — tooling, deps, config
   - `docs: <description>` — documentation only
   - `test: <description>` — tests only
   - End with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

4. **Push and create PR:**
   ```bash
   git push -u origin <branch-name>
   gh pr create --title "<conventional title>" --body "..."
   ```
   PR body must include:
   - `## Summary` — 1-3 bullet points
   - `## Test plan` — verification checklist

5. **Show PR URL** to user.
