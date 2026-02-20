import { SourceBadge } from '../ui/Badge';
import type { Bookmark } from '../../types';

interface ReviewCardProps {
  bookmark: Bookmark;
  onReviewed: () => void;
  onSkip: () => void;
  onOpenDetails: (id: string) => void;
  sessionProgress: { reviewed: number; total: number };
}

function formatLastReviewed(last_reviewed_at: string | null): string {
  if (!last_reviewed_at) return 'Never reviewed';
  const days = Math.floor(
    (Date.now() - new Date(last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return 'Reviewed today';
  if (days === 1) return 'Reviewed 1 day ago';
  return `Reviewed ${days} days ago`;
}

export default function ReviewCard({
  bookmark,
  onReviewed,
  onSkip,
  onOpenDetails,
  sessionProgress,
}: ReviewCardProps) {
  const excerpt = bookmark.excerpt
    ? bookmark.excerpt.length > 150
      ? bookmark.excerpt.slice(0, 150) + '…'
      : bookmark.excerpt
    : null;

  const progressPercent =
    sessionProgress.total > 0
      ? Math.round((sessionProgress.reviewed / sessionProgress.total) * 100)
      : 0;

  return (
    <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-6 space-y-5">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-surface-500 dark:text-surface-400">
            {sessionProgress.reviewed} of {sessionProgress.total} reviewed this session
          </span>
          <span className="text-xs text-surface-400 dark:text-surface-500">{progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={sessionProgress.reviewed}
            aria-valuemin={0}
            aria-valuemax={sessionProgress.total}
          />
        </div>
      </div>

      {/* Card content */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <SourceBadge source={bookmark.source_type} />
          <span className="text-xs text-surface-400 dark:text-surface-500 pt-0.5">
            {formatLastReviewed(bookmark.last_reviewed_at)}
          </span>
        </div>

        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 leading-snug">
          {bookmark.title ?? bookmark.url}
        </h2>

        {excerpt ? (
          <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
            {excerpt}
          </p>
        ) : (
          <p className="text-sm text-surface-400 dark:text-surface-500 italic">
            No excerpt available
          </p>
        )}

        {/* Areas/tags */}
        {bookmark.areas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bookmark.areas.map((area) => (
              <span
                key={area.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
              >
                {area.emoji && <span>{area.emoji}</span>}
                {area.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onReviewed}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-colors min-h-[44px]"
        >
          Reviewed ✓
        </button>
        <button
          onClick={onSkip}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 font-medium text-sm transition-colors min-h-[44px]"
        >
          Skip →
        </button>
      </div>

      <button
        onClick={() => onOpenDetails(bookmark.id)}
        className="w-full text-xs text-primary-600 dark:text-primary-400 hover:underline text-center py-1"
      >
        Open Details
      </button>
    </div>
  );
}
