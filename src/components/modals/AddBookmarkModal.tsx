import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import TagAreaInput from '../ui/TagAreaInput';
import { detectSourceType } from '../../lib/utils';
import { SourceBadge } from '../ui/Badge';
import type { SourceType, TagArea } from '../../types';

interface AddBookmarkModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    url: string;
    title?: string;
    source_type?: string;
    tags?: string[];
    areaIds?: string[];
  }) => void;
  isPending: boolean;
  initialUrl?: string;
  allAreas: TagArea[];
  allTags: string[];
}

export default function AddBookmarkModal({
  open,
  onClose,
  onAdd,
  isPending,
  initialUrl,
  allAreas,
  allTags,
}: AddBookmarkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [detectedSource, setDetectedSource] = useState<SourceType | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<TagArea[]>([]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    onAdd({
      url: url.trim(),
      title: title.trim() || undefined,
      source_type: detectedSource ?? undefined,
      tags: tags.length > 0 ? tags : undefined,
      areaIds: selectedAreas.length > 0 ? selectedAreas.map((a) => a.id) : undefined,
    });

    // Reset form
    setUrl('');
    setTitle('');
    setDetectedSource(null);
    setTags([]);
    setSelectedAreas([]);
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

        {/* Areas & Tags */}
        <div>
          <label
            htmlFor="add-tags"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Areas & Tags{' '}
            <span className="text-surface-400 font-normal">(type to search, comma to add)</span>
          </label>
          <TagAreaInput
            id="add-tags"
            tags={tags}
            areas={selectedAreas}
            allAreas={allAreas}
            allTags={allTags}
            onTagsChange={setTags}
            onAreasChange={setSelectedAreas}
          />
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
