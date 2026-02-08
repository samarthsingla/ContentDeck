import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import ProgressBar from '../components/ui/ProgressBar'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { exportToFileSystem, exportToClipboard } from '../lib/obsidian'
import { fetchMetadata } from '../lib/metadata'
import { suggestTags } from '../lib/ai'
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
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showAreaManager, setShowAreaManager] = useState(false)
  const [editingArea, setEditingArea] = useState<TagArea | null>(null)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null)
  const [metaProgress, setMetaProgress] = useState<{ current: number; total: number } | null>(null)
  const metaFetchedRef = useRef(false)
  const aiTaggedRef = useRef(false)

  // Keyboard shortcuts
  useKeyboardShortcuts(useMemo(() => ({
    onSearch: () => setShowSearch(true),
    onNewBookmark: () => setShowAddModal(true),
    onNavigateUp: () => {/* j/k navigation handled at list level */},
    onNavigateDown: () => {/* j/k navigation handled at list level */},
    onEscape: () => {
      if (selectedBookmark) setSelectedBookmark(null)
      else if (editingBookmark) setEditingBookmark(null)
      else if (showSearch) setShowSearch(false)
    },
  }), [selectedBookmark, editingBookmark, showSearch]))

  // Refs to access current values without triggering effect re-runs
  const bookmarksRef = useRef(bookmarks)
  bookmarksRef.current = bookmarks
  const toastRef = useRef(toast)
  toastRef.current = toast

  // Auto-fetch missing metadata on first load
  useEffect(() => {
    if (isLoading || metaFetchedRef.current) return
    const currentBookmarks = bookmarksRef.current
    if (currentBookmarks.length === 0) return
    metaFetchedRef.current = true

    const missing = currentBookmarks.filter((b) => !b.title && !b.image)
    if (missing.length === 0) return

    let cancelled = false
    async function fetchAll() {
      setMetaProgress({ current: 0, total: missing.length })
      for (let i = 0; i < missing.length; i++) {
        if (cancelled) break
        const b = missing[i]!
        try {
          const result = await fetchMetadata(b.url, b.source_type)
          if (result.title || result.image) {
            const updates: Record<string, unknown> = {}
            if (result.title) updates.title = result.title
            if (result.image) updates.image = result.image
            if (result.metadata) updates.metadata = { ...b.metadata, ...result.metadata }
            void fetch(`${credentials.url}/rest/v1/bookmarks?id=eq.${b.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': credentials.key,
                'Authorization': `Bearer ${credentials.key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify(updates),
            })
          }
        } catch { /* skip */ }
        setMetaProgress({ current: i + 1, total: missing.length })
      }
      setMetaProgress(null)
      // Invalidate to pick up metadata updates
      void queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    }
    fetchAll()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, credentials])

  // Auto-tag untagged bookmarks via AI on load
  useEffect(() => {
    if (isLoading || aiTaggedRef.current) return
    const currentBookmarks = bookmarksRef.current
    if (currentBookmarks.length === 0) return
    const apiKey = localStorage.getItem('openrouter_key')
    if (!apiKey) return
    aiTaggedRef.current = true

    const untagged = currentBookmarks.filter((b) => !b.tags || b.tags.length === 0)
    if (untagged.length === 0) return

    const allTags = [...new Set(currentBookmarks.flatMap((b) => b.tags))]

    let cancelled = false
    async function tagAll() {
      for (const b of untagged) {
        if (cancelled) break
        try {
          const { tags } = await suggestTags(b, [...allTags])
          if (tags.length === 0) continue
          await fetch(`${credentials.url}/rest/v1/bookmarks?id=eq.${b.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': credentials.key,
              'Authorization': `Bearer ${credentials.key}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ tags }),
          })
          for (const t of tags) {
            if (!allTags.includes(t)) allTags.push(t)
          }
          toastRef.current.info(`AI tagged "${b.title || 'bookmark'}": ${tags.join(', ')}`)
        } catch { /* skip */ }
      }
      if (!cancelled) {
        void queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      }
    }
    tagAll()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, credentials])

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
      if (success) {
        markSynced.mutate(bookmark.id)
        toast.success('Exported to Obsidian')
      }
    } else {
      success = await exportToClipboard(bookmark)
      if (success) {
        markSynced.mutate(bookmark.id)
        toast.info('Markdown copied to clipboard')
      }
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
          {metaProgress && (
            <ProgressBar
              current={metaProgress.current}
              total={metaProgress.total}
              label={`Fetching metadata ${metaProgress.current}/${metaProgress.total}`}
            />
          )}
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
