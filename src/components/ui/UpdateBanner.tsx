import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function UpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js').then((reg) => {
      setRegistration(reg);

      // Check for waiting worker on load
      if (reg.waiting) {
        setShowUpdate(true);
        return;
      }

      // Listen for new worker installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShowUpdate(true);
          }
        });
      });
    });

    // Reload when the new SW takes over
    let refreshing = false;
    function onControllerChange() {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  function handleUpdate() {
    if (registration?.waiting) {
      registration.waiting.postMessage('SKIP_WAITING');
    }
  }

  if (!showUpdate) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium shadow-lg">
      <RefreshCw size={16} />
      <span>A new version is available</span>
      <button
        onClick={handleUpdate}
        className="px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 font-semibold transition-colors min-h-[32px]"
      >
        Update Now
      </button>
    </div>
  );
}
