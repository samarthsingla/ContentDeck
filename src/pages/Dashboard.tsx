import { useState, useMemo, useCallback } from 'react'
import AppShell from '../components/layout/AppShell'
import SourceTabs from '../components/feed/SourceTabs'
import FeedToolbar from '../components/feed/FeedToolbar'
import BookmarkList from '../components/feed/BookmarkList'
import AddBookmarkModal from '../components/modals/AddBookmarkModal'
import { useBookmarks } from '../hooks/useBookmarks'
import { useUI } from '../context/UIProvider'
import type { Status } from '../types'

export default function Dashboard({ onDisconnect }: { onDisconnect: () => void }) {
  const { bookmarks, isLoading, addBookmark, deleteBookmark, cycleStatus, toggleFavorite } = useBookmarks()
  const { currentStatus } = useUI()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Compute counts for current source filter (applied across the sidebar/bottom nav)
  const counts = useMemo(() => {
    return {
      unread: bookmarks.filter((b) => b.status === 'unread').length,
      reading: bookmarks.filter((b) => b.status === 'reading').length,
      done: bookmarks.filter((b) => b.status === 'done').length,
      favorited: bookmarks.filter((b) => b.is_favorited).length,
    }
  }, [bookmarks])

  // Filtered bookmarks for the current status (for source tabs to count correctly)
  const statusFiltered = useMemo(() => {
    if (currentStatus === 'all') return bookmarks
    return bookmarks.filter((b) => b.status === currentStatus)
  }, [bookmarks, currentStatus])

  const handleCycleStatus = useCallback(
    (id: string, newStatus: Status) => cycleStatus.mutate({ id, newStatus }),
    [cycleStatus]
  )

  const handleToggleFavorite = useCallback(
    (id: string, is_favorited: boolean) => toggleFavorite.mutate({ id, is_favorited }),
    [toggleFavorite]
  )

  const handleDelete = useCallback(
    (id: string) => deleteBookmark.mutate(id),
    [deleteBookmark]
  )

  return (
    <>
      <AppShell
        counts={counts}
        onAdd={() => setShowAddModal(true)}
        onDisconnect={onDisconnect}
        onToggleSearch={() => setShowSearch((s) => !s)}
        showSearch={showSearch}
      >
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {/* Source Tabs */}
          <SourceTabs bookmarks={statusFiltered} />

          {/* Toolbar: search, sort, status filters (desktop) */}
          <FeedToolbar bookmarks={statusFiltered} showSearch={showSearch} />

          {/* Bookmark List */}
          <BookmarkList
            bookmarks={bookmarks}
            isLoading={isLoading}
            onCycleStatus={handleCycleStatus}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
          />
        </div>
      </AppShell>

      {/* Add Modal */}
      <AddBookmarkModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) => addBookmark.mutate(data)}
        isPending={addBookmark.isPending}
      />
    </>
  )
}
