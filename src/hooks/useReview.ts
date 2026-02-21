import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { useToast } from '../components/ui/Toast';
import { activeScheduler } from '../lib/scheduler';
import { BOOKMARKS_QUERY_KEY } from './useBookmarks';
import type { Bookmark } from '../types';

const QUERY_KEY = ['reviewQueue'] as const;

export function useReview() {
  const db = useSupabase();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Session-only skipped IDs — not persisted to DB
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [sessionReviewed, setSessionReviewed] = useState(0);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data, error } = await db.rpc('get_review_queue', { p_limit: 200 });
      if (error) throw error;
      const candidates = (data ?? []) as Bookmark[];
      return candidates.filter((b) => activeScheduler.isDue(b));
    },
  });

  // Filter out skipped items for the visible queue
  const visibleQueue = useMemo(
    () => (query.data ?? []).filter((b) => !skippedIds.has(b.id)),
    [query.data, skippedIds],
  );

  const recordReview = useMutation({
    mutationFn: async (id: string) => {
      const bookmark = query.data?.find((b) => b.id === id);
      const updates: Record<string, unknown> = {
        last_reviewed_at: new Date().toISOString(),
        review_count: (bookmark?.review_count ?? 0) + 1,
      };
      if (bookmark?.status === 'unread') {
        updates.status = 'reading';
      }
      const { error } = await db.from('bookmarks').update(updates).eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      // Optimistically remove from queue
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) => old?.filter((b) => b.id !== id));
      setSessionReviewed((n) => n + 1);
      // Optimistically update status in bookmarks cache
      const bookmark = prev?.find((b) => b.id === id);
      if (bookmark?.status === 'unread') {
        queryClient.setQueryData<Bookmark[]>(BOOKMARKS_QUERY_KEY, (old) =>
          old?.map((b) => (b.id === id ? { ...b, status: 'reading' } : b)),
        );
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      setSessionReviewed((n) => Math.max(0, n - 1));
      toast.error('Failed to record review');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY });
    },
  });

  function skipReview(id: string) {
    setSkippedIds((prev) => new Set([...prev, id]));
  }

  return {
    visibleQueue,
    isLoading: query.isLoading,
    dueCount: visibleQueue.length,
    sessionReviewed,
    sessionTotal: (query.data?.length ?? 0) + sessionReviewed,
    recordReview,
    skipReview,
  };
}
