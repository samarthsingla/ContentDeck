import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { SourceType, Status, SortOption, ViewMode } from '../types'

interface UIState {
  currentView: ViewMode
  currentSource: SourceType | 'all'
  currentStatus: Status | 'all'
  searchQuery: string
  currentSort: SortOption
  selectMode: boolean
  selectedIds: Set<string>
}

interface UIActions {
  setView: (view: ViewMode) => void
  setSource: (source: SourceType | 'all') => void
  setStatus: (status: Status | 'all') => void
  setSearch: (query: string) => void
  setSort: (sort: SortOption) => void
  toggleSelectMode: () => void
  toggleSelected: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
}

const UIContext = createContext<(UIState & UIActions) | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewMode>(
    () => (localStorage.getItem('view') as ViewMode) ?? 'list'
  )
  const [currentSource, setCurrentSource] = useState<SourceType | 'all'>('all')
  const [currentStatus, setCurrentStatus] = useState<Status | 'all'>('unread')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentSort, setCurrentSort] = useState<SortOption>('newest')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const setView = useCallback((view: ViewMode) => {
    setCurrentView(view)
    localStorage.setItem('view', view)
  }, [])

  const setSource = useCallback((source: SourceType | 'all') => setCurrentSource(source), [])
  const setStatus = useCallback((status: Status | 'all') => setCurrentStatus(status), [])
  const setSearch = useCallback((query: string) => setSearchQuery(query), [])
  const setSort = useCallback((sort: SortOption) => setCurrentSort(sort), [])

  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) setSelectedIds(new Set())
      return !prev
    })
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectMode(false)
  }, [])

  const value = useMemo(
    () => ({
      currentView, currentSource, currentStatus, searchQuery, currentSort,
      selectMode, selectedIds,
      setView, setSource, setStatus, setSearch, setSort,
      toggleSelectMode, toggleSelected, selectAll, clearSelection,
    }),
    [currentView, currentSource, currentStatus, searchQuery, currentSort,
     selectMode, selectedIds, setView, setSource, setStatus, setSearch, setSort,
     toggleSelectMode, toggleSelected, selectAll, clearSelection]
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
