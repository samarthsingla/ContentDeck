import { Star, List, LayoutGrid, FileText, Brain } from 'lucide-react';
import { useUI } from '../../context/UIProvider';

interface MobileNavProps {
  counts: { unread: number; reading: number; done: number; favorited: number };
  noteCount: number;
  dueCount: number;
}

export default function MobileNav({ counts, noteCount, dueCount }: MobileNavProps) {
  const { currentView, setView, showFavorites, setFavorites, setTag, setStatus } = useUI();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-t border-surface-200 dark:border-surface-800"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center">
        {/* Favorites */}
        <button
          onClick={() => {
            setFavorites(true);
            setStatus('all');
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] transition-colors
            ${showFavorites ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}
          `}
          aria-label={`Favorites (${counts.favorited})`}
          aria-current={showFavorites ? 'page' : undefined}
        >
          <Star size={20} />
          <span className="text-[10px] font-medium">Favorites</span>
          {counts.favorited > 0 && <span className="text-[10px]">{counts.favorited}</span>}
        </button>

        {/* Notes */}
        <button
          onClick={() => {
            setView('notes');
            setTag(null);
            setFavorites(false);
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] transition-colors
            ${currentView === 'notes' ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}
          `}
          aria-label={`Notes (${noteCount})`}
          aria-current={currentView === 'notes' ? 'page' : undefined}
        >
          <FileText size={20} />
          <span className="text-[10px] font-medium">Notes</span>
          {noteCount > 0 && <span className="text-[10px]">{noteCount}</span>}
        </button>

        {/* Review */}
        <button
          onClick={() => {
            setView('review');
            setTag(null);
            setFavorites(false);
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] transition-colors
            ${currentView === 'review' ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}
          `}
          aria-label={`Review${dueCount > 0 ? ` (${dueCount} due)` : ''}`}
          aria-current={currentView === 'review' ? 'page' : undefined}
        >
          <Brain size={20} />
          <span className="text-[10px] font-medium">Review</span>
          {dueCount > 0 && (
            <span className="text-[10px] text-orange-500 font-medium">{dueCount}</span>
          )}
        </button>

        {/* View toggle */}
        <button
          onClick={() => setView(currentView === 'list' ? 'areas' : 'list')}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] text-surface-400 dark:text-surface-500"
          aria-label={`Switch to ${currentView === 'list' ? 'areas' : 'list'} view`}
        >
          {currentView === 'list' || currentView === 'notes' || currentView === 'review' ? (
            <LayoutGrid size={20} />
          ) : (
            <List size={20} />
          )}
          <span className="text-[10px] font-medium">
            {currentView === 'list' || currentView === 'notes' || currentView === 'review'
              ? 'Areas'
              : 'List'}
          </span>
        </button>
      </div>
    </nav>
  );
}
