import { ExternalLink, Download, Trash2, Edit3 } from 'lucide-react';
import Button from '../ui/Button';
import type { Bookmark } from '../../types';

interface DetailActionsProps {
  bookmark: Bookmark;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export default function DetailActions({
  bookmark: b,
  onEdit,
  onExport,
  onDelete,
}: DetailActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-3 border-t border-surface-200 dark:border-surface-800">
      <a
        href={b.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors min-h-[40px]"
      >
        <ExternalLink size={16} />
        Open Link
      </a>
      <Button variant="ghost" onClick={onEdit}>
        <Edit3 size={16} />
        Edit
      </Button>
      <Button variant="ghost" onClick={onExport}>
        <Download size={16} />
        Export
      </Button>
      <div className="flex-1" />
      <Button variant="danger" onClick={onDelete}>
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}
