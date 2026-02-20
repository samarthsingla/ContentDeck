import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AppShell from '../components/layout/AppShell';
import SourceTabs from '../components/feed/SourceTabs';
import FeedToolbar from '../components/feed/FeedToolbar';
import BookmarkList from '../components/feed/BookmarkList';
import AreasView from '../components/areas/AreasView';
import AreaManager from '../components/areas/AreaManager';
import DetailPanel from '../components/detail/DetailPanel';
import NotesList from '../components/notes/NotesList';
import NoteEditorModal from '../components/notes/NoteEditorModal';
import AddBookmarkModal from '../components/modals/AddBookmarkModal';
import EditBookmarkModal from '../components/modals/EditBookmarkModal';
import SettingsModal from '../components/modals/SettingsModal';
import StatsModal from '../components/modals/StatsModal';
import BulkActionBar from '../components/modals/BulkActionBar';
import { useBookmarks } from '../hooks/useBookmarks';
import { useTagAreas } from '../hooks/useTagAreas';
import { useStats } from '../hooks/useStats';
import { useNotes } from '../hooks/useNotes';
import { useLinkedNoteIds } from '../hooks/useLinkedNoteIds';
import { useUI } from '../context/UIProvider';
import { useSupabase } from '../context/SupabaseProvider';
import { useToast } from '../components/ui/Toast';
import ProgressBar from '../components/ui/ProgressBar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { exportToObsidianUri, exportToClipboard } from '../lib/obsidian';
import { fetchMetadata } from '../lib/metadata';
import type { Bookmark, Status, TagArea, StandaloneNote } from '../types';

interface DashboardProps {
  userEmail: string | null;
  onSignOut: () => void;
  isDemo?: boolean;
  sharedUrl?: string | null;
}

export default function Dashboard({ userEmail, onSignOut, isDemo, sharedUrl }: DashboardProps) {
  const {
    bookmarks,
    isLoading,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    bulkUpdateStatus,
    bulkDelete,
    cycleStatus,
    toggleFavorite,
    updateScratchpad,
    markSynced,
    refreshMetadata,
    setAreas: setBookmarkAreas,
    autoSuggestTags,
  } = useBookmarks();
  const { areas, createArea, updateArea, deleteArea, reorderAreas } = useTagAreas();
  const { stats, isLoading: statsLoading } = useStats(bookmarks);
  const {
    notes,
    isLoading: notesLoading,
    createNote,
    updateNote,
    deleteNote: deleteStandaloneNote,
  } = useNotes();
  const { currentStatus, currentView, selectMode, selectedIds, clearSelection, setTag, setView } =
    useUI();
  const toast = useToast();
  const queryClient = useQueryClient();
  const db = useSupabase();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAreaManager, setShowAreaManager] = useState(false);
  const [editingArea, setEditingArea] = useState<TagArea | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState<StandaloneNote | null>(null);
  const [noteInitialBookmarkId, setNoteInitialBookmarkId] = useState<string | null>(null);
  const [metaProgress, setMetaProgress] = useState<{ current: number; total: number } | null>(null);
  const [isRefreshingMeta, setIsRefreshingMeta] = useState(false);
  const metaFetchedRef = useRef(false);

  // Linked notes for selected bookmark
  const { data: linkedNoteIds = [] } = useLinkedNoteIds(selectedBookmark?.id ?? null);
  const linkedNotesForBookmark = useMemo(
    () => notes.filter((n) => linkedNoteIds.includes(n.id)),
    [notes, linkedNoteIds],
  );

  // Keyboard shortcuts
  useKeyboardShortcuts(
    useMemo(
      () => ({
        onSearch: () => setShowSearch(true),
        onNewBookmark: () => setShowAddModal(true),
        onNavigateUp: () => {
          /* j/k navigation handled at list level */
        },
        onNavigateDown: () => {
          /* j/k navigation handled at list level */
        },
        onEscape: () => {
          if (selectedBookmark) setSelectedBookmark(null);
          else if (editingBookmark) setEditingBookmark(null);
          else if (showSearch) setShowSearch(false);
        },
      }),
      [selectedBookmark, editingBookmark, showSearch],
    ),
  );

  // Refs to access current values without triggering effect re-runs
  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Auto-fetch missing metadata on first load, then auto-tag untagged bookmarks.
  // Chained into one effect so AI tagging reads enriched data (with titles/excerpts).
  useEffect(() => {
    if (isDemo || isLoading || metaFetchedRef.current) return;
    const currentBookmarks = bookmarksRef.current;
    if (currentBookmarks.length === 0) return;
    metaFetchedRef.current = true;

    let cancelled = false;

    async function enrichAndTag() {
      // Phase 1: Fetch missing metadata
      const missing = currentBookmarks.filter((b) => !b.title);
      if (missing.length > 0) {
        setMetaProgress({ current: 0, total: missing.length });
        const BATCH_SIZE = 3;
        for (let i = 0; i < missing.length; i += BATCH_SIZE) {
          if (cancelled) break;
          const batch = missing.slice(i, i + BATCH_SIZE);
          await Promise.allSettled(
            batch.map(async (b) => {
              try {
                const result = await fetchMetadata(b.url, b.source_type);
                const updates: Record<string, unknown> = {};
                if (result.title) updates.title = result.title;
                if (result.image && !b.image) updates.image = result.image;
                if (result.excerpt && !b.excerpt) updates.excerpt = result.excerpt;
                if (result.metadata) updates.metadata = { ...b.metadata, ...result.metadata };
                if (Object.keys(updates).length > 0) {
                  void db.from('bookmarks').update(updates).eq('id', b.id);
                }
              } catch {
                /* skip */
              }
            }),
          );
          setMetaProgress({
            current: Math.min(i + BATCH_SIZE, missing.length),
            total: missing.length,
          });
        }
        setMetaProgress(null);
        // Refresh cache so phase 2 reads enriched bookmarks
        await queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      }

      if (cancelled) return;

      // Phase 2: AI-tag untagged bookmarks using fresh cache data
      const apiKey = localStorage.getItem('openrouter_key');
      if (!apiKey) return;

      const freshBookmarks =
        queryClient.getQueryData<Bookmark[]>(['bookmarks']) ?? currentBookmarks;
      const untagged = freshBookmarks.filter(
        (b) => (!b.tags || b.tags.length === 0) && (!b.areas || b.areas.length === 0),
      );
      if (untagged.length === 0) return;

      for (const b of untagged) {
        if (cancelled) break;
        try {
          await autoSuggestTags(b, areas);
        } catch {
          /* skip */
        }
      }
      if (!cancelled) {
        void queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      }
    }

    void enrichAndTag();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, isLoading]);

  // Open add modal with shared URL (PWA share target)
  useEffect(() => {
    if (sharedUrl && !isLoading) {
      setShowAddModal(true);
      // Clean query params from URL bar
      if (window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [sharedUrl, isLoading]);

  // Compute counts
  const counts = useMemo(
    () => ({
      unread: bookmarks.filter((b) => b.status === 'unread').length,
      reading: bookmarks.filter((b) => b.status === 'reading').length,
      done: bookmarks.filter((b) => b.status === 'done').length,
      favorited: bookmarks.filter((b) => b.is_favorited).length,
    }),
    [bookmarks],
  );

  // All unique tags across bookmarks (for autocomplete)
  const allTags = useMemo(() => [...new Set(bookmarks.flatMap((b) => b.tags))], [bookmarks]);

  // Bookmark count per area (for AreaManager)
  const bookmarkCountByArea = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookmarks) {
      for (const a of b.areas ?? []) {
        map.set(a.id, (map.get(a.id) ?? 0) + 1);
      }
    }
    return map;
  }, [bookmarks]);

  // Status-filtered bookmarks for source tabs
  const statusFiltered = useMemo(() => {
    if (currentStatus === 'all') return bookmarks;
    return bookmarks.filter((b) => b.status === currentStatus);
  }, [bookmarks, currentStatus]);

  // Keep selectedBookmark in sync with bookmarks data
  const activeBookmark = useMemo(() => {
    if (!selectedBookmark) return null;
    return bookmarks.find((b) => b.id === selectedBookmark.id) ?? null;
  }, [selectedBookmark, bookmarks]);

  const handleCycleStatus = useCallback(
    (id: string, newStatus: Status) => cycleStatus.mutate({ id, newStatus }),
    [cycleStatus],
  );

  const handleToggleFavorite = useCallback(
    (id: string, is_favorited: boolean) => toggleFavorite.mutate({ id, is_favorited }),
    [toggleFavorite],
  );

  const handleDelete = useCallback((id: string) => deleteBookmark.mutate(id), [deleteBookmark]);

  const handleBookmarkClick = useCallback(
    (id: string) => {
      const bm = bookmarks.find((b) => b.id === id);
      if (bm) setSelectedBookmark(bm);
    },
    [bookmarks],
  );

  async function handleRefreshMetadata(bookmark: Bookmark) {
    setIsRefreshingMeta(true);
    try {
      await refreshMetadata(bookmark);
      toast.success('Metadata refreshed');
    } catch {
      toast.error('Could not fetch metadata');
    } finally {
      setIsRefreshingMeta(false);
    }
  }

  async function handleExport(bookmark: Bookmark) {
    const vaultName = localStorage.getItem('obsidian_vault') ?? '';
    if (vaultName) {
      // One-click: open Obsidian directly via URI scheme → Inbox/{Source}/title.md
      const success = exportToObsidianUri(bookmark, vaultName);
      if (success) {
        markSynced.mutate(bookmark.id);
        toast.success(`Exporting to Inbox/${bookmark.source_type}...`);
      }
    } else {
      // No vault configured — copy markdown to clipboard
      const success = await exportToClipboard(bookmark);
      if (success) {
        markSynced.mutate(bookmark.id);
        toast.info('Markdown copied — add vault name in Settings for one-click export');
      }
    }
  }

  async function handleConvertToNote(bookmark: Bookmark) {
    try {
      const newNote = await createNote.mutateAsync({
        title: bookmark.title ?? 'Untitled Note',
        content: bookmark.scratchpad,
      });
      setSelectedNote(newNote);
      setNoteInitialBookmarkId(bookmark.id);
      setShowNoteEditor(true);
    } catch {
      toast.error('Failed to create note');
    }
  }

  // Area interactions
  function handleAreaClick(areaName: string) {
    if (areaName === '__untagged__') {
      setTag('__untagged__');
    } else {
      setTag(areaName);
    }
    setView('list');
  }

  function handleEditArea(area: TagArea) {
    setEditingArea(area);
    setShowAreaManager(true);
  }

  // Bulk operations
  function handleBulkStatus(status: Status) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkUpdateStatus.mutate({ ids, status });
    clearSelection();
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (confirm(`Delete ${ids.length} bookmarks?`)) {
      bulkDelete.mutate(ids);
      clearSelection();
    }
  }

  return (
    <>
      <div className="flex h-screen bg-surface-50 dark:bg-surface-950">
        <AppShell
          counts={counts}
          noteCount={notes.length}
          onAdd={() => setShowAddModal(true)}
          onSignOut={onSignOut}
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
            {currentView === 'notes' ? (
              <NotesList
                notes={notes}
                isLoading={notesLoading}
                onNoteClick={(id) => {
                  const note = notes.find((n) => n.id === id);
                  if (note) {
                    setSelectedNote(note);
                    setNoteInitialBookmarkId(null);
                    setShowNoteEditor(true);
                  }
                }}
                onDeleteNote={(id) => deleteStandaloneNote.mutate(id)}
                onCreateNote={() => {
                  setSelectedNote(null);
                  setNoteInitialBookmarkId(null);
                  setShowNoteEditor(true);
                }}
              />
            ) : currentView === 'areas' ? (
              <AreasView
                areas={areas}
                bookmarks={statusFiltered}
                onAreaClick={handleAreaClick}
                onEditArea={handleEditArea}
                onManageAreas={() => {
                  setEditingArea(null);
                  setShowAreaManager(true);
                }}
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

        {/* Detail Panel (centered modal) */}
        {activeBookmark && (
          <DetailPanel
            bookmark={activeBookmark}
            onClose={() => setSelectedBookmark(null)}
            onCycleStatus={handleCycleStatus}
            onToggleFavorite={handleToggleFavorite}
            onUpdateScratchpad={(id, scratchpad) => updateScratchpad.mutate({ id, scratchpad })}
            onUpdateTitle={(id, title) => updateBookmark.mutate({ id, title })}
            onEdit={(bm) => setEditingBookmark(bm)}
            onExport={handleExport}
            onDelete={(id) => {
              handleDelete(id);
              setSelectedBookmark(null);
            }}
            onRefreshMetadata={handleRefreshMetadata}
            isRefreshing={isRefreshingMeta}
            linkedNotes={linkedNotesForBookmark}
            onCreateNoteForBookmark={(bookmarkId) => {
              setSelectedNote(null);
              setNoteInitialBookmarkId(bookmarkId);
              setView('notes');
              setShowNoteEditor(true);
            }}
            onOpenNote={(noteId) => {
              const note = notes.find((n) => n.id === noteId);
              if (note) {
                setSelectedNote(note);
                setNoteInitialBookmarkId(null);
                setShowNoteEditor(true);
              }
            }}
            onConvertToNote={() => handleConvertToNote(activeBookmark)}
          />
        )}
      </div>

      {/* Modals */}
      <AddBookmarkModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) => {
          const { areaIds, ...bookmarkData } = data;
          addBookmark.mutate(bookmarkData, {
            onSuccess: (newBookmark) => {
              // Assign areas after bookmark is created
              if (areaIds && areaIds.length > 0) {
                const selectedAreas = areas.filter((a) => areaIds.includes(a.id));
                void setBookmarkAreas(newBookmark.id, selectedAreas);
              }
            },
          });
        }}
        isPending={addBookmark.isPending}
        initialUrl={sharedUrl ?? undefined}
        allAreas={areas}
        allTags={allTags}
      />

      <EditBookmarkModal
        open={editingBookmark !== null}
        bookmark={editingBookmark}
        onClose={() => setEditingBookmark(null)}
        onSave={(id, updates, areaIds) => {
          updateBookmark.mutate({ id, ...updates });
          // Update area assignments via junction table
          const selectedAreas = areas.filter((a) => areaIds.includes(a.id));
          void setBookmarkAreas(id, selectedAreas);
        }}
        isPending={updateBookmark.isPending}
        allAreas={areas}
        allTags={allTags}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        userEmail={userEmail}
        onSignOut={onSignOut}
        isDemo={isDemo}
      />

      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        isLoading={statsLoading}
      />

      <AreaManager
        open={showAreaManager}
        onClose={() => {
          setShowAreaManager(false);
          setEditingArea(null);
        }}
        areas={areas}
        editingArea={editingArea}
        bookmarkCountByArea={bookmarkCountByArea}
        onCreate={(data) => createArea.mutate(data)}
        onUpdate={(id, data) => updateArea.mutate({ id, ...data })}
        onDelete={(id) => deleteArea.mutate(id)}
        onReorder={(ids) => reorderAreas.mutate(ids)}
      />

      <NoteEditorModal
        open={showNoteEditor}
        note={selectedNote}
        allBookmarks={bookmarks}
        allAreas={areas}
        initialBookmarkId={noteInitialBookmarkId}
        onClose={() => {
          setShowNoteEditor(false);
          setSelectedNote(null);
          setNoteInitialBookmarkId(null);
        }}
        onSave={(id, updates) => updateNote.mutate({ id, ...updates })}
        onCreate={async (data) => {
          const result = await createNote.mutateAsync(data);
          return result;
        }}
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
  );
}
