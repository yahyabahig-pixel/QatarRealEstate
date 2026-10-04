import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { authApi } from '../api/authApi'
import { tokenStore, setUnauthorizedHandler } from '../api/client'

// ---------------------------------------------------------------------------------------
// Auth state — kept SEPARATE from business data (Prompt 3). The backend is the source of
// truth: permissions here only shape the UI (hide/disable buttons); every real check is
// enforced server-side and a 403 is still handled gracefully.
// ---------------------------------------------------------------------------------------
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)          // CurrentAdminDto from /api/auth/me
  const [status, setStatus] = useState('loading') // loading | anonymous | authenticated

  // Signing in and out changes WHICH data the app is allowed to see, and the shared store
  // loaded its slices once, on mount. Nothing told it the identity had changed, so after a
  // login the admin kept looking at the anonymous view — no real enquiries, only active
  // agents — until they pressed refresh by hand. This event is that signal; DataContext
  // listens for it and reloads. (sessionStorage is per-tab, so the native 'storage' event
  // never fires for our own writes.)
  const announceIdentityChange = () =>
    window.dispatchEvent(new Event('qre:auth-changed'))

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) { setStatus('anonymous'); return }
    try {
      const me = await authApi.me()
      setUser(me); setStatus('authenticated')
    } catch {
      tokenStore.clear(); setUser(null); setStatus('anonymous')
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear(); setUser(null); setStatus('anonymous')
      announceIdentityChange()   // an expired token is a logout too
    })
    loadMe()
  }, [loadMe])

  const login = useCallback(async (email, password) => {
    const token = await authApi.login(email, password)   // throws on bad credentials
    tokenStore.set(token.accessToken)
    const me = await authApi.me()
    setUser(me); setStatus('authenticated')
    announceIdentityChange()
    return me
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear(); setUser(null); setStatus('anonymous')
    announceIdentityChange()
  }, [])

  const value = useMemo(() => ({
    user, status,
    isAuthenticated: status === 'authenticated',
    isMainAdmin: !!user?.isMainAdmin,
    // Main Admin bypass mirrors the backend's PermissionAuthorizationHandler.
    hasPermission: (p) => !!user && (user.isMainAdmin || (user.permissions || []).includes(p)),
    login, logout,
  }), [user, status, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
