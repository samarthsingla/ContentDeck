import { useState, useMemo, useCallback } from 'react'
import AppShell from '../components/layout/AppShell'
import SourceTabs from '../components/feed/SourceTabs'
import FeedToolbar from '../components/feed/FeedToolbar'
import BookmarkList from '../components/feed/BookmarkList'
import AreasView from '../components/areas/AreasView'
import AreaManager from '../components/areas/AreaManager'
import DetailPanel from '../components/detail/DetailPanel'
import AddBookmarkModal from '../components/modals/AddBookmarkModal'
import EditBookmarkModal from '../components/modals/EditBookmarkModal'
import SettingsModal from '../components/modals/SettingsModal'
import StatsModal from '../components/modals/StatsModal'
import BulkActionBar from '../components/modals/BulkActionBar'
import { useBookmarks } from '../hooks/useBookmarks'
import { useTagAreas } from '../hooks/useTagAreas'
import { useStats } from '../hooks/useStats'
import { useUI } from '../context/UIProvider'
import { useToast } from '../components/ui/Toast'
import { exportToFileSystem, exportToClipboard } from '../lib/obsidian'
import type { Bookmark, Status, NoteType, TagArea, Credentials } from '../types'

interface DashboardProps {
  credentials: Credentials
  onDisconnect: () => void
}

export default function Dashboard({ credentials, onDisconnect }: DashboardProps) {
  const {
    bookmarks, isLoading,
    addBookmark, updateBookmark, deleteBookmark,
    bulkUpdateStatus, bulkDelete,
    cycleStatus, toggleFavorite,
    addNote, deleteNote, markSynced,
  } = useBookmarks()
  const { areas, createArea, updateArea, deleteArea, reorderAreas } = useTagAreas()
  const { stats, isLoading: statsLoading } = useStats(bookmarks)
  const { currentStatus, currentView, selectMode, selectedIds, clearSelection, setTag, setView } = useUI()
  const toast = useToast()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showAreaManager, setShowAreaManager] = useState(false)
  const [editingArea, setEditingArea] = useState<TagArea | null>(null)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null)

  // Compute counts
  const counts = useMemo(() => ({
    unread: bookmarks.filter((b) => b.status === 'unread').length,
    reading: bookmarks.filter((b) => b.status === 'reading').length,
    done: bookmarks.filter((b) => b.status === 'done').length,
    favorited: bookmarks.filter((b) => b.is_favorited).length,
  }), [bookmarks])

  // Status-filtered bookmarks for source tabs
  const statusFiltered = useMemo(() => {
    if (currentStatus === 'all') return bookmarks
    return bookmarks.filter((b) => b.status === currentStatus)
  }, [bookmarks, currentStatus])

  // Keep selectedBookmark in sync with bookmarks data
  const activeBookmark = useMemo(() => {
    if (!selectedBookmark) return null
    return bookmarks.find((b) => b.id === selectedBookmark.id) ?? null
  }, [selectedBookmark, bookmarks])

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

  const handleBookmarkClick = useCallback(
    (id: string) => {
      const bm = bookmarks.find((b) => b.id === id)
      if (bm) setSelectedBookmark(bm)
    },
    [bookmarks]
  )

  const handleAddNote = useCallback(
    (bookmarkId: string, type: NoteType, content: string) => {
      addNote.mutate({ bookmarkId, type, content })
    },
    [addNote]
  )

  const handleDeleteNote = useCallback(
    (bookmarkId: string, noteIndex: number) => {
      deleteNote.mutate({ bookmarkId, noteIndex })
    },
    [deleteNote]
  )

  async function handleExport(bookmark: Bookmark) {
    const vaultFolder = localStorage.getItem('obsidian_vault') ?? 'ContentDeck'
    let success: boolean
    if ('showDirectoryPicker' in window) {
      success = await exportToFileSystem(bookmark, vaultFolder)
    } else {
      success = await exportToClipboard(bookmark)
      if (success) toast.info('Markdown copied to clipboard (File System API not available)')
    }
    if (success) {
      markSynced.mutate(bookmark.id)
      toast.success('Exported to Obsidian')
    }
  }

  // Area interactions
  function handleAreaClick(areaName: string) {
    if (areaName === '__untagged__') {
      setTag('__untagged__')
    } else {
      setTag(areaName)
    }
    setView('list')
  }

  function handleEditArea(area: TagArea) {
    setEditingArea(area)
    setShowAreaManager(true)
  }

  // Bulk operations
  function handleBulkStatus(status: Status) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    bulkUpdateStatus.mutate({ ids, status })
    clearSelection()
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (confirm(`Delete ${ids.length} bookmarks?`)) {
      bulkDelete.mutate(ids)
      clearSelection()
    }
  }

  return (
    <>
      <div className="flex h-screen bg-surface-50 dark:bg-surface-950">
        <AppShell
          counts={counts}
          onAdd={() => setShowAddModal(true)}
          onDisconnect={onDisconnect}
          onToggleSearch={() => setShowSearch((s) => !s)}
          onSettings={() => setShowSettings(true)}
          onStats={() => setShowStats(true)}
          showSearch={showSearch}
        >
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
            {currentView === 'areas' ? (
              <AreasView
                areas={areas}
                bookmarks={statusFiltered}
                onAreaClick={handleAreaClick}
                onEditArea={handleEditArea}
                onManageAreas={() => { setEditingArea(null); setShowAreaManager(true) }}
              />
            ) : (
              <>
                <SourceTabs bookmarks={statusFiltered} />
                <FeedToolbar bookmarks={statusFiltered} showSearch={showSearch} />
                <BookmarkList
                  bookmarks={bookmarks}
                  isLoading={isLoading}
                  onCycleStatus={handleCycleStatus}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                  onClick={handleBookmarkClick}
                />
              </>
            )}
          </div>
        </AppShell>

        {/* Desktop Detail Panel */}
        {activeBookmark && (
          <DetailPanel
            bookmark={activeBookmark}
            onClose={() => setSelectedBookmark(null)}
            onCycleStatus={handleCycleStatus}
            onToggleFavorite={handleToggleFavorite}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onEdit={(bm) => setEditingBookmark(bm)}
            onExport={handleExport}
            onDelete={(id) => { handleDelete(id); setSelectedBookmark(null) }}
            isNotePending={addNote.isPending}
          />
        )}
      </div>

      {/* Modals */}
      <AddBookmarkModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) => addBookmark.mutate(data)}
        isPending={addBookmark.isPending}
      />

      <EditBookmarkModal
        open={editingBookmark !== null}
        bookmark={editingBookmark}
        onClose={() => setEditingBookmark(null)}
        onSave={(id, updates) => updateBookmark.mutate({ id, ...updates })}
        isPending={updateBookmark.isPending}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        credentials={credentials}
        onDisconnect={onDisconnect}
      />

      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        isLoading={statsLoading}
      />

      <AreaManager
        open={showAreaManager}
        onClose={() => { setShowAreaManager(false); setEditingArea(null) }}
        areas={areas}
        editingArea={editingArea}
        onCreate={(data) => createArea.mutate(data)}
        onUpdate={(id, data) => updateArea.mutate({ id, ...data })}
        onDelete={(id) => deleteArea.mutate(id)}
        onReorder={(ids) => reorderAreas.mutate(ids)}
      />

      {/* Bulk Action Bar */}
      {selectMode && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onChangeStatus={handleBulkStatus}
          onDelete={handleBulkDelete}
          onCancel={clearSelection}
        />
      )}
    </>
  )
}
