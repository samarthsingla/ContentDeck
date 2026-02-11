import NoteCard from './NoteCard';
import NoteComposer from './NoteComposer';
import type { Note, NoteType } from '../../types';

interface NotesTabProps {
  notes: Note[];
  onAddNote: (type: NoteType, content: string) => void;
  onDeleteNote: (index: number) => void;
  isPending: boolean;
}

export default function NotesTab({ notes, onAddNote, onDeleteNote, isPending }: NotesTabProps) {
  return (
    <div className="space-y-4">
      {/* Composer */}
      <NoteComposer onAddNote={onAddNote} isPending={isPending} />

      {/* Notes timeline */}
      {notes.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider">
            Notes ({notes.length})
          </h4>
          {[...notes].reverse().map((note, reversedIndex) => {
            const originalIndex = notes.length - 1 - reversedIndex;
            return (
              <NoteCard
                key={`${note.created_at}-${reversedIndex}`}
                type={note.type}
                content={note.content}
                createdAt={note.created_at}
                onDelete={() => onDeleteNote(originalIndex)}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-6">
          No notes yet. Add your first thought above.
        </p>
      )}
    </div>
  );
}
