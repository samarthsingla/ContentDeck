import { Plus, LayoutGrid } from 'lucide-react';
import AreaCard from './AreaCard';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';
import type { Bookmark, TagArea } from '../../types';

interface AreasViewProps {
  areas: TagArea[];
  bookmarks: Bookmark[];
  onAreaClick: (areaName: string) => void;
  onEditArea: (area: TagArea) => void;
  onManageAreas: () => void;
}

export default function AreasView({
  areas,
  bookmarks,
  onAreaClick,
  onEditArea,
  onManageAreas,
}: AreasViewProps) {
  // Count bookmarks per area (match area name to bookmark tags)
  function getCount(area: TagArea): number {
    return bookmarks.filter((b) => b.tags.some((t) => t.toLowerCase() === area.name.toLowerCase()))
      .length;
  }

  // Count untagged bookmarks (no tags or tags don't match any area)
  const areaNames = new Set(areas.map((a) => a.name.toLowerCase()));
  const untaggedCount = bookmarks.filter(
    (b) => !b.tags || b.tags.length === 0 || !b.tags.some((t) => areaNames.has(t.toLowerCase())),
  ).length;

  if (areas.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={LayoutGrid}
          title="No areas yet"
          description="Create tag areas to organize your bookmarks by topic."
        />
        <div className="flex justify-center">
          <Button onClick={onManageAreas}>
            <Plus size={16} />
            Create First Area
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with manage button */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
          Areas ({areas.length})
        </h2>
        <Button variant="ghost" onClick={onManageAreas} className="text-xs">
          <Plus size={14} />
          Manage
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {areas.map((area) => (
          <AreaCard
            key={area.id}
            area={area}
            bookmarkCount={getCount(area)}
            onClick={() => onAreaClick(area.name)}
            onEdit={() => onEditArea(area)}
          />
        ))}

        {/* Untagged bucket */}
        {untaggedCount > 0 && (
          <button
            onClick={() => onAreaClick('__untagged__')}
            className="flex flex-col items-start gap-2 p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 hover:border-surface-400 dark:hover:border-surface-600 transition-colors text-left w-full min-h-[100px]"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📥</span>
              <h3 className="text-sm font-semibold text-surface-600 dark:text-surface-400">
                Untagged
              </h3>
            </div>
            <span className="mt-auto text-xs text-surface-400 dark:text-surface-500">
              {untaggedCount} {untaggedCount === 1 ? 'bookmark' : 'bookmarks'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
