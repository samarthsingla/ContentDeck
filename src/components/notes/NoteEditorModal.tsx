import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Check, Loader2 } from 'lucide-react';
import Spinner from '../ui/Spinner';
import LinkedBookmarks from './LinkedBookmarks';
import { useNoteTags } from '../../hooks/useNoteTags';
import { useNoteBookmarks } from '../../hooks/useNoteBookmarks';
import { convertHtmlToMarkdown } from '../../lib/utils';
import type { StandaloneNote, Bookmark, TagArea } from '../../types';

const TipTapEditor = React.lazy(() => import('./TipTapEditor'));

type SaveState = 'idle' | 'saving' | 'saved';

interface NoteEditorModalProps {
  open: boolean;
  note: StandaloneNote | null;
  allBookmarks: Bookmark[];
  allAreas: TagArea[];
  initialBookmarkId?: string | null;
  onClose: () => void;
  onSave: (id: string, updates: { title?: string; content?: string }) => void;
  onCreate: (data: { title: string; content: string }) => Promise<StandaloneNote>;
}

export default function NoteEditorModal({
  open,
  note,
  allBookmarks,
  allAreas,
  initialBookmarkId,
  onClose,
  onSave,
  onCreate,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isCreatingRef = useRef(false);
  const pendingBookmarkIdRef = useRef<string | null>(null);

  const { linkedAreas, linkArea, unlinkArea } = useNoteTags(noteId);
  const { linkBookmark } = useNoteBookmarks(noteId);

  // Reset state when note or open changes
  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setNoteId(note?.id ?? null);
    setSaveState('idle');
    isCreatingRef.current = false;
    // Track pending bookmark to link after note is created
    pendingBookmarkIdRef.current = initialBookmarkId ?? null;
    requestAnimationFrame(() => titleRef.current?.focus());
  }, [open, note?.id, initialBookmarkId]);

  // Once noteId is established (after create), link pending bookmark
  useEffect(() => {
    if (noteId && pendingBookmarkIdRef.current) {
      linkBookmark.mutate({ noteId, bookmarkId: pendingBookmarkIdRef.current });
      pendingBookmarkIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const triggerAutoSave = useCallback(
    (currentTitle: string, currentContent: string, currentId: string | null) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        if (isCreatingRef.current) return;

        if (currentId) {
          setSaveState('saving');
          onSave(currentId, { title: currentTitle, content: currentContent });
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 2000);
        } else if (currentTitle || currentContent) {
          // Bootstrap: create note to get an ID
          isCreatingRef.current = true;
          setSaveState('saving');
          try {
            const created = await onCreate({ title: currentTitle, content: currentContent });
            setNoteId(created.id);
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2000);
          } catch {
            setSaveState('idle');
          } finally {
            isCreatingRef.current = false;
          }
        }
      }, 1000);
    },
    [onSave, onCreate],
  );

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(val, content, noteId);
  }

  function handleContentChange(html: string) {
    setContent(html);
    triggerAutoSave(title, html, noteId);
  }

  function flushSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (noteId) {
      onSave(noteId, { title, content });
    }
  }

  function handleClose() {
    flushSave();
    onClose();
  }

  function exportNote() {
    const md = convertHtmlToMarkdown(content);
    const filename = (title || 'note').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.md';
    const blob = new Blob([`# ${title || 'Untitled Note'}\n\n${md}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- backdrop click-to-close is progressive enhancement
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-editor-title"
        className="w-full max-w-2xl bg-white dark:bg-surface-900 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[88vh] sm:max-h-[85vh] flex flex-col motion-safe:animate-[slideUp_0.2s_ease-out]"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-700 rounded-t-2xl sm:rounded-t-2xl bg-white dark:bg-surface-900">
          {/* Save indicator */}
          <div className="flex items-center gap-1.5 min-w-[80px]">
            {saveState === 'saving' && (
              <>
                <Loader2 size={13} className="animate-spin text-surface-400" />
                <span className="text-xs text-surface-400">Saving…</span>
              </>
            )}
            {saveState === 'saved' && (
              <>
                <Check size={13} className="text-green-500" />
                <span className="text-xs text-green-500">Saved</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Export */}
          <button
            onClick={exportNote}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
            aria-label="Export note as Markdown"
          >
            <Download size={18} />
          </button>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <input
            ref={titleRef}
            id="note-editor-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Note title…"
            className="w-full text-lg font-semibold text-surface-900 dark:text-surface-100 bg-transparent border-none outline-none placeholder-surface-300 dark:placeholder-surface-600 focus:ring-0"
          />

          {/* Area tags */}
          {noteId && allAreas.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              {linkedAreas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => unlinkArea.mutate({ noteId, tagAreaId: area.id })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-600/10 text-primary-700 dark:text-primary-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                  aria-label={`Remove area ${area.name}`}
                >
                  {area.emoji && <span>{area.emoji}</span>}
                  {area.name}
                  <X size={10} />
                </button>
              ))}

              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id && noteId) linkArea.mutate({ noteId, tagAreaId: id });
                }}
                className="text-xs px-2 py-0.5 rounded-full border border-dashed border-surface-300 dark:border-surface-600 text-surface-500 bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Add area to note"
              >
                <option value="">+ Area</option>
                {allAreas
                  .filter((a) => !linkedAreas.some((la) => la.id === a.id))
                  .map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.emoji ? `${area.emoji} ` : ''}
                      {area.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* TipTap Editor */}
          <React.Suspense
            fallback={
              <div className="flex justify-center py-8">
                <Spinner size={28} />
              </div>
            }
          >
            <TipTapEditor
              content={content}
              onChange={handleContentChange}
              placeholder="Start writing your note…"
            />
          </React.Suspense>

          {/* Linked Bookmarks — only when note exists */}
          {noteId && (
            <div className="pt-3 border-t border-surface-100 dark:border-surface-800">
              <LinkedBookmarks noteId={noteId} allBookmarks={allBookmarks} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
