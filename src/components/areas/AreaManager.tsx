import { useState, useEffect } from 'react'
import { Trash2, GripVertical } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import type { TagArea } from '../../types'

interface AreaManagerProps {
  open: boolean
  onClose: () => void
  areas: TagArea[]
  editingArea: TagArea | null
  onCreate: (data: { name: string; description?: string; color?: string; emoji?: string }) => void
  onUpdate: (id: string, data: Partial<TagArea>) => void
  onDelete: (id: string) => void
  onReorder: (orderedIds: string[]) => void
}

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]

const PRESET_EMOJIS = ['📚', '🎥', '💻', '🧠', '📝', '🎯', '🔬', '💡', '🎨', '📊', '🏋️', '🌍']

export default function AreaManager({
  open, onClose, areas, editingArea, onCreate, onUpdate, onDelete, onReorder,
}: AreaManagerProps) {
  const isEditing = editingArea !== null

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Area' : 'Manage Areas'} size="md">
      {isEditing ? (
        <AreaForm
          area={editingArea}
          onSave={(data) => {
            onUpdate(editingArea.id, data)
            onClose()
          }}
          onDelete={() => {
            if (confirm(`Delete "${editingArea.name}" area? Bookmarks won't be deleted.`)) {
              onDelete(editingArea.id)
              onClose()
            }
          }}
          onCancel={onClose}
        />
      ) : (
        <AreaListManager
          areas={areas}
          onCreate={onCreate}
          onReorder={onReorder}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}

// --- Form for creating/editing a single area ---
function AreaForm({
  area,
  onSave,
  onDelete,
  onCancel,
}: {
  area: TagArea | null
  onSave: (data: { name: string; description?: string; color?: string; emoji?: string }) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(area?.name ?? '')
  const [description, setDescription] = useState(area?.description ?? '')
  const [color, setColor] = useState(area?.color ?? '')
  const [emoji, setEmoji] = useState(area?.emoji ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color: color || undefined,
      emoji: emoji || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name + Emoji */}
      <div>
        <label htmlFor="area-name" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Name
        </label>
        <div className="flex gap-2">
          <input
            id="area-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Machine Learning"
            required
            autoFocus
            className="flex-1 px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
          />
        </div>
      </div>

      {/* Emoji picker */}
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Emoji
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(emoji === e ? '' : e)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${
                emoji === e
                  ? 'bg-primary-600/10 ring-2 ring-primary-500'
                  : 'hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              {e}
            </button>
          ))}
          {emoji && !PRESET_EMOJIS.includes(emoji) && (
            <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-primary-600/10 ring-2 ring-primary-500">
              {emoji}
            </span>
          )}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(color === c ? '' : c)}
              className={`w-8 h-8 rounded-full transition-transform ${
                color === c ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-surface-900 scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="area-desc" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Description <span className="text-surface-400 font-normal">(optional)</span>
        </label>
        <input
          id="area-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this area covers..."
          className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        {onDelete && (
          <Button type="button" variant="danger" onClick={onDelete}>
            <Trash2 size={16} />
            Delete
          </Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          {area ? 'Save Changes' : 'Create Area'}
        </Button>
      </div>
    </form>
  )
}

// --- List of all areas with reorder + create ---
function AreaListManager({
  areas,
  onCreate,
  onReorder,
  onClose,
}: {
  areas: TagArea[]
  onCreate: (data: { name: string; description?: string; color?: string; emoji?: string }) => void
  onReorder: (orderedIds: string[]) => void
  onClose: () => void
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [localAreas, setLocalAreas] = useState(areas)

  // Sync with prop updates (new areas created, areas deleted externally)
  useEffect(() => {
    setLocalAreas(areas)
  }, [areas])

  function moveArea(index: number, direction: 'up' | 'down') {
    const newAreas = [...localAreas]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newAreas.length) return
    const a = newAreas[index]!
    const b = newAreas[swapIndex]!
    newAreas[index] = b
    newAreas[swapIndex] = a
    setLocalAreas(newAreas)
    onReorder(newAreas.map((item) => item.id))
  }

  if (showCreate) {
    return (
      <AreaForm
        area={null}
        onSave={(data) => {
          onCreate(data)
          setShowCreate(false)
        }}
        onCancel={() => setShowCreate(false)}
      />
    )
  }

  return (
    <div className="space-y-3">
      {localAreas.length === 0 ? (
        <p className="text-sm text-surface-500 dark:text-surface-400 text-center py-4">
          No areas yet. Create one to organize your bookmarks.
        </p>
      ) : (
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {localAreas.map((area, index) => (
            <div
              key={area.id}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900"
            >
              <GripVertical size={16} className="text-surface-300 dark:text-surface-600 flex-shrink-0" />
              {area.emoji && <span className="text-base">{area.emoji}</span>}
              {area.color && (
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: area.color }} />
              )}
              <span className="flex-1 text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                {area.name}
              </span>
              <div className="flex gap-0.5">
                <button
                  onClick={() => moveArea(index, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 disabled:opacity-30 min-w-[28px] min-h-[28px] flex items-center justify-center"
                  aria-label="Move up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </button>
                <button
                  onClick={() => moveArea(index, 'down')}
                  disabled={index === localAreas.length - 1}
                  className="p-1 rounded text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 disabled:opacity-30 min-w-[28px] min-h-[28px] flex items-center justify-center"
                  aria-label="Move down"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button onClick={() => setShowCreate(true)}>
          Create Area
        </Button>
      </div>
    </div>
  )
}
