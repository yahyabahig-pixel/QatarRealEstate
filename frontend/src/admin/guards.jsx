import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useI18n } from '../i18n/I18nContext'

// -------------------------------------------------------------------------------------
// Route protection (Prompt 3). These improve UX only — the ASP.NET Core backend is the
// security boundary and re-checks every permission on every request.
// -------------------------------------------------------------------------------------

export function ProtectedRoute({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullSpinner />
  if (status !== 'authenticated') return <Navigate to="/admin/login" state={{ from: location }} replace />
  return children
}

export function PermissionRoute({ permission, children }) {
  const { status, hasPermission } = useAuth()
  if (status === 'loading') return <FullSpinner />
  if (status !== 'authenticated') return <Navigate to="/admin/login" replace />
  if (!hasPermission(permission)) return <Forbidden permission={permission} />
  return children
}

export function MainAdminRoute({ children }) {
  const { status, isMainAdmin } = useAuth()
  if (status === 'loading') return <FullSpinner />
  if (status !== 'authenticated') return <Navigate to="/admin/login" replace />
  if (!isMainAdmin) return <Forbidden permission="Main Admin only" />
  return children
}

export function Forbidden({ permission }) {
  const { t } = useI18n()
  return (
    <div className="p-10 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="h-serif text-2xl text-white mb-2">{t('admin.guards.noPermission')}</h2>
      <p className="text-neutral-400 text-sm">{t('admin.guards.requires')} <span className="text-primary">{permission}</span>. {t('admin.guards.askMain')}</p>
    </div>
  )
}

export function FullSpinner() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
