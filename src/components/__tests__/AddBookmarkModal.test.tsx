import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddBookmarkModal from '../modals/AddBookmarkModal';

// Mock TagAreaInput as a simple stub — full autocomplete is tested separately
vi.mock('../ui/TagAreaInput', () => ({
  default: () => <div data-testid="tag-area-input" />,
}));

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onAdd: vi.fn(),
  isPending: false,
  allAreas: [],
  allTags: [],
};

describe('AddBookmarkModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(<AddBookmarkModal {...defaultProps} open={false} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders form when open is true', () => {
    render(<AddBookmarkModal {...defaultProps} />);
    expect(screen.getByLabelText('URL')).toBeInTheDocument();
    expect(screen.getByText('Save Bookmark')).toBeInTheDocument();
  });

  it('detects YouTube source type when URL is entered', async () => {
    const user = userEvent.setup();
    render(<AddBookmarkModal {...defaultProps} />);
    await user.type(screen.getByLabelText('URL'), 'https://youtube.com/watch?v=abc');
    expect(screen.getByText('youtube')).toBeInTheDocument();
  });

  it('submit button is disabled when URL is empty', () => {
    render(<AddBookmarkModal {...defaultProps} />);
    expect(screen.getByText('Save Bookmark').closest('button')).toBeDisabled();
  });

  it('submit button shows Saving... when isPending', () => {
    render(<AddBookmarkModal {...defaultProps} isPending={true} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('calls onAdd with correct payload on submit', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBookmarkModal {...defaultProps} onAdd={onAdd} />);
    await user.type(screen.getByLabelText('URL'), 'https://example.com/article');
    await user.type(screen.getByLabelText(/Title/), 'Test Article');
    await user.click(screen.getByText('Save Bookmark'));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/article',
        title: 'Test Article',
      }),
    );
  });

  it('pre-fills URL from initialUrl prop', () => {
    render(<AddBookmarkModal {...defaultProps} initialUrl="https://twitter.com/user/status/1" />);
    expect(screen.getByLabelText('URL')).toHaveValue('https://twitter.com/user/status/1');
    expect(screen.getByText('twitter')).toBeInTheDocument();
  });
});
