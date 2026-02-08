import type { Bookmark } from '../types'
import { formatDate, getDomain } from './utils'
import { SOURCE_LABELS } from '../types'

/** Generate markdown for a single bookmark with YAML frontmatter */
export function generateMarkdown(bookmark: Bookmark): string {
  const lines: string[] = []

  // YAML frontmatter
  lines.push('---')
  lines.push(`url: "${bookmark.url}"`)
  if (bookmark.title) lines.push(`title: "${bookmark.title.replace(/"/g, '\\"')}"`)
  lines.push(`source: ${SOURCE_LABELS[bookmark.source_type]}`)
  lines.push(`status: ${bookmark.status}`)
  if (bookmark.is_favorited) lines.push('favorited: true')
  if (bookmark.tags.length > 0) {
    lines.push(`tags: [${bookmark.tags.map((t) => `"${t}"`).join(', ')}]`)
  }
  lines.push(`created: ${formatDate(bookmark.created_at)}`)
  if (bookmark.started_reading_at) lines.push(`started: ${formatDate(bookmark.started_reading_at)}`)
  if (bookmark.finished_at) lines.push(`finished: ${formatDate(bookmark.finished_at)}`)
  if (bookmark.metadata?.reading_time) lines.push(`reading_time: ${bookmark.metadata.reading_time} min`)
  if (bookmark.metadata?.channel) lines.push(`channel: "${bookmark.metadata.channel}"`)
  lines.push('---')
  lines.push('')

  // Title
  lines.push(`# ${bookmark.title || bookmark.url}`)
  lines.push('')

  // Link
  lines.push(`> [Open original](${bookmark.url}) — ${getDomain(bookmark.url)}`)
  lines.push('')

  // Excerpt
  if (bookmark.excerpt) {
    lines.push('## Summary')
    lines.push('')
    lines.push(bookmark.excerpt)
    lines.push('')
  }

  // Notes
  if (bookmark.notes.length > 0) {
    lines.push('## Notes')
    lines.push('')
    for (const note of bookmark.notes) {
      const emoji = { insight: '💡', question: '❓', highlight: '🖍️', note: '📝' }[note.type]
      const label = note.type.charAt(0).toUpperCase() + note.type.slice(1)
      lines.push(`### ${emoji} ${label}`)
      lines.push('')
      lines.push(note.content)
      lines.push('')
      lines.push(`*${formatDate(note.created_at)}*`)
      lines.push('')
    }
  }

  // Metadata footer
  if (bookmark.metadata?.duration || bookmark.metadata?.word_count) {
    lines.push('---')
    lines.push('')
    const meta: string[] = []
    if (bookmark.metadata.duration) meta.push(`Duration: ${bookmark.metadata.duration}`)
    if (bookmark.metadata.word_count) meta.push(`Words: ${bookmark.metadata.word_count.toLocaleString()}`)
    if (bookmark.metadata.reading_time) meta.push(`Reading time: ${bookmark.metadata.reading_time} min`)
    lines.push(meta.join(' | '))
    lines.push('')
  }

  return lines.join('\n')
}

/** Generate a safe filename from a bookmark title */
function safeFilename(bookmark: Bookmark): string {
  const name = bookmark.title || getDomain(bookmark.url)
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) + '.md'
}

/** Get the folder path based on source type */
function getFolder(bookmark: Bookmark): string {
  const folders: Record<string, string> = {
    youtube: 'Videos',
    twitter: 'Threads',
    linkedin: 'LinkedIn',
    substack: 'Articles',
    blog: 'Articles',
    book: 'Books',
  }
  return folders[bookmark.source_type] || 'Articles'
}

/** Export a single bookmark via File System Access API */
export async function exportToFileSystem(
  bookmark: Bookmark,
  vaultFolder: string
): Promise<boolean> {
  if (!('showDirectoryPicker' in window)) {
    return exportToClipboard(bookmark)
  }

  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })

    // Navigate to vault folder
    let targetDir = dirHandle
    if (vaultFolder) {
      for (const part of vaultFolder.split('/').filter(Boolean)) {
        targetDir = await targetDir.getDirectoryHandle(part, { create: true })
      }
    }

    // Navigate to source subfolder
    const folder = getFolder(bookmark)
    targetDir = await targetDir.getDirectoryHandle(folder, { create: true })

    // Write file
    const filename = safeFilename(bookmark)
    const fileHandle = await targetDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(generateMarkdown(bookmark))
    await writable.close()

    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return false // User cancelled picker
    }
    // Fallback to clipboard
    return exportToClipboard(bookmark)
  }
}

/** Fallback: copy markdown to clipboard */
export async function exportToClipboard(bookmark: Bookmark): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(generateMarkdown(bookmark))
    return true
  } catch {
    return false
  }
}

/** Batch export multiple bookmarks */
export async function batchExport(
  bookmarks: Bookmark[],
  vaultFolder: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ exported: number; failed: number }> {
  if (!('showDirectoryPicker' in window)) {
    // Fallback: concatenate all and copy to clipboard
    const combined = bookmarks.map(generateMarkdown).join('\n\n---\n\n')
    try {
      await navigator.clipboard.writeText(combined)
      return { exported: bookmarks.length, failed: 0 }
    } catch {
      return { exported: 0, failed: bookmarks.length }
    }
  }

  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    let exported = 0
    let failed = 0

    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i]!
      onProgress?.(i + 1, bookmarks.length)

      try {
        let targetDir = dirHandle
        if (vaultFolder) {
          for (const part of vaultFolder.split('/').filter(Boolean)) {
            targetDir = await targetDir.getDirectoryHandle(part, { create: true })
          }
        }

        const folder = getFolder(bookmark)
        targetDir = await targetDir.getDirectoryHandle(folder, { create: true })

        const filename = safeFilename(bookmark)
        const fileHandle = await targetDir.getFileHandle(filename, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(generateMarkdown(bookmark))
        await writable.close()
        exported++
      } catch {
        failed++
      }
    }

    return { exported, failed }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { exported: 0, failed: 0 }
    }
    return { exported: 0, failed: bookmarks.length }
  }
}

// Augment Window for File System Access API types
declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: string }): Promise<FileSystemDirectoryHandle>
  }
  interface FileSystemDirectoryHandle {
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
  }
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>
  }
  interface FileSystemWritableFileStream {
    write(data: string | BufferSource | Blob): Promise<void>
    close(): Promise<void>
  }
}
