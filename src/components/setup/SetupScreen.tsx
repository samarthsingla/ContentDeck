import { useState } from 'react'
import { Database } from 'lucide-react'
import Button from '../ui/Button'
import { useToast } from '../ui/Toast'
import type { Credentials } from '../../types'

export default function SetupScreen({ onConnect }: { onConnect: (creds: Credentials) => void }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [testing, setTesting] = useState(false)
  const toast = useToast()

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
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-4">
      <form onSubmit={handleConnect} className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mb-4">
            <Database size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">ContentDeck</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Connect your Supabase project</p>
        </div>

        <div className="space-y-4">
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
        </div>

        <Button type="submit" disabled={testing} className="w-full">
          {testing ? 'Testing connection...' : 'Connect'}
        </Button>
      </form>
    </div>
  )
}
