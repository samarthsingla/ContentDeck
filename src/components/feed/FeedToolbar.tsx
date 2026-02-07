import SearchBar from './SearchBar'
import SortSelect from './SortSelect'
import StatusFilters from './StatusFilters'
import type { Bookmark } from '../../types'

interface FeedToolbarProps {
  bookmarks: Bookmark[]
  showSearch: boolean
}

export default function FeedToolbar({ bookmarks, showSearch }: FeedToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Desktop: Search + Sort + Status in one row */}
      <div className="hidden lg:flex items-center gap-3">
        <SearchBar />
        <StatusFilters bookmarks={bookmarks} />
        <SortSelect />
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
