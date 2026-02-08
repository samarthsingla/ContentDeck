import { useState } from 'react'
import { Database, BookOpen, Tags, FileText, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import Button from '../ui/Button'
import { useToast } from '../ui/Toast'
import type { Credentials } from '../../types'

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Capture',
    description: 'Save from any app — browser, YouTube, Twitter, LinkedIn. One tap on mobile.',
  },
  {
    icon: Tags,
    title: 'Organize',
    description: 'AI-powered tagging, custom areas, and a status workflow: Unread → Reading → Done.',
  },
  {
    icon: FileText,
    title: 'Reflect',
    description: 'Add notes, highlights, and questions. Export to Obsidian for long-term knowledge.',
  },
]

export default function SetupScreen({ onConnect }: { onConnect: (creds: Credentials) => void }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const toast = useToast()

  function handleDemo() {
    onConnect({ url: 'demo', key: 'demo' })
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    const trimmedUrl = url.trim().replace(/\/+$/, '')
    const trimmedKey = key.trim()

    if (!trimmedUrl || !trimmedKey) {
      toast.error('Please enter both URL and key')
      return
    }

    setTesting(true)
    try {
      const resp = await fetch(`${trimmedUrl}/rest/v1/bookmarks?limit=1`, {
        headers: {
          apikey: trimmedKey,
          Authorization: `Bearer ${trimmedKey}`,
        },
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      onConnect({ url: trimmedUrl, key: trimmedKey })
      toast.success('Connected!')
    } catch {
      toast.error('Connection failed. Check your URL and key.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mb-4">
            <Database size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">ContentDeck</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-2">
            Capture, organize, and reflect on everything you read.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4 text-center"
            >
              <div className="mx-auto w-10 h-10 rounded-lg bg-primary-600/10 dark:bg-primary-500/10 flex items-center justify-center mb-3">
                <f.icon size={20} className="text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-1">{f.title}</h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Try Demo */}
        <div className="text-center space-y-2">
          <Button onClick={handleDemo} size="lg" className="w-full sm:w-auto px-8">
            Try Demo
          </Button>
          <p className="text-xs text-surface-400 dark:text-surface-500">
            No setup required — explore with sample data
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-surface-200 dark:border-surface-800" />
          <span className="text-xs text-surface-400 dark:text-surface-500 whitespace-nowrap">or connect your database</span>
          <div className="flex-1 border-t border-surface-200 dark:border-surface-800" />
        </div>

        {/* Collapsible Setup Guide */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
          <button
            type="button"
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors min-h-[44px]"
          >
            <span>New to Supabase? Setup guide</span>
            {guideOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {guideOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-surface-100 dark:border-surface-800 pt-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600/10 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Create a free project at{' '}
                  <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-0.5">
                    supabase.com <ExternalLink size={12} />
                  </a>
                </p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600/10 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Run the{' '}
                  <a href="https://github.com/aditya30103/ContentDeck/blob/main/sql/setup.sql" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-0.5">
                    setup SQL <ExternalLink size={12} />
                  </a>
                  {' '}in your Supabase SQL Editor
                </p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600/10 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Copy your Project URL and anon key from Settings → API
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Credential Form */}
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label htmlFor="setup-url" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Supabase Project URL
            </label>
            <input
              id="setup-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="setup-key" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Anon Key
            </label>
            <input
              id="setup-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGci..."
              required
              className="w-full px-3 py-2.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
            />
          </div>
          <Button type="submit" disabled={testing} className="w-full">
            {testing ? 'Testing connection...' : 'Connect'}
          </Button>
        </form>
      </div>
    </div>
  )
}
