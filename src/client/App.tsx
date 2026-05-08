import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { useTranslation } from './i18n/useTranslation'
import { SvgFilters } from './components/SvgFilters'
import { clearAvatarCache } from './components/Avatar'

export function App() {
  const { t } = useTranslation()
  const { state, setAuthenticated, logout } = useAuth()

  const handleLogout = () => {
    clearAvatarCache()
    void logout()
  }

  return (
    <>
      <SvgFilters />
      {state.status === 'loading' ? (
        <div className="min-h-full flex items-center justify-center text-text-muted">
          {t.dashboard.loading}
        </div>
      ) : state.status === 'unauthenticated' ? (
        <AuthPage onAuthenticated={setAuthenticated} />
      ) : (
        <DashboardPage user={state.user} onLogout={handleLogout} />
      )}
    </>
  )
}
