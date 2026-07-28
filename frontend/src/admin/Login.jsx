import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { MOCK_MODE } from '../api/client'

// NOTE: real authentication comes from the backend (ASP.NET Core Identity + JWT,
// roles SuperAdmin/Admin/Agent + permission claims). The demo credentials below exist
// ONLY while VITE_API_URL is unset (mock mode) so the UI can be developed standalone.
export default function Login() {
  const { login } = useAuth()
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
      setError(err.problem?.title || err.message || 'Login failed.')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at top, #1a1a1a, #0d0d0d)' }}>
      <div className="w-full max-w-sm bg-coal border border-neutral-800 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="h-serif text-2xl text-white">Prime<span className="text-gold">Admin</span></div>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">Command Center</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input type="email" required placeholder="Email" className="field-dark" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className="field-dark" value={password} onChange={e => setPassword(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="accent-gold" />
            Remember me
          </label>
          {error && <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 px-3 py-2">{error}</p>}
          <button disabled={busy} className="btn-gold w-full disabled:opacity-50">{busy ? 'Signing in…' : 'Sign In'}</button>
        </form>
        {MOCK_MODE && (
          <p className="text-[11px] text-neutral-600 mt-6 text-center">
            Demo mode — use <span className="text-neutral-400">admin@demo.com / admin123</span>.<br />
            Set VITE_API_URL to connect the real backend.
          </p>
        )}
      </div>
    </div>
  )
}
