import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import type { Bookmark, NoteBookmark } from '../types';

export function useNoteBookmarks(noteId: string | null) {
  const db = useSupabase();
  const queryClient = useQueryClient();

  const queryKey = ['note_bookmarks', noteId] as const;

  const query = useQuery({
    queryKey,
    enabled: !!noteId,
    queryFn: async () => {
      if (!noteId) return [];

      // Step 1: get bookmark IDs for this note
      const { data: junctions, error: jErr } = await db
        .from('note_bookmarks')
        .select('bookmark_id')
        .eq('note_id', noteId);
      if (jErr) throw jErr;

      const ids = ((junctions ?? []) as NoteBookmark[]).map((j) => j.bookmark_id);
      if (ids.length === 0) return [];

      // Step 2: fetch bookmarks by IDs
      const { data: bookmarks, error: bErr } = await db
        .from('bookmarks')
        .select(
          '*, bookmark_tags(tag_area_id, tag_areas(id, name, emoji, color, sort_order, created_at, description))',
        )
        .in('id', ids);
      if (bErr) throw bErr;
      return (bookmarks ?? []) as Bookmark[];
    },
  });

  const linkBookmark = useMutation({
    mutationFn: async ({ noteId: nId, bookmarkId }: { noteId: string; bookmarkId: string }) => {
      const { error } = await db
        .from('note_bookmarks')
        .insert({ note_id: nId, bookmark_id: bookmarkId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const unlinkBookmark = useMutation({
    mutationFn: async ({ noteId: nId, bookmarkId }: { noteId: string; bookmarkId: string }) => {
      const { error } = await db
        .from('note_bookmarks')
        .delete()
        .eq('note_id', nId)
        .eq('bookmark_id', bookmarkId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    linkedBookmarks: query.data ?? [],
    isLoading: query.isLoading,
    linkBookmark,
    unlinkBookmark,
  };
}
