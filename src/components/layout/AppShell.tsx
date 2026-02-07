import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'
import MobileNav from './MobileNav'

interface AppShellProps {
  counts: { unread: number; reading: number; done: number; favorited: number }
  onAdd: () => void
  onDisconnect: () => void
  onToggleSearch: () => void
  showSearch: boolean
  children: React.ReactNode
}

export default function AppShell({
  counts,
  onAdd,
  onDisconnect,
  onToggleSearch,
  showSearch,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-950">
      {/* Desktop Sidebar */}
      <Sidebar counts={counts} onAdd={onAdd} onDisconnect={onDisconnect} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobileHeader onAdd={onAdd} onToggleSearch={onToggleSearch} showSearch={showSearch} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(72px + var(--safe-bottom))' }}>
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <MobileNav counts={counts} />
      </div>
    </div>
  )
}
