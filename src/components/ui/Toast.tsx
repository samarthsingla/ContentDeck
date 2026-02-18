import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);
  const value = useMemo<ToastContextValue>(
    () => ({ success, error, info }),
    [success, error, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`
              flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
              motion-safe:animate-[slideUp_0.2s_ease-out]
              ${t.type === 'success' ? 'bg-green-600 dark:bg-green-700 text-white' : ''}
              ${t.type === 'error' ? 'bg-red-600 dark:bg-red-700 text-white' : ''}
              ${t.type === 'info' ? 'bg-surface-700 text-surface-100 dark:bg-surface-800' : ''}
            `}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="p-1 rounded hover:bg-white/20 min-w-[28px] min-h-[28px] flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
