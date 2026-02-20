/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StandaloneNoteCard from '../notes/StandaloneNoteCard';
import type { StandaloneNote, TagArea } from '../../types';

const MOCK_AREA: TagArea = {
  id: 'area-1',
  name: 'Tech',
  emoji: '💻',
  color: '#3b82f6',
  description: null,
  sort_order: 0,
  created_at: new Date().toISOString(),
};

const MOCK_NOTE: StandaloneNote = {
  id: 'note-1',
  title: 'My Test Note',
  content: '<p>This is the note content for testing purposes.</p>',
  created_at: new Date(Date.now() - 60000).toISOString(),
  updated_at: new Date(Date.now() - 30000).toISOString(),
  areas: [MOCK_AREA],
  linked_bookmarks: [],
};

const defaultProps = {
  note: MOCK_NOTE,
  onClick: vi.fn(),
  onDelete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StandaloneNoteCard', () => {
  it('renders the note title', () => {
    render(<StandaloneNoteCard {...defaultProps} />);
    expect(screen.getByText('My Test Note')).toBeInTheDocument();
  });

  it('renders stripped content preview (no HTML tags)', () => {
    render(<StandaloneNoteCard {...defaultProps} />);
    expect(screen.getByText(/This is the note content/)).toBeInTheDocument();
    // Ensure no raw HTML angle brackets appear in the rendered text
    const preview = screen.getByText(/This is the note content/).textContent;
    expect(preview).not.toContain('<p>');
  });

  it('truncates long content with ellipsis', () => {
    const longNote: StandaloneNote = {
      ...MOCK_NOTE,
      content: '<p>' + 'x'.repeat(200) + '</p>',
    };
    render(<StandaloneNoteCard {...defaultProps} note={longNote} />);
    expect(screen.getByText(/…/)).toBeInTheDocument();
  });

  it('shows relative timestamp in card', () => {
    render(<StandaloneNoteCard {...defaultProps} />);
    // The card contains timestamp text
    expect(document.body.textContent).toMatch(/ago|just now/);
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<StandaloneNoteCard {...defaultProps} onClick={onClick} />);
    // Click the card div (role=button, the first one with tab focus)
    const card = screen.getAllByRole('button')[0]!;
    await user.click(card);
    expect(onClick).toHaveBeenCalledWith('note-1');
  });

  it('calls onDelete after confirmation when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    // happy-dom: stub confirm globally
    window.confirm = vi.fn(() => true);
    render(<StandaloneNoteCard {...defaultProps} onDelete={onDelete} />);
    const deleteBtn = screen.getByRole('button', { name: 'Delete note' });
    await user.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('note-1');
  });

  it('does NOT call onDelete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    window.confirm = vi.fn(() => false);
    render(<StandaloneNoteCard {...defaultProps} onDelete={onDelete} />);
    const deleteBtn = screen.getByRole('button', { name: 'Delete note' });
    await user.click(deleteBtn);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('shows area pill with emoji and name', () => {
    render(<StandaloneNoteCard {...defaultProps} />);
    expect(screen.getByText('💻')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();
  });
});
