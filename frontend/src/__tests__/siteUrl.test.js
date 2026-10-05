import { describe, expect, it } from 'vitest'
import { normalizeSiteUrl } from '../../vite.config.js'

// ---------------------------------------------------------------------------------------
// index.html writes `href="%VITE_SITE_URL%/"` into the canonical link, og:url, og:image and
// the JSON-LD block. An empty value makes that `href="/"`, which Vite reads as an asset to
// bundle — and the build dies with "EISDIR: illegal operation on a directory, read", a
// message that names neither the variable nor the file. CI failed on every push because of
// it, with the persistence job skipped behind the red image build, while every local build
// passed: docker-compose always supplies the value, so only a plain `docker build` hit it.
// ---------------------------------------------------------------------------------------
describe('the site URL can never be empty or relative by the time the HTML is written', () => {
  it('falls back to localhost for everything that is not an absolute http(s) URL', () => {
    for (const bad of [undefined, null, '', '   ', '/', '//', 'localhost', 'example.qa', 'ftp://x.qa', 'http://']) {
      expect(normalizeSiteUrl(bad)).toBe('http://localhost')
    }
  })

  it('keeps a real absolute URL exactly as given', () => {
    expect(normalizeSiteUrl('https://almadenah.qa')).toBe('https://almadenah.qa')
    expect(normalizeSiteUrl('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('strips a trailing slash, so the template cannot produce a double one', () => {
    // "%VITE_SITE_URL%/" + "https://site.qa/" would give "https://site.qa//".
    expect(normalizeSiteUrl('https://site.qa/')).toBe('https://site.qa')
    expect(normalizeSiteUrl('  https://site.qa///  ')).toBe('https://site.qa')
  })
})
