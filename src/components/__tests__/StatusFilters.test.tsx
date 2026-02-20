import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusFilters from '../feed/StatusFilters';
import type { Bookmark } from '../../types';

// Mock useUI
const mockSetStatus = vi.fn();
let mockCurrentStatus: string = 'all';

vi.mock('../../context/UIProvider', () => ({
  useUI: () => ({
    currentStatus: mockCurrentStatus,
    setStatus: mockSetStatus,
  }),
}));

function makeBookmarks(): Bookmark[] {
  const base = {
    url: 'https://example.com',
    title: 'Test',
    image: null,
    excerpt: null,
    source_type: 'blog' as const,
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending' as const,
    content_fetched_at: null,
    synced: false,
    created_at: new Date().toISOString(),
    status_changed_at: new Date().toISOString(),
    started_reading_at: null,
    finished_at: null,
    scratchpad: '',
  };
  return [
    { ...base, id: '1', status: 'unread' as const },
    { ...base, id: '2', status: 'unread' as const },
    { ...base, id: '3', status: 'reading' as const },
    { ...base, id: '4', status: 'done' as const },
  ];
}

describe('StatusFilters', () => {
  it('renders tabs with correct counts', () => {
    mockCurrentStatus = 'all';
    render(<StatusFilters bookmarks={makeBookmarks()} />);
    // Unread tab should show count 2
    expect(screen.getByRole('tab', { name: /Unread/i })).toHaveTextContent('2');
    expect(screen.getByRole('tab', { name: /Reading/i })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /Done/i })).toHaveTextContent('1');
  });

  it('calls setStatus with status when inactive tab is clicked', async () => {
    mockCurrentStatus = 'all';
    const user = userEvent.setup();
    render(<StatusFilters bookmarks={makeBookmarks()} />);
    await user.click(screen.getByRole('tab', { name: /Reading/i }));
    expect(mockSetStatus).toHaveBeenCalledWith('reading');
  });

  it('calls setStatus with "all" when active tab is clicked (toggle off)', async () => {
    mockCurrentStatus = 'reading';
    const user = userEvent.setup();
    render(<StatusFilters bookmarks={makeBookmarks()} />);
    await user.click(screen.getByRole('tab', { name: /Reading/i }));
    expect(mockSetStatus).toHaveBeenCalledWith('all');
  });

  it('marks active tab with aria-selected="true"', () => {
    mockCurrentStatus = 'unread';
    render(<StatusFilters bookmarks={makeBookmarks()} />);
    expect(screen.getByRole('tab', { name: /Unread/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Reading/i })).toHaveAttribute('aria-selected', 'false');
  });
});
