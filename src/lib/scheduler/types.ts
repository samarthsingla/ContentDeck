import type { Bookmark } from '../../types';

export interface ReviewScheduler {
  /** True if this bookmark is currently due for review */
  isDue(bookmark: Bookmark): boolean;
  /** Date when this bookmark will next be due (for display in empty state etc.) */
  nextDue(bookmark: Bookmark): Date;
  /** Human-readable interval description, e.g. "7 days" */
  intervalLabel(bookmark?: Bookmark): string;
}
