import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import type { NoteBookmark } from '../types';

/** Returns note IDs linked to a given bookmark. */
export function useLinkedNoteIds(bookmarkId: string | null) {
  const db = useSupabase();

  return useQuery({
    queryKey: ['linked_note_ids', bookmarkId] as const,
    enabled: !!bookmarkId,
    queryFn: async () => {
      if (!bookmarkId) return [];
      const { data, error } = await db
        .from('note_bookmarks')
        .select('note_id')
        .eq('bookmark_id', bookmarkId);
      if (error) throw error;
      return ((data ?? []) as NoteBookmark[]).map((r) => r.note_id);
    },
  });
}
