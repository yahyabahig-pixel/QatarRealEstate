import { http, MOCK_MODE } from './client'

// Shapes mirror Auth.Contracts on the backend:
//   POST /api/auth/login  -> { accessToken, expiresAtUtc }
//   GET  /api/auth/me     -> CurrentAdminDto { id, email, fullName, isMainAdmin, positionName, roles[], permissions[] }

const MOCK_USER = {
  id: 'mock-admin', email: 'admin@demo.com', fullName: 'Demo Main Admin',
  isMainAdmin: true, positionName: null, roles: ['SuperAdmin'],
  permissions: [],   // main admin bypasses permission checks anyway
}

export const authApi = {
  async login(email, password) {
    if (MOCK_MODE) {
      // DEMO ONLY — real authentication comes from ASP.NET Core Identity + JWT on the
      // backend. This branch exists so the UI can be developed without the API running.
      await new Promise(r => setTimeout(r, 400))
      if (email === 'admin@demo.com' && password === 'admin123')
        return { accessToken: 'mock-token', expiresAtUtc: new Date(Date.now() + 36e5).toISOString() }
      const err = new Error('Invalid email or password.'); err.status = 401; throw err
    }
    return http('/api/auth/login', { method: 'POST', body: { email, password }, auth: false })
  },

  async me() {
    if (MOCK_MODE) return MOCK_USER
    return http('/api/auth/me')
  },
}
