import { useUI } from '../../context/UIProvider';
import { STATUS_LIST } from '../../types';
import type { Bookmark, Status } from '../../types';

const labels: Record<Status, string> = {
  unread: 'Unread',
  reading: 'Reading',
  done: 'Done',
};

export default function StatusFilters({ bookmarks }: { bookmarks: Bookmark[] }) {
  const { currentStatus, setStatus } = useUI();

  return (
    <div className="hidden lg:flex gap-1" role="tablist" aria-label="Filter by status">
      {STATUS_LIST.map((status) => {
        const count = bookmarks.filter((b) => b.status === status).length;
        const active = currentStatus === status;
        return (
          <button
            key={status}
            role="tab"
            aria-selected={active}
            onClick={() => setStatus(active ? 'all' : status)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px]
              ${
                active
                  ? 'bg-primary-600/10 text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              }
            `}
          >
            {labels[status]}
            <span className="ml-1 text-xs opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
