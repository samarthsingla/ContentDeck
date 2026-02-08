import { useEffect } from 'react'

interface ShortcutActions {
  onSearch: () => void
  onNewBookmark: () => void
  onNavigateUp: () => void
  onNavigateDown: () => void
  onEscape: () => void
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Only handle Escape in inputs
        if (e.key === 'Escape') {
          target.blur()
        }
        return
      }

      switch (e.key) {
        case '/':
          e.preventDefault()
          actions.onSearch()
          // Focus the first visible search input
          requestAnimationFrame(() => {
            const input = document.querySelector<HTMLInputElement>('input[type="search"]')
            input?.focus()
          })
          break
        case 'n':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            actions.onNewBookmark()
          }
          break
        case 'k':
          if (!e.ctrlKey && !e.metaKey) {
            actions.onNavigateUp()
          }
          break
        case 'j':
          if (!e.ctrlKey && !e.metaKey) {
            actions.onNavigateDown()
          }
          break
        case 'Escape':
          actions.onEscape()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [actions])
}
