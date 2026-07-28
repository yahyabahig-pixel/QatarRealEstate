// ---------------------------------------------------------------------------------------
// Centralized HTTP client (Prompt 3). Every feature service goes through this — no
// scattered fetch calls in components. When VITE_API_URL is unset the app runs in
// MOCK MODE and services fall back to the shared React store.
// ---------------------------------------------------------------------------------------
export const API_URL = import.meta.env.VITE_API_URL || ''
export const MOCK_MODE = !API_URL

const TOKEN_KEY = 'qre.accessToken'

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  constructor(status, problem) {
    super(problem?.title || `Request failed (${status})`)
    this.status = status
    this.problem = problem            // RFC 9457 ProblemDetails from the backend
    this.errors = problem?.errors     // validation dictionary or [{code, description}]
  }
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

export async function http(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  // FormData (image upload) sets its own multipart boundary — only JSON-encode plain bodies.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
  })

  if (res.status === 204) return null

  let payload = null
  try { payload = await res.json() } catch { /* empty body */ }

  if (res.ok) return payload

  if (res.status === 401) onUnauthorized()   // token expired/invalid → route to login
  throw new ApiError(res.status, payload)
}

// Build "?a=1&b=2" from an object, skipping null/undefined/'' so the backend's
// record-constructor binding sees genuinely absent parameters, not empty strings.
export const qs = (params = {}) => {
  const pairs = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (pairs.length === 0) return ''
  return '?' + new URLSearchParams(Object.fromEntries(pairs)).toString()
}
