import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowRight } from 'lucide-react';

interface BookmarkScratchpadProps {
  bookmarkId: string;
  scratchpad: string;
  onUpdate: (id: string, value: string) => void;
  onConvertToNote?: () => void;
}

export default function BookmarkScratchpad({
  bookmarkId,
  scratchpad,
  onUpdate,
  onConvertToNote,
}: BookmarkScratchpadProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(scratchpad);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;

  // Reset when switching bookmarks
  useEffect(() => {
    setLocalValue(scratchpad);
    setIsEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkId]);

  // Sync external prop changes only when not editing
  useEffect(() => {
    if (!isEditingRef.current) setLocalValue(scratchpad);
  }, [scratchpad]);

  // Flush debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing, localValue]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setLocalValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate(bookmarkId, val);
    }, 1000);
  }

  function handleDone() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onUpdate(bookmarkId, localValue);
    setIsEditing(false);
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider">
          Scratchpad
        </h4>
        <div className="flex items-center gap-1">
          {onConvertToNote && localValue.trim() && (
            <button
              onClick={onConvertToNote}
              className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 px-2 py-1 rounded min-h-[28px]"
              aria-label="Convert scratchpad to note"
            >
              <ArrowRight size={12} />
              Note
            </button>
          )}
          <button
            onClick={() => {
              if (isEditing) {
                handleDone();
              } else {
                setIsEditing(true);
                requestAnimationFrame(() => textareaRef.current?.focus());
              }
            }}
            className="text-xs font-medium px-2 py-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 dark:text-surface-400 min-h-[28px]"
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleChange}
          placeholder="Write notes in markdown…"
          className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 resize-none min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      ) : localValue.trim() ? (
        <div
          className="text-sm text-surface-800 dark:text-surface-200 leading-relaxed [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-surface-500 [&_h2]:dark:text-surface-400 [&_h2]:mt-3 [&_h2]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_code]:bg-surface-100 [&_code]:dark:bg-surface-800 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs cursor-text"
          onClick={() => setIsEditing(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setIsEditing(true);
          }}
          aria-label="Click to edit scratchpad"
        >
          <ReactMarkdown>{localValue}</ReactMarkdown>
        </div>
      ) : (
        <button
          type="button"
          className="text-surface-400 dark:text-surface-500 italic text-sm cursor-text text-left w-full"
          onClick={() => setIsEditing(true)}
        >
          Click Edit to add notes…
        </button>
      )}
    </div>
  );
}
