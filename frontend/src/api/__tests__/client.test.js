import { describe, expect, it, vi, afterEach } from 'vitest'
import { http, qs, describeApiError, REQUEST_TIMEOUT_MS, UPLOAD_TIMEOUT_MS, TimeoutError } from '../client'

// ---------------------------------------------------------------------------------------
// `fetch` has no timeout of its own. A server that accepts the connection and then goes
// quiet leaves the promise pending for as long as the tab is open — and every spinner
// waiting on it spins forever: the assistant stuck on "…", the admin form stuck on
// "Saving", with no error and nothing to retry. These tests pin the abort that ends it.
// ---------------------------------------------------------------------------------------

afterEach(() => { vi.unstubAllGlobals() })

// A fetch that never answers, but DOES reject once the request is aborted — which is how a
// real stalled request behaves.
const hangingFetch = () => vi.fn((_url, init) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
}))

describe('a request that never answers is given up on', () => {
  it('rejects with a TimeoutError once the limit passes', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    // A real 25 ms limit rather than fake timers: the thing under test is an AbortController
    // firing from a setTimeout, and keeping both real is what makes this a true end-to-end.
    await expect(http('/api/properties', { auth: false, timeoutMs: 25 }))
      .rejects.toBeInstanceOf(TimeoutError)
  })

  it('a stalled request does not hang forever by default', () => {
    // The guard that matters is that there IS a default at all.
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0)
    expect(REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(60_000)
  })

  it('gives an upload far longer — a slow connection is working, not stalled', () => {
    // Cutting a multi-megabyte photo upload off at the normal limit would fail uploads that
    // were going to finish.
    expect(UPLOAD_TIMEOUT_MS).toBeGreaterThan(REQUEST_TIMEOUT_MS * 2)
  })

  it('a caller aborting for its own reason is NOT reported as a timeout', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const ac = new AbortController()
    const pending = http('/api/properties', { auth: false, signal: ac.signal })
    ac.abort(new Error('component unmounted'))
    await expect(pending).rejects.toThrow('component unmounted')
  })

  it('still returns normally when the server does answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200, ok: true, json: async () => ({ totalCount: 3, items: [] }),
    })))
    await expect(http('/api/properties', { auth: false })).resolves.toEqual({ totalCount: 3, items: [] })
  })

  it('describes a timeout in words a user can act on', () => {
    expect(describeApiError(new TimeoutError(20000))).toMatch(/20 seconds/)
  })
})

describe('query strings the backend can actually bind', () => {
  it('repeats an array key instead of comma-joining it', () => {
    // ASP.NET Core binds Guid[] from repeated keys only; "featureIds=a,b" is rejected
    // outright, which is how the amenity filter came to send nothing the server understood.
    expect(qs({ featureIds: ['a', 'b'] })).toBe('?featureIds=a&featureIds=b')
    expect(qs({ excludeFeatureIds: ['x'] })).toBe('?excludeFeatureIds=x')
  })

  it('drops empty values rather than sending blanks', () => {
    expect(qs({ city: '', page: 1, q: null, sort: undefined, featureIds: [] })).toBe('?page=1')
  })
})
