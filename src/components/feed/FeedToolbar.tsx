import { CheckSquare, X } from 'lucide-react'
import SearchBar from './SearchBar'
import SortSelect from './SortSelect'
import StatusFilters from './StatusFilters'
import { useUI } from '../../context/UIProvider'
import type { Bookmark } from '../../types'

interface FeedToolbarProps {
  bookmarks: Bookmark[]
  showSearch: boolean
}

export default function FeedToolbar({ bookmarks, showSearch }: FeedToolbarProps) {
  const { currentTag, setTag, toggleSelectMode, selectMode } = useUI()

  return (
    <div className="space-y-3">
      {/* Active tag filter */}
      {currentTag && (
        <div className="lg:hidden flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/10 text-primary-600 dark:text-primary-400 text-sm font-medium">
            {currentTag === '__untagged__' ? 'Untagged' : currentTag}
            <button
              onClick={() => setTag(null)}
              className="hover:text-primary-700 dark:hover:text-primary-300"
              aria-label="Clear tag filter"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Desktop: Search + Sort + Status + Select in one row */}
      <div className="hidden lg:flex items-center gap-3">
        <SearchBar />
        <StatusFilters bookmarks={bookmarks} />
        <SortSelect />
        <button
          onClick={toggleSelectMode}
          className={`p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
            selectMode
              ? 'bg-primary-600/10 text-primary-600 dark:text-primary-400'
              : 'text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
          }`}
          aria-label={selectMode ? 'Exit select mode' : 'Enter select mode'}
          title="Select bookmarks"
        >
          <CheckSquare size={18} />
        </button>
      </div>

      {/* Mobile: Search (toggleable) + Sort */}
      {showSearch && (
        <div className="lg:hidden flex items-center gap-2">
          <SearchBar autoFocus />
          <SortSelect />
        </div>
      )}
    </div>
  )
}
