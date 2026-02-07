import { useUI } from '../../context/UIProvider'
import { SOURCE_LIST, SOURCE_LABELS } from '../../types'
import type { Bookmark, SourceType } from '../../types'

export default function SourceTabs({ bookmarks }: { bookmarks: Bookmark[] }) {
  const { currentSource, setSource } = useUI()

  const counts = SOURCE_LIST.reduce<Record<string, number>>(
    (acc, s) => {
      acc[s] = bookmarks.filter((b) => b.source_type === s).length
      return acc
    },
    { all: bookmarks.length }
  )

  const tabs: { key: SourceType | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    ...SOURCE_LIST.map((s) => ({ key: s, label: SOURCE_LABELS[s] })),
  ]

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filter by source">
      {tabs.map(({ key, label }) => {
        const count = counts[key] ?? 0
        const active = currentSource === key
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => setSource(key)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px]
              ${active
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
              }
            `}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1.5 text-xs ${active ? 'text-white/70' : 'text-surface-400 dark:text-surface-500'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
