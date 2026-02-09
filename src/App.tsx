import { useMemo } from 'react';
import { useCredentials } from './hooks/useCredentials';
import { useTheme } from './hooks/useTheme';
import { SupabaseProvider } from './context/SupabaseProvider';
import { UIProvider } from './context/UIProvider';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import UpdateBanner from './components/ui/UpdateBanner';
import DemoBanner from './components/ui/DemoBanner';
import SetupScreen from './components/setup/SetupScreen';
import Dashboard from './pages/Dashboard';
import { createMockSupabaseClient } from './lib/mock-supabase';

function getSharedUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  // PWA share target sends ?url= or shared text that may contain a URL
  return params.get('url') || params.get('text') || null;
}

export default function App() {
  const { credentials, saveCredentials, clearCredentials } = useCredentials();
  useTheme();

  const isDemo = credentials?.url === 'demo';
  const mockClient = useMemo(() => (isDemo ? createMockSupabaseClient() : undefined), [isDemo]);
  const sharedUrl = useMemo(getSharedUrl, []);

  if (!credentials) {
    return (
      <ToastProvider>
        <SetupScreen onConnect={saveCredentials} />
      </ToastProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SupabaseProvider url={credentials.url} anonKey={credentials.key} client={mockClient}>
        <UIProvider>
          <ToastProvider>
            {/* Skip nav link for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-600 focus:text-white focus:text-sm focus:font-medium"
            >
              Skip to main content
            </a>
            {isDemo ? <DemoBanner onConnect={clearCredentials} /> : <UpdateBanner />}
            <Dashboard
              credentials={credentials}
              onDisconnect={clearCredentials}
              isDemo={isDemo}
              sharedUrl={sharedUrl}
            />
          </ToastProvider>
        </UIProvider>
      </SupabaseProvider>
    </ErrorBoundary>
  );
}
