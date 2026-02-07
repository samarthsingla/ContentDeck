import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../context/SupabaseProvider'
import { useToast } from '../components/ui/Toast'
import { fetchMetadata } from '../lib/metadata'
import type { Bookmark, Status } from '../types'

const QUERY_KEY = ['bookmarks'] as const

/** Normalize bookmark data from Supabase — ensures arrays/objects are never null */
function normalizeBookmark(b: Bookmark): Bookmark {
  return {
    ...b,
    tags: b.tags ?? [],
    notes: b.notes ?? [],
    metadata: b.metadata ?? {},
    is_favorited: b.is_favorited ?? false,
    synced: b.synced ?? false,
  }
}

export function useBookmarks() {
  const db = useSupabase()
  const queryClient = useQueryClient()
  const toast = useToast()

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await db
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as Bookmark[]).map(normalizeBookmark)
    },
  })

  const addBookmark = useMutation({
    mutationFn: async (bookmark: { url: string; title?: string; source_type?: string; tags?: string[]; notes?: Bookmark['notes'] }) => {
      const { data, error } = await db
        .from('bookmarks')
        .insert({
          url: bookmark.url,
          title: bookmark.title || null,
          source_type: bookmark.source_type || 'auto',
          tags: bookmark.tags || [],
          notes: bookmark.notes || [],
          status: 'unread',
          is_favorited: false,
          metadata: {},
          synced: false,
        })
        .select()
        .single()
      if (error) throw error
      return normalizeBookmark(data as Bookmark)
    },
    onSuccess: (newBookmark) => {
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old ? [newBookmark, ...old] : [newBookmark]
      )
      toast.success('Bookmark added')
      // Auto-fetch metadata in background
      autoFetchMetadata(newBookmark)
    },
    onError: () => toast.error('Failed to add bookmark'),
  })

  const deleteBookmark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('bookmarks').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY)
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.filter((b) => b.id !== id)
      )
      return { prev }
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev)
      toast.error('Failed to delete')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const cycleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: Status }) => {
      const { error } = await db
        .from('bookmarks')
        .update({ status: newStatus })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY)
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev)
      toast.error('Update failed')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, is_favorited }: { id: string; is_favorited: boolean }) => {
      const { error } = await db
        .from('bookmarks')
        .update({ is_favorited })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, is_favorited }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY)
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.map((b) => (b.id === id ? { ...b, is_favorited } : b))
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev)
      toast.error('Update failed')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  async function autoFetchMetadata(bookmark: Bookmark) {
    if (bookmark.title && bookmark.image) return
    try {
      const result = await fetchMetadata(bookmark.url, bookmark.source_type)
      const updates: Record<string, unknown> = {}
      if (result.title && !bookmark.title) updates.title = result.title
      if (result.image && !bookmark.image) updates.image = result.image
      if (result.metadata) {
        updates.metadata = { ...bookmark.metadata, ...result.metadata }
      }
      if (Object.keys(updates).length === 0) return

      const { error } = await db.from('bookmarks').update(updates).eq('id', bookmark.id)
      if (!error) {
        queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
          old?.map((b) => (b.id === bookmark.id ? { ...b, ...updates } : b))
        )
      }
    } catch {
      // Silent fail for metadata — non-critical
    }
  }

  return {
    bookmarks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addBookmark,
    deleteBookmark,
    cycleStatus,
    toggleFavorite,
  }
}

// Re-export for convenience
export { STATUS_NEXT } from '../types'
