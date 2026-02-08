import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, Smartphone, FlaskConical } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { generateBookmarklet } from '../../lib/utils'
import type { Credentials } from '../../types'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  credentials: Credentials
  onDisconnect: () => void
  isDemo?: boolean
}

export default function SettingsModal({ open, onClose, credentials, onDisconnect, isDemo }: SettingsModalProps) {
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
        {/* Supabase Connection / Demo Notice */}
        {isDemo ? (
          <section className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4">
            <div className="flex items-start gap-3">
              <FlaskConical size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Demo Mode</h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  You're exploring with sample data. Connect a Supabase database to save your own bookmarks.
                </p>
                <Button variant="secondary" size="sm" onClick={onDisconnect}>
                  Connect Database
                </Button>
              </div>
            </div>
          </section>
        ) : (
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
        )}

        {/* Save from Your Phone */}
        <section>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2 flex items-center gap-2">
            <Smartphone size={16} />
            Save from Your Phone
          </h3>
          <div className="space-y-3 text-xs text-surface-600 dark:text-surface-400">
            <div className="rounded-lg bg-surface-50 dark:bg-surface-800/50 p-3 space-y-2">
              <p className="font-medium text-surface-700 dark:text-surface-300">Install as App</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Android:</strong> Chrome menu → "Install app"</li>
                <li><strong>iOS:</strong> Safari → Share → "Add to Home Screen"</li>
              </ul>
              <p className="text-surface-500 dark:text-surface-500 pt-1">
                After installing, share any URL from any app → pick ContentDeck from the share sheet.
              </p>
            </div>
            <div className="rounded-lg bg-surface-50 dark:bg-surface-800/50 p-3 space-y-2">
              <p className="font-medium text-surface-700 dark:text-surface-300">iOS Shortcut (power users)</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Open Shortcuts app → tap +</li>
                <li>Add "Get Contents of URL" action with your Supabase REST URL</li>
                <li>Tap (i) → enable "Show in Share Sheet"</li>
              </ol>
              <p className="text-surface-500 dark:text-surface-500 pt-1">
                Saves in the background without opening the app.
              </p>
            </div>
            <p className="text-surface-500 dark:text-surface-500">
              Or just tap <strong>+</strong> in the app and paste any URL.
            </p>
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

        {/* Bookmarklet — hidden in demo mode */}
        {!isDemo && (
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
        )}

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
