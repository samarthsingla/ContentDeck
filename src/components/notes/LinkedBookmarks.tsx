import { useState, useId } from 'react';
import { X, Link, Search } from 'lucide-react';
import { useNoteBookmarks } from '../../hooks/useNoteBookmarks';
import { getFaviconUrl, getDomain } from '../../lib/utils';
import type { Bookmark } from '../../types';

interface LinkedBookmarksProps {
  noteId: string;
  allBookmarks: Bookmark[];
}

export default function LinkedBookmarks({ noteId, allBookmarks }: LinkedBookmarksProps) {
  const { linkedBookmarks, linkBookmark, unlinkBookmark } = useNoteBookmarks(noteId);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const listboxId = useId();

  const linkedIds = new Set(linkedBookmarks.map((b) => b.id));

  const suggestions = searchQuery
    ? allBookmarks
        .filter(
          (b) =>
            !linkedIds.has(b.id) &&
            (b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              b.url.toLowerCase().includes(searchQuery.toLowerCase())),
        )
        .slice(0, 8)
    : [];

  function handleLink(bookmark: Bookmark) {
    linkBookmark.mutate({ noteId, bookmarkId: bookmark.id });
    setSearchQuery('');
    setDropdownOpen(false);
  }

  function handleUnlink(bookmarkId: string) {
    unlinkBookmark.mutate({ noteId, bookmarkId });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link size={14} className="text-surface-400" />
        <h4 className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
          Linked Bookmarks
        </h4>
      </div>

      {/* Linked bookmark list */}
      {linkedBookmarks.length > 0 && (
        <ul className="space-y-1">
          {linkedBookmarks.map((bookmark) => (
            <li
              key={bookmark.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-800 group"
            >
              <img
                src={getFaviconUrl(bookmark.url)}
                alt=""
                className="w-4 h-4 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="flex-1 text-sm text-surface-700 dark:text-surface-300 truncate min-w-0">
                {bookmark.title || getDomain(bookmark.url)}
              </span>
              <button
                onClick={() => handleUnlink(bookmark.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 transition-opacity flex-shrink-0"
                aria-label={`Unlink ${bookmark.title || 'bookmark'}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Search to link */}
      <div className="relative">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDropdownOpen(e.target.value.length > 0);
            }}
            onFocus={() => {
              if (searchQuery) setDropdownOpen(true);
            }}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            placeholder="Search bookmarks to link…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            role="combobox"
            aria-label="Search bookmarks to link"
            aria-expanded={dropdownOpen}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-autocomplete="list"
          />
        </div>

        {dropdownOpen && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Bookmark suggestions"
            className="absolute z-10 w-full mt-1 py-1 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            {suggestions.map((bookmark) => (
              <li key={bookmark.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => handleLink(bookmark)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  <img
                    src={getFaviconUrl(bookmark.url)}
                    alt=""
                    className="w-4 h-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate text-surface-700 dark:text-surface-300">
                    {bookmark.title || getDomain(bookmark.url)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
