import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';

interface AppShellProps {
  counts: { unread: number; reading: number; done: number; favorited: number };
  noteCount: number;
  dueCount: number;
  onAdd: () => void;
  onSignOut: () => void;
  onToggleSearch: () => void;
  onSettings: () => void;
  onStats: () => void;
  showSearch: boolean;
  children: React.ReactNode;
}

export default function AppShell({
  counts,
  noteCount,
  dueCount,
  onAdd,
  onSignOut,
  onToggleSearch,
  onSettings,
  onStats,
  showSearch,
  children,
}: AppShellProps) {
  return (
    <div className="flex flex-1 min-w-0">
      {/* Desktop Sidebar */}
      <Sidebar
        counts={counts}
        noteCount={noteCount}
        dueCount={dueCount}
        onAdd={onAdd}
        onSignOut={onSignOut}
        onSettings={onSettings}
        onStats={onStats}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobileHeader
          onAdd={onAdd}
          onToggleSearch={onToggleSearch}
          onSettings={onSettings}
          showSearch={showSearch}
        />

        {/* Content Area */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(72px + var(--safe-bottom))' }}
        >
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <MobileNav counts={counts} noteCount={noteCount} dueCount={dueCount} />
      </div>
    </div>
  );
}
