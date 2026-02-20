import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import type { NoteTag, TagArea } from '../types';

export function useNoteTags(noteId: string | null) {
  const db = useSupabase();
  const queryClient = useQueryClient();

  const queryKey = ['note_tags', noteId] as const;

  const query = useQuery({
    queryKey,
    enabled: !!noteId,
    queryFn: async () => {
      if (!noteId) return [];

      // Step 1: get tag_area IDs for this note
      const { data: junctions, error: jErr } = await db
        .from('note_tags')
        .select('tag_area_id')
        .eq('note_id', noteId);
      if (jErr) throw jErr;

      const ids = ((junctions ?? []) as NoteTag[]).map((j) => j.tag_area_id);
      if (ids.length === 0) return [];

      // Step 2: fetch tag areas by IDs
      const { data: tagAreas, error: tErr } = await db.from('tag_areas').select('*').in('id', ids);
      if (tErr) throw tErr;
      return (tagAreas ?? []) as TagArea[];
    },
  });

  const linkArea = useMutation({
    mutationFn: async ({ noteId: nId, tagAreaId }: { noteId: string; tagAreaId: string }) => {
      const { error } = await db.from('note_tags').insert({ note_id: nId, tag_area_id: tagAreaId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const unlinkArea = useMutation({
    mutationFn: async ({ noteId: nId, tagAreaId }: { noteId: string; tagAreaId: string }) => {
      const { error } = await db
        .from('note_tags')
        .delete()
        .eq('note_id', nId)
        .eq('tag_area_id', tagAreaId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    linkedAreas: query.data ?? [],
    isLoading: query.isLoading,
    linkArea,
    unlinkArea,
  };
}
