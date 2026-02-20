import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReview } from '../useReview';
import type { Bookmark } from '../../types';

// ---- Mock modules ----

const mockRpc = vi.fn();
const mockFrom = vi.fn();

const mockSupabaseClient = {
  rpc: mockRpc,
  from: mockFrom,
};

vi.mock('../../context/SupabaseProvider', () => ({
  useSupabase: () => mockSupabaseClient,
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

// ---- Helpers ----

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: `bm-${Math.random().toString(36).slice(2)}`,
    url: 'https://example.com',
    title: 'Test Bookmark',
    image: null,
    excerpt: 'A test excerpt',
    source_type: 'blog',
    status: 'done',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    scratchpad: '',
    synced: false,
    created_at: new Date().toISOString(),
    status_changed_at: new Date().toISOString(),
    started_reading_at: null,
    finished_at: null,
    last_reviewed_at: null,
    review_count: 0,
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const SAMPLE_QUEUE = [makeBookmark({ id: 'bm-1' }), makeBookmark({ id: 'bm-2' })];

beforeEach(() => {
  vi.clearAllMocks();
  // Default: update succeeds silently
  mockFrom.mockReturnValue({
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: null; error: null }) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  });
});

describe('useReview', () => {
  it('returns full queue when no items have been reviewed', async () => {
    mockRpc.mockResolvedValue({ data: SAMPLE_QUEUE, error: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useReview(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.visibleQueue).toHaveLength(2);
    expect(result.current.dueCount).toBe(2);
  });

  it('skipReview removes item from visible queue without DB write', async () => {
    mockRpc.mockResolvedValue({ data: SAMPLE_QUEUE, error: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useReview(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.skipReview('bm-1');
    });

    expect(result.current.visibleQueue).toHaveLength(1);
    expect(result.current.visibleQueue[0]!.id).toBe('bm-2');
    // No DB call should have been made
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('recordReview optimistically removes item from cache', async () => {
    // Initial fetch returns both items
    mockRpc.mockResolvedValueOnce({ data: SAMPLE_QUEUE, error: null });
    // After invalidation triggered by onSettled, refetch returns only bm-2
    mockRpc.mockResolvedValue({ data: [SAMPLE_QUEUE[1]], error: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useReview(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.recordReview.mutate('bm-1');
    });

    // After mutation settles, bm-1 should no longer be in visible queue
    await waitFor(() => {
      expect(result.current.visibleQueue.some((b) => b.id === 'bm-1')).toBe(false);
    });
    expect(mockFrom).toHaveBeenCalledWith('bookmarks');
  });
});
