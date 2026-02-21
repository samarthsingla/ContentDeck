import { describe, it, expect } from 'vitest';
import { FixedIntervalScheduler, INTERVAL_DAYS } from '../fixedInterval';
import type { Bookmark } from '../../../types';

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bm-1',
    url: 'https://example.com',
    title: 'Test',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'done',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    scratchpad: '',
    synced: false,
    created_at: new Date().toISOString(),
    status_changed_at: new Date().toISOString(),
    started_reading_at: null,
    finished_at: null,
    last_reviewed_at: null,
    review_count: 0,
    ...overrides,
  };
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('FixedIntervalScheduler', () => {
  describe('isDue', () => {
    it('returns true when last_reviewed_at is null', () => {
      const b = makeBookmark({ last_reviewed_at: null });
      expect(FixedIntervalScheduler.isDue(b)).toBe(true);
    });

    it('returns true when last reviewed more than 7 days ago', () => {
      const b = makeBookmark({ last_reviewed_at: daysAgoIso(8) });
      expect(FixedIntervalScheduler.isDue(b)).toBe(true);
    });

    it('returns true when last reviewed exactly 7 days ago', () => {
      const b = makeBookmark({ last_reviewed_at: daysAgoIso(7) });
      expect(FixedIntervalScheduler.isDue(b)).toBe(true);
    });

    it('returns false when last reviewed less than 7 days ago', () => {
      const b = makeBookmark({ last_reviewed_at: daysAgoIso(3) });
      expect(FixedIntervalScheduler.isDue(b)).toBe(false);
    });
  });

  describe('nextDue', () => {
    it('returns approximately now when never reviewed', () => {
      const b = makeBookmark({ last_reviewed_at: null });
      const diff = Math.abs(FixedIntervalScheduler.nextDue(b).getTime() - Date.now());
      expect(diff).toBeLessThan(1000);
    });

    it('returns last_reviewed_at + 7 days', () => {
      const reviewedAt = daysAgoIso(3);
      const b = makeBookmark({ last_reviewed_at: reviewedAt });
      const expected = new Date(
        new Date(reviewedAt).getTime() + INTERVAL_DAYS * 24 * 60 * 60 * 1000,
      );
      const result = FixedIntervalScheduler.nextDue(b);
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe('intervalLabel', () => {
    it('returns "7 days"', () => {
      expect(FixedIntervalScheduler.intervalLabel()).toBe('7 days');
    });

    it('ignores the bookmark argument', () => {
      const b = makeBookmark();
      expect(FixedIntervalScheduler.intervalLabel(b)).toBe('7 days');
    });
  });
});
