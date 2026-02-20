import { Trash2, Link } from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import type { StandaloneNote } from '../../types';

interface StandaloneNoteCardProps {
  note: StandaloneNote;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export default function StandaloneNoteCard({ note, onClick, onDelete }: StandaloneNoteCardProps) {
  const preview = stripHtml(note.content ?? '')
    .slice(0, 100)
    .trimEnd();
  const linkedCount = note.linked_bookmarks?.length ?? 0;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(note.id);
    }
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('Delete this note?')) {
      onDelete(note.id);
    }
  }

  function handleDeleteKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      if (confirm('Delete this note?')) {
        onDelete(note.id);
      }
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(note.id)}
      onKeyDown={handleKeyDown}
      className="group relative p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
    >
      {/* Title */}
      <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 line-clamp-2 mb-1.5">
        {note.title || 'Untitled Note'}
      </h3>

      {/* Content preview */}
      {preview && (
        <p className="text-sm text-surface-500 dark:text-surface-400 line-clamp-2 mb-3">
          {preview}
          {stripHtml(note.content ?? '').length > 100 ? '…' : ''}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center gap-2 mt-auto">
        {/* Area pills */}
        {(note.areas ?? []).map((area) => (
          <span
            key={area.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
          >
            {area.emoji && <span>{area.emoji}</span>}
            {area.name}
          </span>
        ))}

        <div className="flex items-center gap-3 ml-auto">
          {/* Linked bookmarks */}
          {linkedCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-surface-400 dark:text-surface-500">
              <Link size={10} />
              {linkedCount}
            </span>
          )}

          {/* Timestamp */}
          <span className="text-[10px] text-surface-400 dark:text-surface-500">
            {timeAgo(note.updated_at)}
          </span>
        </div>
      </div>

      {/* Hover-reveal delete */}
      <button
        onClick={handleDeleteClick}
        onKeyDown={handleDeleteKeyDown}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 transition-opacity min-w-[36px] min-h-[36px] flex items-center justify-center"
        aria-label="Delete note"
        tabIndex={-1}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
