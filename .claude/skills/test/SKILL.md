---
name: test
description: Write Vitest tests for this codebase — unit tests for lib/ functions and component tests for UI.
disable-model-invocation: false
---

# Test

Write tests following the patterns established in this codebase. Always read the relevant source file before writing tests for it.

## Usage

```
/test <what to test — e.g. "the new detectPodcast function in utils.ts">
/test <component — e.g. "the EditBookmarkModal component">
```

## Decision: Unit test or Component test?

| Situation | Test type | Location |
|-----------|-----------|----------|
| Pure function in `src/lib/` | Unit | `src/lib/__tests__/<file>.test.ts` |
| React component with user interaction | Component | `src/components/__tests__/<Name>.test.tsx` |
| TanStack Query hook | Unit (mock Supabase) | `src/hooks/__tests__/<hook>.test.ts` |
| Edge case / regression fix | Whichever layer contains the fix | Same location as the code |

When in doubt: if it renders JSX, it's a component test. If it's a function, it's a unit test.

---

## Unit Test Pattern

For functions in `src/lib/`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { functionName } from '../moduleName';

describe('functionName', () => {
  it('does the expected thing with normal input', () => {
    expect(functionName('input')).toBe('expected output');
  });

  it('handles edge case — empty string', () => {
    expect(functionName('')).toBe('fallback');
  });

  it('handles edge case — null / undefined', () => {
    expect(functionName(null as never)).toBe('fallback');
  });
});
```

**Rules:**
- One `describe` per function, one `it` per behavior
- Test names are sentences: `'returns youtube for youtu.be URLs'`, not `'youtube test'`
- Use `vi.fn()` for external API calls — never actually call fetch
- Use `vi.useFakeTimers()` for anything time-dependent
- Test the full URL variant matrix for `detectSourceType` (youtube.com, youtu.be, youtube.app.goo.gl etc.)

---

## Component Test Pattern

For components in `src/components/`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '../path/MyComponent';

// 1. Mock contexts at module level — before any imports that use them
vi.mock('../../context/UIProvider', () => ({
  useUI: () => ({
    currentStatus: 'unread',
    setStatus: vi.fn(),
    // only include what this component actually uses
  }),
}));

// 2. Factory function for test data
function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'b1',
    url: 'https://example.com',
    title: 'Test Article',
    // ... all required fields with sensible defaults
    ...overrides,
  };
}

describe('MyComponent', () => {
  it('renders the title', () => {
    render(<MyComponent bookmark={makeBookmark()} />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
  });

  it('calls onDelete when delete is confirmed', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MyComponent bookmark={makeBookmark()} onDelete={onDelete} />);
    await user.click(screen.getByLabelText('Delete bookmark'));
    expect(onDelete).toHaveBeenCalledWith('b1');
  });
});
```

---

## Codebase-Specific Mock Patterns

### Mocking UIProvider (most components need this)
```typescript
vi.mock('../../context/UIProvider', () => ({
  useUI: () => ({
    currentStatus: 'unread',
    setStatus: vi.fn(),
    showFavorites: false,
    setFavorites: vi.fn(),
    currentView: 'list',
    setView: vi.fn(),
    currentTag: null,
    setTag: vi.fn(),
  }),
}));
```

### Mocking useAuth
```typescript
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// In tests, control per-test:
mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false, ... });
```

### Partial mock (keep real implementation, override one function)
```typescript
vi.mock('../../lib/utils', async () => {
  const actual = await vi.importActual('../../lib/utils');
  return {
    ...(actual as object),
    getFaviconUrl: () => 'https://favicon.test/icon.png', // override only this
  };
});
```

### Stubbing heavy child components
```typescript
// Prevents rendering the full component tree in App-level tests
vi.mock('../../pages/Dashboard', () => ({
  default: (props: { isDemo?: boolean }) => (
    <div data-testid="dashboard" data-demo={props.isDemo} />
  ),
}));
```

### Confirm dialogs
```typescript
vi.spyOn(window, 'confirm').mockReturnValue(true);  // user clicks OK
vi.spyOn(window, 'confirm').mockReturnValue(false); // user clicks Cancel
```

### ToastProvider wrapper (for components that call useToast)
```typescript
import { ToastProvider } from '../../components/ui/Toast';

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}
```

---

## What to Test

**Test these:**
- All user interactions (click, type, submit)
- Conditional rendering (loading state, empty state, error state)
- Edge cases that have caused bugs before (check MEMORY.md + audit log)
- URL variant coverage for any detection logic
- That callbacks are called with the correct arguments

**Don't test these:**
- Implementation details (which internal function was called)
- Styling (CSS classes)
- Third-party library internals (Supabase, TanStack Query)
- Things only testable via E2E (Playwright — deferred to v4.0)

---

## Running Tests

```bash
npm run test          # Run all tests once
npm run test:watch    # Re-run on file save (use during development)
```

Tests live alongside source:
- `src/lib/__tests__/utils.test.ts`
- `src/lib/__tests__/metadata.test.ts`
- `src/lib/__tests__/ai.test.ts`
- `src/hooks/__tests__/useBookmarks.test.ts`
- `src/components/__tests__/App.test.tsx`
- `src/components/__tests__/AuthScreen.test.tsx`
- `src/components/__tests__/AddBookmarkModal.test.tsx`
- `src/components/__tests__/BookmarkCard.test.tsx`
- `src/components/__tests__/StatusFilters.test.tsx`

Add new test files to the appropriate directory. Do not create a new directory.

---

## Checklist

Before marking tests done:

- [ ] All new lib functions have unit tests
- [ ] All new components have at least: renders correctly, handles primary interaction, handles empty/error state
- [ ] Test names read as sentences describing behavior
- [ ] No real network calls (fetch is mocked globally in `setup.ts`)
- [ ] `npm run test` passes with zero failures
