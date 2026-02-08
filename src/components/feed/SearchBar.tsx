import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { useUI } from '../../context/UIProvider'

export interface SearchBarHandle {
  focus: () => void
}

const SearchBar = forwardRef<SearchBarHandle, { autoFocus?: boolean }>(
  function SearchBar({ autoFocus = false }, ref) {
    const { searchQuery, setSearch } = useUI()
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }))

    useEffect(() => {
      if (autoFocus) inputRef.current?.focus()
    }, [autoFocus])

    return (
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bookmarks..."
          aria-label="Search bookmarks"
          className="w-full pl-9 pr-8 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[40px]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700"
            aria-label="Clear search"
          >
            <X size={14} className="text-surface-400" />
          </button>
        )}
      </div>
    )
  }
)

export default SearchBar
