import { useState, useEffect, useRef, useCallback } from 'react';
import { X, BookOpen, FileText, Plus } from 'lucide-react';
import MetadataHeader from './MetadataHeader';
import NotesTab from './NotesTab';
import DetailActions from './DetailActions';
import ReaderModal from '../reader/ReaderModal';
import type { Bookmark, Status, NoteType, StandaloneNote } from '../../types';

interface DetailPanelProps {
  bookmark: Bookmark | null;
  onClose: () => void;
  onCycleStatus: (id: string, newStatus: Status) => void;
  onToggleFavorite: (id: string, favorited: boolean) => void;
  onAddNote: (bookmarkId: string, type: NoteType, content: string) => void;
  onDeleteNote: (bookmarkId: string, noteIndex: number) => void;
  onEdit: (bookmark: Bookmark) => void;
  onExport: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onRefreshMetadata: (bookmark: Bookmark) => void;
  isNotePending: boolean;
  isRefreshing?: boolean;
  linkedNotes?: StandaloneNote[];
  onPromoteToNote?: (content: string) => void;
  onCreateNoteForBookmark?: (bookmarkId: string) => void;
  onOpenNote?: (noteId: string) => void;
}

export default function DetailPanel({
  bookmark,
  onClose,
  onCycleStatus,
  onToggleFavorite,
  onAddNote,
  onDeleteNote,
  onEdit,
  onExport,
  onDelete,
  onRefreshMetadata,
  isNotePending,
  isRefreshing,
  linkedNotes = [],
  onPromoteToNote,
  onCreateNoteForBookmark,
  onOpenNote,
}: DetailPanelProps) {
  const [showReader, setShowReader] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (bookmark) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [bookmark, handleKeyDown]);

  if (!bookmark) return null;

  const canRead = bookmark.content_status === 'success' && !!bookmark.content?.text;
  const isExtracting =
    bookmark.content_status === 'pending' || bookmark.content_status === 'extracting';

  function handleDelete() {
    if (confirm('Delete this bookmark?')) {
      onDelete(bookmark!.id);
      onClose();
    }
  }

  return (
    <>
      {/* Reader Modal — covers everything */}
      <ReaderModal
        bookmark={bookmark}
        open={showReader}
        onClose={() => setShowReader(false)}
        onCycleStatus={onCycleStatus}
      />

      {/* Mobile: full-screen slide-up overlay */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- backdrop click-to-close is progressive enhancement; keyboard users have ESC via document-level handler */}
      <div
        ref={overlayRef}
        className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Bookmark details"
          className="absolute inset-x-0 bottom-0 top-12 bg-white dark:bg-surface-900 rounded-t-2xl shadow-xl overflow-y-auto motion-safe:animate-[slideUp_0.2s_ease-out]"
          style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}
        >
          {/* Mobile header */}
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 rounded-t-2xl z-10">
            <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 truncate">
              Details
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-6">
            <MetadataHeader
              bookmark={bookmark}
              onCycleStatus={onCycleStatus}
              onToggleFavorite={onToggleFavorite}
              onRefreshMetadata={onRefreshMetadata}
              isRefreshing={isRefreshing}
            />
            {(canRead || isExtracting) && (
              <button
                onClick={() => setShowReader(true)}
                disabled={!canRead}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                aria-label={isExtracting ? 'Extracting content…' : 'Open reader mode'}
              >
                <BookOpen size={16} />
                {isExtracting ? 'Extracting…' : 'Read'}
              </button>
            )}
            <NotesTab
              notes={bookmark.notes}
              onAddNote={(type, content) => onAddNote(bookmark.id, type, content)}
              onDeleteNote={(index) => onDeleteNote(bookmark.id, index)}
              isPending={isNotePending}
              onPromoteToNote={onPromoteToNote}
            />
            {/* Linked standalone notes */}
            {(linkedNotes.length > 0 || onCreateNoteForBookmark) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={12} />
                    Linked Notes ({linkedNotes.length})
                  </h4>
                  {onCreateNoteForBookmark && (
                    <button
                      onClick={() => onCreateNoteForBookmark(bookmark.id)}
                      className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
                      aria-label="Create linked note"
                    >
                      <Plus size={12} />
                      New
                    </button>
                  )}
                </div>
                {linkedNotes.map((ln) => (
                  <button
                    key={ln.id}
                    onClick={() => onOpenNote?.(ln.id)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate">
                      {ln.title || 'Untitled Note'}
                    </p>
                  </button>
                ))}
              </div>
            )}
            <DetailActions
              bookmark={bookmark}
              onEdit={() => {
                onClose();
                onEdit(bookmark);
              }}
              onExport={() => onExport(bookmark)}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>

      {/* Desktop: right column panel */}
      <aside className="hidden lg:flex flex-col w-[400px] h-screen border-l border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 z-10">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-6">
          <MetadataHeader
            bookmark={bookmark}
            onCycleStatus={onCycleStatus}
            onToggleFavorite={onToggleFavorite}
            onRefreshMetadata={onRefreshMetadata}
            isRefreshing={isRefreshing}
          />
          {(canRead || isExtracting) && (
            <button
              onClick={() => setShowReader(true)}
              disabled={!canRead}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              aria-label={isExtracting ? 'Extracting content…' : 'Open reader mode'}
            >
              <BookOpen size={16} />
              {isExtracting ? 'Extracting…' : 'Read'}
            </button>
          )}
          <NotesTab
            notes={bookmark.notes}
            onAddNote={(type, content) => onAddNote(bookmark.id, type, content)}
            onDeleteNote={(index) => onDeleteNote(bookmark.id, index)}
            isPending={isNotePending}
          />
          <DetailActions
            bookmark={bookmark}
            onEdit={() => {
              onClose();
              onEdit(bookmark);
            }}
            onExport={() => onExport(bookmark)}
            onDelete={handleDelete}
          />
        </div>
      </aside>
    </>
  );
}
