import type { ReviewScheduler } from './types';
import type { Bookmark } from '../../types';

export const INTERVAL_DAYS = 7;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export const FixedIntervalScheduler: ReviewScheduler = {
  isDue(b: Bookmark): boolean {
    if (!b.last_reviewed_at) return true;
    return daysSince(b.last_reviewed_at) >= INTERVAL_DAYS;
  },
  nextDue(b: Bookmark): Date {
    if (!b.last_reviewed_at) return new Date();
    return addDays(new Date(b.last_reviewed_at), INTERVAL_DAYS);
  },
  intervalLabel(): string {
    return `${INTERVAL_DAYS} days`;
  },
};
