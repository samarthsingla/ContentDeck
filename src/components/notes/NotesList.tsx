import { Plus, FileText } from 'lucide-react';
import { useUI } from '../../context/UIProvider';
import Spinner from '../ui/Spinner';
import StandaloneNoteCard from './StandaloneNoteCard';
import type { StandaloneNote } from '../../types';

interface NotesListProps {
  notes: StandaloneNote[];
  isLoading: boolean;
  onNoteClick: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onCreateNote: () => void;
}

export default function NotesList({
  notes,
  isLoading,
  onNoteClick,
  onDeleteNote,
  onCreateNote,
}: NotesListProps) {
  const { searchQuery } = useUI();

  const filtered = searchQuery
    ? notes.filter((n) => {
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || (n.content ?? '').toLowerCase().includes(q);
      })
    : notes;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Notes {!isLoading && `(${filtered.length})`}
        </h2>
        <button
          onClick={onCreateNote}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors min-h-[44px]"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size={32} />
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={48} className="text-surface-300 dark:text-surface-600 mb-4" />
          {searchQuery ? (
            <p className="text-surface-500 dark:text-surface-400">
              No notes match &ldquo;{searchQuery}&rdquo;
            </p>
          ) : (
            <>
              <p className="text-surface-600 dark:text-surface-400 font-medium mb-1">
                No notes yet
              </p>
              <p className="text-sm text-surface-400 dark:text-surface-500 mb-6">
                Capture your thoughts and link them to bookmarks
              </p>
              <button
                onClick={onCreateNote}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors min-h-[44px]"
              >
                <Plus size={16} />
                Create your first note
              </button>
            </>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0">
          {filtered.map((note) => (
            <li key={note.id}>
              <StandaloneNoteCard note={note} onClick={onNoteClick} onDelete={onDeleteNote} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
