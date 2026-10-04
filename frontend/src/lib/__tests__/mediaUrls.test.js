import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Photos are STORED as a relative path ("/api/media/images/{id}") so they keep working when
// the site moves from http://<ip> to https://<domain>. They are RENDERED as absolute URLs.
// Two functions do that translation, and the admin save path depends on them being exact
// inverses of each other.
//
// They were not checked against each other, and that is how this broke: details.images came
// back resolved to absolute while details.media[].url stayed relative, so the admin save
// compared absolute URLs against relative ones, matched nothing, and on EVERY save deleted
// every photo on the listing and re-uploaded each one under its absolute URL — undoing the
// relative-path migration — while the reorder call silently never ran at all.
//
// The invariant below is the one that was violated. API_URL is read at module load, so the
// env has to be set before the dynamic import.
const API = 'http://localhost'

let resolveMediaUrl, toStoredMediaUrl

beforeEach(async () => {
  vi.stubEnv('VITE_API_URL', API)
  vi.resetModules()
  ;({ resolveMediaUrl, toStoredMediaUrl } = await import('../../api/realEstateApi'))
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('resolveMediaUrl', () => {
  it('makes one of our own stored paths absolute', () => {
    expect(resolveMediaUrl('/api/media/images/abc')).toBe(`${API}/api/media/images/abc`)
  })

  it('leaves an external URL alone', () => {
    expect(resolveMediaUrl('https://images.unsplash.com/photo-1.jpg'))
      .toBe('https://images.unsplash.com/photo-1.jpg')
  })

  it('leaves a data: URI alone', () => {
    expect(resolveMediaUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
  })

  it('passes empty values straight through instead of building "undefined"', () => {
    expect(resolveMediaUrl('')).toBe('')
    expect(resolveMediaUrl(null)).toBe(null)
    expect(resolveMediaUrl(undefined)).toBe(undefined)
  })
})

describe('toStoredMediaUrl', () => {
  it('turns a rendered URL back into the stored path', () => {
    expect(toStoredMediaUrl(`${API}/api/media/images/abc`)).toBe('/api/media/images/abc')
  })

  it('also recovers a path stored absolutely on some OTHER origin', () => {
    // Rows written before the relative-path migration, or by an older deployment.
    expect(toStoredMediaUrl('http://203.0.113.9/api/media/images/abc')).toBe('/api/media/images/abc')
    expect(toStoredMediaUrl('https://old.example.com/api/media/images/abc')).toBe('/api/media/images/abc')
  })

  it('leaves an already-relative path untouched', () => {
    expect(toStoredMediaUrl('/api/media/images/abc')).toBe('/api/media/images/abc')
  })

  it('leaves a genuinely external photo alone', () => {
    expect(toStoredMediaUrl('https://images.unsplash.com/photo-1.jpg'))
      .toBe('https://images.unsplash.com/photo-1.jpg')
  })
})

describe('the two are exact inverses', () => {
  // THIS is the regression guard. The admin save compares what the form holds (rendered)
  // against what the API returns (stored); if this round trip is not the identity for a
  // given value, that comparison silently matches nothing for it.
  const stored = [
    '/api/media/images/0f8f.jpg',
    '/api/media/images/a-b-c-d-e',
    'https://images.unsplash.com/photo-1.jpg',
    'data:image/png;base64,AAAA',
  ]

  it.each(stored)('stored -> rendered -> stored is unchanged for %s', (value) => {
    expect(toStoredMediaUrl(resolveMediaUrl(value))).toBe(value)
  })
})

// What the admin save does with these two is tested in mediaSync.test.js.
