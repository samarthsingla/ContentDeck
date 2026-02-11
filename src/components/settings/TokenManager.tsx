import { useState } from 'react';
import { Key, Copy, Trash2, AlertTriangle, Check, Bookmark, Smartphone } from 'lucide-react';
import Button from '../ui/Button';
import { useTokens } from '../../hooks/useTokens';
import { getEdgeFunctionUrl, generateBookmarklet, generateShortcutConfig } from '../../lib/tokens';

export default function TokenManager() {
  const { tokens, isLoading, createToken, deleteToken } = useTokens();
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const functionUrl = getEdgeFunctionUrl();

  async function handleCreate() {
    const result = await createToken.mutateAsync('Default');
    setNewToken(result.plainToken);
  }

  function copyToClipboard(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  const bookmarkletCode = newToken ? generateBookmarklet(functionUrl, newToken) : '';
  const shortcutConfig = newToken ? generateShortcutConfig(functionUrl, newToken) : null;

  return (
    <section>
      <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2 flex items-center gap-2">
        <Key size={16} />
        API Tokens
      </h3>
      <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
        Generate a token to save bookmarks from a desktop bookmarklet or iOS Shortcut.
      </p>

      {/* Just-created token alert */}
      {newToken && (
        <div className="mb-4 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={16}
              className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Copy your token now — it won't be shown again.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white dark:bg-surface-800 rounded px-2 py-1.5 break-all text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700">
              {newToken}
            </code>
            <button
              onClick={() => copyToClipboard(newToken, 'token')}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Copy token"
            >
              {copied === 'token' ? (
                <Check size={16} className="text-green-600" />
              ) : (
                <Copy size={16} className="text-surface-500" />
              )}
            </button>
          </div>

          {/* Bookmarklet */}
          <div className="rounded-lg bg-white dark:bg-surface-800 p-3 space-y-2 border border-surface-200 dark:border-surface-700">
            <div className="flex items-center gap-2 text-xs font-medium text-surface-700 dark:text-surface-300">
              <Bookmark size={14} />
              Bookmarklet
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Drag this link to your bookmarks bar:
            </p>
            <a
              href={bookmarkletCode}
              className="inline-block px-3 py-1.5 rounded bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 no-underline"
              onClick={(e) => e.preventDefault()}
              title="Drag to bookmarks bar"
            >
              + ContentDeck
            </a>
            <button
              onClick={() => copyToClipboard(bookmarkletCode, 'bookmarklet')}
              className="ml-2 text-xs text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 min-h-[44px]"
            >
              {copied === 'bookmarklet' ? (
                <>
                  <Check size={12} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={12} /> Copy code
                </>
              )}
            </button>
          </div>

          {/* iOS Shortcut */}
          {shortcutConfig && (
            <div className="rounded-lg bg-white dark:bg-surface-800 p-3 space-y-2 border border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2 text-xs font-medium text-surface-700 dark:text-surface-300">
                <Smartphone size={14} />
                iOS Shortcut
              </div>
              <ol className="text-xs text-surface-500 dark:text-surface-400 space-y-1 list-decimal list-inside">
                <li>Open the Shortcuts app → New Shortcut</li>
                <li>
                  Add action: <strong>Get Contents of URL</strong>
                </li>
                <li>
                  Method: <strong>POST</strong>, Request Body: <strong>JSON</strong>
                </li>
                <li>
                  Add keys: <code className="font-mono">token</code>,{' '}
                  <code className="font-mono">url</code>, <code className="font-mono">title</code>
                </li>
                <li>Set token value to your token (copied above)</li>
                <li>Set url and title to the Shortcut Input variables</li>
              </ol>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-surface-500 dark:text-surface-400">URL:</span>
                <code className="text-xs font-mono break-all text-surface-700 dark:text-surface-300">
                  {shortcutConfig.url}
                </code>
                <button
                  onClick={() => copyToClipboard(shortcutConfig.url, 'shortcut-url')}
                  className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Copy shortcut URL"
                >
                  {copied === 'shortcut-url' ? (
                    <Check size={12} className="text-green-600" />
                  ) : (
                    <Copy size={12} className="text-surface-500" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setNewToken(null)}
            className="text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 min-h-[44px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Token list */}
      {tokens.length > 0 && (
        <div className="space-y-2 mb-3">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between rounded-lg bg-surface-50 dark:bg-surface-800/50 px-3 py-2"
            >
              <div className="text-xs">
                <span className="font-medium text-surface-700 dark:text-surface-300">
                  {token.name}
                </span>
                <span className="text-surface-400 dark:text-surface-500 ml-2">
                  Created {new Date(token.created_at).toLocaleDateString()}
                </span>
                {token.last_used_at && (
                  <span className="text-surface-400 dark:text-surface-500 ml-2">
                    · Last used {new Date(token.last_used_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteToken.mutate(token.id)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Revoke token"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Generate button */}
      {!newToken && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCreate}
          disabled={createToken.isPending || isLoading}
        >
          <Key size={14} />
          {createToken.isPending ? 'Generating...' : 'Generate API Token'}
        </Button>
      )}
    </section>
  );
}
