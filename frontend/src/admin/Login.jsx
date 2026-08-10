import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { MOCK_MODE } from '../api/client'

// NOTE: real authentication comes from the backend (ASP.NET Core Identity + JWT,
// roles SuperAdmin/Admin/Agent + permission claims). The demo credentials below exist
// ONLY while VITE_API_URL is unset (mock mode) so the UI can be developed standalone.
export default function Login() {
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await login(email, password)
      navigate(location.state?.from?.pathname || '/admin', { replace: true })
    } catch (err) {
      setError(err.problem?.title || err.message || t('admin.login.failed'))
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at top, #2B2D42, #1B1C2B)' }}>
      <div className="w-full max-w-sm panel-dark !rounded-2xl p-8 shadow-2xl shadow-black/40">
        <div className="text-center mb-8">
          <div className="h-serif text-2xl text-white">Prime<span className="text-primary">Admin</span></div>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">{t('admin.login.commandCenter')}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input type="email" required placeholder={t('admin.login.email')} className="field-dark" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required placeholder={t('admin.login.password')} className="field-dark" value={password} onChange={e => setPassword(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="accent-primary" />
            {t('admin.login.remember')}
          </label>
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">{error}</p>}
          <button disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? t('admin.login.signingIn') : t('admin.login.signIn')}</button>
        </form>
        {MOCK_MODE && (
          <p className="text-[11px] text-neutral-600 mt-6 text-center">
            {t('admin.login.demoNote')} <span className="text-neutral-400">admin@demo.com / admin123</span>.<br />
            {t('admin.login.demoNote2')}
          </p>
        )}
      </div>
    </div>
  )
}
