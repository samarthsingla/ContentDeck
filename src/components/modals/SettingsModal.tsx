import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { generateBookmarklet } from '../../lib/utils'
import type { Credentials } from '../../types'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  credentials: Credentials
  onDisconnect: () => void
}

export default function SettingsModal({ open, onClose, credentials, onDisconnect }: SettingsModalProps) {
  const [aiKey, setAiKey] = useState(() => localStorage.getItem('openrouter_key') ?? '')
  const [ytKey, setYtKey] = useState(() => localStorage.getItem('youtube_api_key') ?? '')
  const [obsidianVault, setObsidianVault] = useState(() => localStorage.getItem('obsidian_vault') ?? '')
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false)

  // Save keys to localStorage on change
  useEffect(() => {
    if (aiKey) localStorage.setItem('openrouter_key', aiKey)
    else localStorage.removeItem('openrouter_key')
  }, [aiKey])

  useEffect(() => {
    if (ytKey) localStorage.setItem('youtube_api_key', ytKey)
    else localStorage.removeItem('youtube_api_key')
  }, [ytKey])

  useEffect(() => {
    if (obsidianVault) localStorage.setItem('obsidian_vault', obsidianVault)
    else localStorage.removeItem('obsidian_vault')
  }, [obsidianVault])

  const bookmarkletCode = generateBookmarklet(credentials.url, credentials.key)

  function handleCopyBookmarklet() {
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      setCopiedBookmarklet(true)
      setTimeout(() => setCopiedBookmarklet(false), 2000)
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings" size="md">
      <div className="space-y-6">
        {/* Supabase Connection */}
        <section>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Supabase Connection</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-surface-500 dark:text-surface-400 mb-1">Project URL</label>
              <div className="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm text-surface-600 dark:text-surface-400 truncate">
                {credentials.url}
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-500 dark:text-surface-400 mb-1">Anon Key</label>
              <div className="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm text-surface-600 dark:text-surface-400 font-mono truncate">
                {credentials.key.slice(0, 20)}...
              </div>
            </div>
            <Button variant="danger" onClick={onDisconnect} className="mt-2">
              Disconnect
            </Button>
          </div>
        </section>

        {/* API Keys */}
        <section>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">API Keys</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="settings-ai-key" className="block text-xs text-surface-500 dark:text-surface-400 mb-1">
                OpenRouter API Key <span className="text-surface-400">(for AI tagging)</span>
              </label>
              <input
                id="settings-ai-key"
                type="password"
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                placeholder="sk-or-..."
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="settings-yt-key" className="block text-xs text-surface-500 dark:text-surface-400 mb-1">
                YouTube API Key <span className="text-surface-400">(optional, for extended metadata)</span>
              </label>
              <input
                id="settings-yt-key"
                type="password"
                value={ytKey}
                onChange={(e) => setYtKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 text-sm min-h-[44px]"
              />
            </div>
          </div>
        </section>

        {/* Obsidian */}
        <section>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Obsidian Export</h3>
          <div>
            <label htmlFor="settings-vault" className="block text-xs text-surface-500 dark:text-surface-400 mb-1">
              Vault Folder Name <span className="text-surface-400">(e.g. ContentDeck)</span>
            </label>
            <input
              id="settings-vault"
              type="text"
              value={obsidianVault}
              onChange={(e) => setObsidianVault(e.target.value)}
              placeholder="ContentDeck"
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 text-sm min-h-[44px]"
            />
          </div>
        </section>

        {/* Bookmarklet */}
        <section>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Bookmarklet</h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">
            Drag this to your bookmarks bar, or copy the code below.
          </p>
          <div className="flex items-center gap-2">
            <a
              href={bookmarkletCode}
              onClick={(e) => e.preventDefault()}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium cursor-grab"
              draggable
            >
              + Save to ContentDeck
            </a>
            <button
              onClick={handleCopyBookmarklet}
              className="p-2 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Copy bookmarklet code"
            >
              {copiedBookmarklet ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-surface-500" />}
            </button>
          </div>
        </section>

        {/* Info */}
        <section className="pt-2 border-t border-surface-200 dark:border-surface-800">
          <div className="flex items-center justify-between text-xs text-surface-400 dark:text-surface-500">
            <span>ContentDeck v2.0</span>
            <a
              href="https://github.com/aditya30103/ContentDeck"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-surface-600 dark:hover:text-surface-300"
            >
              GitHub <ExternalLink size={12} />
            </a>
          </div>
        </section>
      </div>
    </Modal>
  )
}
