import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { detectSourceType } from '../../lib/utils';
import { SourceBadge } from '../ui/Badge';
import type { SourceType } from '../../types';

interface AddBookmarkModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { url: string; title?: string; source_type?: string; tags?: string[] }) => void;
  isPending: boolean;
  initialUrl?: string;
}

export default function AddBookmarkModal({
  open,
  onClose,
  onAdd,
  isPending,
  initialUrl,
}: AddBookmarkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [detectedSource, setDetectedSource] = useState<SourceType | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Pre-fill from share target or prop
  useEffect(() => {
    if (open && initialUrl && !url) {
      setUrl(initialUrl);
      setDetectedSource(detectSourceType(initialUrl));
    }
  }, [open, initialUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleUrlChange(value: string) {
    setUrl(value);
    if (value.trim()) {
      setDetectedSource(detectSourceType(value.trim()));
    } else {
      setDetectedSource(null);
    }
  }

  function addTag(value: string) {
    const tag = value.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    // Auto-commit any pending tag text before submitting
    const finalTags = [...tags];
    const pending = tagInput.trim().toLowerCase();
    if (pending && !finalTags.includes(pending)) {
      finalTags.push(pending);
    }

    onAdd({
      url: url.trim(),
      title: title.trim() || undefined,
      source_type: detectedSource ?? undefined,
      tags: finalTags.length > 0 ? finalTags : undefined,
    });

    // Reset form
    setUrl('');
    setTitle('');
    setDetectedSource(null);
    setTags([]);
    setTagInput('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Bookmark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL */}
        <div>
          <label
            htmlFor="add-url"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            URL
          </label>
          <input
            id="add-url"
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://..."
            required
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
          />
          {detectedSource && (
            <div className="mt-2">
              <SourceBadge source={detectedSource} />
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="add-title"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Title <span className="text-surface-400 font-normal">(optional, auto-fetched)</span>
          </label>
          <input
            id="add-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
          />
        </div>

        {/* Tags */}
        <div>
          <label
            htmlFor="add-tags"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Tags <span className="text-surface-400 font-normal">(comma or enter to add)</span>
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 min-h-[44px]">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-600/10 text-primary-600 dark:text-primary-400 text-sm font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-surface-400 hover:text-red-500 min-w-[20px] min-h-[20px] flex items-center justify-center"
                  aria-label={`Remove tag ${tag}`}
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              id="add-tags"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? 'Add tags...' : ''}
              className="flex-1 min-w-[80px] bg-transparent text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 outline-none py-1"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!url.trim() || isPending}>
            {isPending ? 'Saving...' : 'Save Bookmark'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
