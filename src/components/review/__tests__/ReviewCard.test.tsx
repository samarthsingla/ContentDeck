import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewCard from '../ReviewCard';
import type { Bookmark } from '../../../types';

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bm-1',
    url: 'https://example.com',
    title: 'Test Bookmark',
    image: null,
    excerpt: 'A test excerpt',
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

describe('ReviewCard', () => {
  const onReviewed = vi.fn();
  const onSkip = vi.fn();
  const onOpenDetails = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderCard(bookmark = makeBookmark()) {
    render(
      <ReviewCard
        bookmark={bookmark}
        onReviewed={onReviewed}
        onSkip={onSkip}
        onOpenDetails={onOpenDetails}
        sessionProgress={{ reviewed: 0, total: 5 }}
      />,
    );
  }

  it('pressing "r" calls onReviewed', async () => {
    renderCard();
    await userEvent.keyboard('r');
    expect(onReviewed).toHaveBeenCalledTimes(1);
  });

  it('pressing "R" calls onReviewed', async () => {
    renderCard();
    await userEvent.keyboard('R');
    expect(onReviewed).toHaveBeenCalledTimes(1);
  });

  it('pressing "s" calls onSkip', async () => {
    renderCard();
    await userEvent.keyboard('s');
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('pressing "S" calls onSkip', async () => {
    renderCard();
    await userEvent.keyboard('S');
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('pressing "d" calls onOpenDetails with bookmark id', async () => {
    const bookmark = makeBookmark({ id: 'bm-test-42' });
    renderCard(bookmark);
    await userEvent.keyboard('d');
    expect(onOpenDetails).toHaveBeenCalledWith('bm-test-42');
  });

  it('pressing "D" calls onOpenDetails with bookmark id', async () => {
    const bookmark = makeBookmark({ id: 'bm-test-42' });
    renderCard(bookmark);
    await userEvent.keyboard('D');
    expect(onOpenDetails).toHaveBeenCalledWith('bm-test-42');
  });

  it('keypresses inside an input are ignored', async () => {
    renderCard();
    // Add a temporary input to the document and focus it
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    await userEvent.keyboard('r');
    expect(onReviewed).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('renders keyboard hint badges', () => {
    renderCard();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });
});
