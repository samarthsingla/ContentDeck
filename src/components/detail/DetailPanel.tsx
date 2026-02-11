import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import MetadataHeader from './MetadataHeader';
import NotesTab from './NotesTab';
import DetailActions from './DetailActions';
import type { Bookmark, Status, NoteType } from '../../types';

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
  isNotePending: boolean;
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
  isNotePending,
}: DetailPanelProps) {
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

  function handleDelete() {
    if (confirm('Delete this bookmark?')) {
      onDelete(bookmark!.id);
      onClose();
    }
  }

  return (
    <>
      {/* Mobile: full-screen slide-up overlay */}
      <div
        ref={overlayRef}
        className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Bookmark details"
      >
        <div
          ref={panelRef}
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
            />
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
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[36px] min-h-[36px] flex items-center justify-center"
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
          />
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
