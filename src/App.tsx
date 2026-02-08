import { useCredentials } from './hooks/useCredentials'
import { useTheme } from './hooks/useTheme'
import { SupabaseProvider } from './context/SupabaseProvider'
import { UIProvider } from './context/UIProvider'
import { ToastProvider } from './components/ui/Toast'
import SetupScreen from './components/setup/SetupScreen'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { credentials, saveCredentials, clearCredentials } = useCredentials()
  useTheme()

  if (!credentials) {
    return (
      <ToastProvider>
        <SetupScreen onConnect={saveCredentials} />
      </ToastProvider>
    )
  }

  return (
    <SupabaseProvider url={credentials.url} anonKey={credentials.key}>
      <UIProvider>
        <ToastProvider>
          <Dashboard credentials={credentials} onDisconnect={clearCredentials} />
        </ToastProvider>
      </UIProvider>
    </SupabaseProvider>
  )
}
