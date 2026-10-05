// ---------------------------------------------------------------------------------------
// Centralized HTTP client (Prompt 3). Every feature service goes through this — no
// scattered fetch calls in components. When VITE_API_URL is unset the app runs in
// MOCK MODE and services fall back to the shared React store.
// ---------------------------------------------------------------------------------------
export const API_URL = import.meta.env.VITE_API_URL || ''
export const MOCK_MODE = !API_URL

const TOKEN_KEY = 'qre.accessToken'

// sessionStorage is not always there to be read. A browser in private mode, one with site
// data blocked, and a page inside a third-party iframe all THROW on access rather than
// returning null — and this is reached on literally every request, so an unguarded read
// takes the whole site down with a blank page instead of just failing to remember a login.
export const tokenStore = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t) => { try { sessionStorage.setItem(TOKEN_KEY, t) } catch { /* not remembered */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* nothing to clear */ } },
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

// How long a request may hang before it is given up on. `fetch` has NO timeout of its own:
// a server that accepts the connection and then goes quiet leaves the promise pending for
// as long as the tab is open, and every spinner waiting on it spins forever — the assistant
// widget stuck on "…", the admin form stuck on "Saving". An abort turns that into an error
// the existing catch blocks already know how to show.
//
// An upload gets longer: a slow connection pushing a few megabytes of photos is working,
// not stalled, and cutting it off at 20 seconds would fail uploads that would have finished.
export const REQUEST_TIMEOUT_MS = 20_000
export const UPLOAD_TIMEOUT_MS = 120_000

export class TimeoutError extends Error {
  constructor(ms) {
    super(`The server did not respond within ${Math.round(ms / 1000)} seconds.`)
    this.name = 'TimeoutError'
    this.timeout = true
  }
}

export async function http(path, { method = 'GET', body, auth = true, timeoutMs, signal } = {}) {
  const headers = {}
  const token = auth ? tokenStore.get() : null
  if (token) headers.Authorization = `Bearer ${token}`

  // FormData (image upload) sets its own multipart boundary — only JSON-encode plain bodies.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  const limit = timeoutMs ?? (isForm ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new TimeoutError(limit)), limit)
  // A caller's own signal (a component unmounting, a superseded search) still wins.
  const onAbort = () => controller.abort(signal.reason)
  if (signal) {
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
      signal: controller.signal,
    })
  } catch (err) {
    // An abort surfaces as a DOMException; re-throw the reason we aborted WITH, so a caller
    // can tell "it timed out" from "the user navigated away" and from a real network error.
    if (controller.signal.aborted) throw (controller.signal.reason ?? err)
    throw err
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }

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
