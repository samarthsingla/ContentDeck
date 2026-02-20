import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { useToast } from '../components/ui/Toast';
import type { StandaloneNote } from '../types';

const QUERY_KEY = ['notes'] as const;

export function useNotes() {
  const db = useSupabase();
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await db
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as StandaloneNote[];
    },
  });

  const createNote = useMutation({
    mutationFn: async (note: { title: string; content?: string }) => {
      const { data, error } = (await db
        .from('notes')
        .insert({ title: note.title, content: note.content ?? '' })
        .select()
        .single()) as { data: StandaloneNote; error: Error | null };
      if (error) throw error;
      return data;
    },
    onSuccess: (newNote) => {
      queryClient.setQueryData<StandaloneNote[]>(QUERY_KEY, (old) =>
        old ? [newNote, ...old] : [newNote],
      );
      toast.success('Note created');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create note'),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StandaloneNote> & { id: string }) => {
      const { data, error } = (await db
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()) as { data: StandaloneNote; error: Error | null };
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<StandaloneNote[]>(QUERY_KEY);
      queryClient.setQueryData<StandaloneNote[]>(QUERY_KEY, (old) =>
        old?.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Failed to update note');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<StandaloneNote[]>(QUERY_KEY);
      queryClient.setQueryData<StandaloneNote[]>(QUERY_KEY, (old) =>
        old?.filter((n) => n.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Failed to delete note');
    },
    onSuccess: () => toast.success('Note deleted'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createNote,
    updateNote,
    deleteNote,
  };
}
