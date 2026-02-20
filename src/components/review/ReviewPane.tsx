import { Brain } from 'lucide-react';
import ReviewCard from './ReviewCard';
import type { Bookmark } from '../../types';

interface ReviewPaneProps {
  queue: Bookmark[];
  sessionReviewed: number;
  sessionTotal: number;
  isLoading: boolean;
  onReviewed: (id: string) => void;
  onSkip: (id: string) => void;
  onOpenDetails: (id: string) => void;
}

export default function ReviewPane({
  queue,
  sessionReviewed,
  sessionTotal,
  isLoading,
  onReviewed,
  onSkip,
  onOpenDetails,
}: ReviewPaneProps) {
  const current = queue[0];

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2">
        <Brain size={20} className="text-surface-600 dark:text-surface-400" />
        <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Review</h1>
        {queue.length > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
            {queue.length} due
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-surface-500 dark:text-surface-400 py-8 text-center">
          Loading review queue…
        </div>
      ) : current ? (
        <ReviewCard
          bookmark={current}
          onReviewed={() => onReviewed(current.id)}
          onSkip={() => onSkip(current.id)}
          onOpenDetails={onOpenDetails}
          sessionProgress={{ reviewed: sessionReviewed, total: sessionTotal }}
        />
      ) : (
        <div className="text-center py-16 space-y-3">
          <Brain size={48} className="mx-auto text-surface-300 dark:text-surface-600" />
          <p className="text-lg font-medium text-surface-700 dark:text-surface-300">
            You're all caught up.
          </p>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Check back in 7 days for your next review batch.
          </p>
          {sessionReviewed > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              {sessionReviewed} reviewed this session
            </p>
          )}
        </div>
      )}
    </div>
  );
}
