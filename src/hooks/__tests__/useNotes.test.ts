import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotes } from '../useNotes';
import type { StandaloneNote } from '../../types';

// ---- Mock modules ----

const mockSupabaseClient = createMockSupabase();
vi.mock('../../context/SupabaseProvider', () => ({
  useSupabase: () => mockSupabaseClient,
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

// ---- Chainable Supabase mock ----

interface MockBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  _resolve: { data: unknown; error: unknown };
}

function createMockBuilder(): MockBuilder {
  const builder: MockBuilder = {
    _resolve: { data: null, error: null },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
  };
  for (const key of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
    (builder[key as keyof MockBuilder] as ReturnType<typeof vi.fn>).mockReturnValue(builder);
  }
  const thenable = builder as unknown as {
    then: (
      resolve?: ((v: { data: unknown; error: unknown }) => unknown) | null,
      reject?: ((reason: unknown) => unknown) | null,
    ) => Promise<unknown>;
  };
  thenable.then = (resolve, reject) => Promise.resolve(builder._resolve).then(resolve, reject);
  return builder;
}

function createMockSupabase() {
  const builders = new Map<string, MockBuilder>();
  return {
    from: vi.fn((table: string) => {
      if (!builders.has(table)) builders.set(table, createMockBuilder());
      return builders.get(table)!;
    }),
    _getBuilder: (table: string) => {
      if (!builders.has(table)) builders.set(table, createMockBuilder());
      return builders.get(table)!;
    },
    _resetBuilders: () => builders.clear(),
  };
}

// ---- Wrapper ----

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

const SAMPLE_NOTES: StandaloneNote[] = [
  {
    id: 'note-1',
    title: 'Note One',
    content: '<p>Hello</p>',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Note Two',
    content: '<p>World</p>',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

beforeEach(() => {
  mockSupabaseClient._resetBuilders();
  vi.clearAllMocks();
});

describe('useNotes', () => {
  it('fetch returns the list of notes', async () => {
    mockSupabaseClient._getBuilder('notes')._resolve = { data: SAMPLE_NOTES, error: null };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notes).toHaveLength(2);
    expect(result.current.notes[0]!.title).toBe('Note One');
  });

  it('createNote calls toast.success on success', async () => {
    const newNote: StandaloneNote = {
      id: 'note-3',
      title: 'New Note',
      content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Initial fetch returns sample notes
    mockSupabaseClient._getBuilder('notes')._resolve = { data: SAMPLE_NOTES, error: null };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Mock insert to return new note
    mockSupabaseClient._getBuilder('notes')._resolve = { data: newNote, error: null };

    await act(async () => {
      await result.current.createNote.mutateAsync({ title: 'New Note', content: '' });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Note created');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('notes');
  });

  it('updateNote calls the DB with correct args', async () => {
    mockSupabaseClient._getBuilder('notes')._resolve = { data: SAMPLE_NOTES, error: null };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updatedNote = { ...SAMPLE_NOTES[0]!, title: 'Updated Title' };
    mockSupabaseClient._getBuilder('notes')._resolve = { data: updatedNote, error: null };

    act(() => {
      result.current.updateNote.mutate({ id: 'note-1', title: 'Updated Title' });
    });

    await waitFor(() => expect(result.current.updateNote.isSuccess).toBe(true));
    const builder = mockSupabaseClient._getBuilder('notes');
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated Title' }),
    );
    expect(builder.eq).toHaveBeenCalledWith('id', 'note-1');
  });

  it('deleteNote calls the DB with correct id', async () => {
    mockSupabaseClient._getBuilder('notes')._resolve = { data: SAMPLE_NOTES, error: null };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockSupabaseClient._getBuilder('notes')._resolve = { data: null, error: null };

    act(() => {
      result.current.deleteNote.mutate('note-1');
    });

    await waitFor(() => expect(result.current.deleteNote.isSuccess).toBe(true));
    const builder = mockSupabaseClient._getBuilder('notes');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'note-1');
    expect(mockToast.success).toHaveBeenCalledWith('Note deleted');
  });

  it('rolls back on createNote error', async () => {
    mockSupabaseClient._getBuilder('notes')._resolve = { data: SAMPLE_NOTES, error: null };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockSupabaseClient._getBuilder('notes')._resolve = {
      data: null,
      error: new Error('DB error'),
    };

    await act(async () => {
      try {
        await result.current.createNote.mutateAsync({ title: 'Fail', content: '' });
      } catch {
        // expected
      }
    });

    expect(mockToast.error).toHaveBeenCalled();
  });

  it('rolls back on deleteNote error and calls toast.error', async () => {
    mockSupabaseClient._getBuilder('notes')._resolve = { data: SAMPLE_NOTES, error: null };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Make delete fail
    mockSupabaseClient._getBuilder('notes')._resolve = {
      data: null,
      error: new Error('Delete failed'),
    };

    act(() => {
      result.current.deleteNote.mutate('note-1');
    });

    await waitFor(() => expect(result.current.deleteNote.isError).toBe(true));
    expect(mockToast.error).toHaveBeenCalledWith('Failed to delete note');
  });
});
