import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import type { Stats } from '../../hooks/useStats'
import { SOURCE_LABELS } from '../../types'
import type { SourceType } from '../../types'

interface StatsModalProps {
  open: boolean
  onClose: () => void
  stats: Stats
  isLoading: boolean
}

export default function StatsModal({ open, onClose, stats, isLoading }: StatsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Statistics" size="lg">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.totalBookmarks} />
            <StatCard label="This Week" value={stats.completedThisWeek} accent />
            <StatCard label="This Month" value={stats.completedThisMonth} />
            <StatCard label="Streak" value={`${stats.currentStreak}d`} accent />
          </div>

          {/* Avg completion */}
          {stats.avgCompletionDays > 0 && (
            <div className="text-sm text-surface-500 dark:text-surface-400">
              Average completion time: <span className="font-semibold text-surface-900 dark:text-surface-100">{stats.avgCompletionDays} days</span>
            </div>
          )}

          {/* Status breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">By Status</h3>
            <div className="flex gap-2">
              <StatusBar label="Unread" count={stats.byStatus.unread} total={stats.totalBookmarks} color="bg-blue-500" />
              <StatusBar label="Reading" count={stats.byStatus.reading} total={stats.totalBookmarks} color="bg-amber-500" />
              <StatusBar label="Done" count={stats.byStatus.done} total={stats.totalBookmarks} color="bg-green-500" />
            </div>
          </div>

          {/* Source breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">By Source</h3>
            <div className="space-y-1.5">
              {Object.entries(stats.bySource)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => (
                  <div key={source} className="flex items-center gap-2">
                    <span className="text-xs text-surface-500 dark:text-surface-400 w-20 truncate">
                      {SOURCE_LABELS[source as SourceType] ?? source}
                    </span>
                    <div className="flex-1 h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${stats.totalBookmarks > 0 ? (count / stats.totalBookmarks) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-surface-600 dark:text-surface-400 font-medium w-8 text-right">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Daily chart (last 30 days) */}
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Daily Completions (30 days)</h3>
            <div className="flex items-end gap-[3px] h-20">
              {stats.dailyCompletions.map(({ date, count }) => {
                const maxCount = Math.max(...stats.dailyCompletions.map((d) => d.count), 1)
                const height = count > 0 ? Math.max((count / maxCount) * 100, 8) : 4
                return (
                  <div
                    key={date}
                    className={`flex-1 rounded-t transition-colors ${
                      count > 0
                        ? 'bg-primary-500 dark:bg-primary-400'
                        : 'bg-surface-200 dark:bg-surface-700'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${date}: ${count} completed`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-surface-400">30 days ago</span>
              <span className="text-[10px] text-surface-400">Today</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="p-3 rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50">
      <div className="text-xs text-surface-500 dark:text-surface-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent ? 'text-primary-600 dark:text-primary-400' : 'text-surface-900 dark:text-surface-100'}`}>
        {value}
      </div>
    </div>
  )
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex-1 text-center">
      <div className="h-3 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden mb-1">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-surface-500 dark:text-surface-400">{label}</div>
      <div className="text-sm font-semibold text-surface-900 dark:text-surface-100">{count}</div>
    </div>
  )
}
