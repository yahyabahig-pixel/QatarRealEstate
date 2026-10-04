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

// One readable message out of an ApiError: the ProblemDetails title PLUS every
// validation detail the backend sent (dict-of-arrays for ValidationProblemDetails,
// or [{code, description}] for domain errors). "Validation failed" alone tells the
// admin nothing — the reason underneath is what they need.
export const describeApiError = (err, fallback = 'Request failed.') => {
  const parts = [err?.problem?.title || err?.message || fallback]
  const errs = err?.errors
  if (Array.isArray(errs)) parts.push(errs.map(e => e.description || e.code).filter(Boolean).join('\n'))
  else if (errs && typeof errs === 'object') parts.push(Object.values(errs).flat().join('\n'))
  return parts.filter(Boolean).join('\n')
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
//
// An ARRAY value becomes a repeated key — "?featureIds=a&featureIds=b" — because that is
// the only shape ASP.NET Core binds to a Guid[] parameter. Object.fromEntries used to
// collapse the array into one comma-joined value ("featureIds=a,b"), which the model
// binder rejects outright: the amenity filter silently sent nothing the server understood.
// An empty array is dropped entirely, exactly like an empty string.
export const qs = (params = {}) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (Array.isArray(v)) {
      v.filter(x => x !== undefined && x !== null && x !== '').forEach(x => search.append(k, x))
      return
    }
    search.append(k, v)
  })
  const out = search.toString()
  return out ? `?${out}` : ''
}
