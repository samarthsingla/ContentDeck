import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { SourceBadge } from '../ui/Badge'
import type { Bookmark, SourceType, Status } from '../../types'
import { SOURCE_LIST, SOURCE_LABELS, STATUS_LIST } from '../../types'

interface EditBookmarkModalProps {
  open: boolean
  bookmark: Bookmark | null
  onClose: () => void
  onSave: (id: string, updates: Partial<Bookmark>) => void
  isPending: boolean
}

export default function EditBookmarkModal({ open, bookmark, onClose, onSave, isPending }: EditBookmarkModalProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('blog')
  const [status, setStatus] = useState<Status>('unread')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // Sync form state when bookmark changes
  useEffect(() => {
    if (bookmark) {
      setUrl(bookmark.url)
      setTitle(bookmark.title ?? '')
      setSourceType(bookmark.source_type)
      setStatus(bookmark.status)
      setTags(bookmark.tags ?? [])
      setTagInput('')
    }
  }, [bookmark])

  function addTag(value: string) {
    const tag = value.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bookmark || !url.trim()) return

    // Auto-commit pending tag text
    const finalTags = [...tags]
    const pending = tagInput.trim().toLowerCase()
    if (pending && !finalTags.includes(pending)) {
      finalTags.push(pending)
    }

    onSave(bookmark.id, {
      url: url.trim(),
      title: title.trim() || null,
      source_type: sourceType,
      status,
      tags: finalTags,
    })
    onClose()
  }

  if (!bookmark) return null

  return (
    <Modal open={open} onClose={onClose} title="Edit Bookmark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL */}
        <div>
          <label htmlFor="edit-url" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            URL
          </label>
          <input
            id="edit-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="edit-title" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Title
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
          />
        </div>

        {/* Source Type + Status row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-source" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Source
            </label>
            <div className="relative">
              <select
                id="edit-source"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 min-h-[44px] appearance-none"
              >
                {SOURCE_LIST.map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <SourceBadge source={sourceType} />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="edit-status" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 min-h-[44px]"
            >
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="edit-tags" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
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
                  className="text-primary-400 dark:text-primary-300 hover:text-red-500 min-w-[20px] min-h-[20px] flex items-center justify-center"
                  aria-label={`Remove tag ${tag}`}
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              id="edit-tags"
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
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
