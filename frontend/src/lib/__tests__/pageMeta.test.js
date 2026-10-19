import { describe, expect, it } from 'vitest'
import { absoluteUrl, canonicalPath, INDEX, metaSnippet, NOINDEX, pageMetaTags, readSiteOrigin } from '../pageMeta'

// Every route on this site is served the SAME index.html, so before these functions existed
// all ~143 addresses in the sitemap shipped one canonical tag pointing at the home page —
// each page telling Google to index the home page instead of itself. The tests below pin the
// three decisions that fix it: which address a page claims, how a relative photo becomes one
// a scraper can fetch, and what gets restored when a page has no picture of its own.

describe('canonicalPath', () => {
  it('keeps the path and drops the query', () => {
    expect(canonicalPath('/rent/shops/umm-salal')).toBe('/rent/shops/umm-salal')
    expect(canonicalPath('/rent?type=Office&page=3')).toBe('/rent')
  })

  it('drops the hash too', () => {
    expect(canonicalPath('/about-us#team')).toBe('/about-us')
  })

  // /rent and /rent/ are one page; filed as two they split whatever ranking either earns.
  it('removes a trailing slash', () => {
    expect(canonicalPath('/rent/')).toBe('/rent')
    expect(canonicalPath('/rent///')).toBe('/rent')
  })

  it('leaves the root as a single slash', () => {
    expect(canonicalPath('/')).toBe('/')
    expect(canonicalPath('')).toBe('/')
    expect(canonicalPath(undefined)).toBe('/')
  })
})

describe('absoluteUrl', () => {
  // A property photo is stored in the database and served from /api/media/images/{id}.
  // Left relative, WhatsApp resolves it against its own host and the card shows no picture.
  it('puts the site origin in front of a site-relative path', () => {
    expect(absoluteUrl('/api/media/images/abc', 'https://elmadenah.com'))
      .toBe('https://elmadenah.com/api/media/images/abc')
  })

  it('leaves an already-absolute URL alone', () => {
    expect(absoluteUrl('https://images.unsplash.com/photo-1', 'https://elmadenah.com'))
      .toBe('https://images.unsplash.com/photo-1')
  })

  it('does not double the slash', () => {
    expect(absoluteUrl('/brand/og-cover.png', 'https://elmadenah.com/'))
      .toBe('https://elmadenah.com/brand/og-cover.png')
  })

  it.each([null, undefined, '', '   '])('returns empty for %o', (value) => {
    expect(absoluteUrl(value, 'https://elmadenah.com')).toBe('')
  })
})

describe('pageMetaTags', () => {
  const base = {
    origin: 'https://elmadenah.com',
    path: '/rent/shops/umm-salal',
    title: 'محلات تجارية للإيجار في أم صلال | المدينة للعقارات',
    description: 'محلات تجارية للإيجار في أم صلال.',
    fallback: { image: 'https://elmadenah.com/brand/og-cover.png' },
  }

  const valueOf = (tags, selector) => tags.find(t => t.selector === selector)?.value

  it('points the canonical at this page, not the home page', () => {
    const tags = pageMetaTags(base)
    expect(valueOf(tags, 'link[rel="canonical"]'))
      .toBe('https://elmadenah.com/rent/shops/umm-salal')
  })

  it('gives og:url the same address as the canonical', () => {
    const tags = pageMetaTags(base)
    expect(valueOf(tags, 'meta[property="og:url"]'))
      .toBe(valueOf(tags, 'link[rel="canonical"]'))
  })

  // A filtered listing is the same page wearing a filter. If each combination claimed its
  // own address, one listings page would become thousands of near-duplicates.
  it('canonicalises a filtered listing back to the plain one', () => {
    const tags = pageMetaTags({ ...base, path: '/rent?type=Office&page=3&q=doha' })
    expect(valueOf(tags, 'link[rel="canonical"]')).toBe('https://elmadenah.com/rent')
  })

  it('tells the search result and the shared card the same thing', () => {
    const tags = pageMetaTags(base)
    expect(valueOf(tags, 'meta[property="og:title"]')).toBe(base.title)
    expect(valueOf(tags, 'meta[name="twitter:title"]')).toBe(base.title)
    expect(valueOf(tags, 'meta[name="description"]')).toBe(base.description)
    expect(valueOf(tags, 'meta[property="og:description"]')).toBe(base.description)
  })

  it('uses the page picture, made absolute', () => {
    const tags = pageMetaTags({ ...base, image: '/api/media/images/abc' })
    expect(valueOf(tags, 'meta[property="og:image"]'))
      .toBe('https://elmadenah.com/api/media/images/abc')
    expect(valueOf(tags, 'meta[name="twitter:image"]'))
      .toBe('https://elmadenah.com/api/media/images/abc')
  })

  // The failure this prevents: a visitor opens a villa, then the careers page. Without the
  // fallback the careers page keeps the villa's photo, and that is the card WhatsApp draws.
  it('restores the company cover on a page with no picture', () => {
    const tags = pageMetaTags(base)
    expect(valueOf(tags, 'meta[property="og:image"]'))
      .toBe('https://elmadenah.com/brand/og-cover.png')
  })

  // A tag written with "" is worse than one left alone: it replaces a working fallback
  // with a blank, and a blank og:image is a card with a hole in it.
  it('writes no tag it has no value for', () => {
    const tags = pageMetaTags({ origin: 'https://elmadenah.com', path: '/' })
    expect(tags.every(t => t.value !== '')).toBe(true)
    expect(valueOf(tags, 'meta[property="og:image"]')).toBeUndefined()
    // The canonical still goes out: it is the one tag that is always knowable.
    expect(valueOf(tags, 'link[rel="canonical"]')).toBe('https://elmadenah.com/')
  })
})

describe('metaSnippet', () => {
  // A listing's own description sells it better than anything built from its fields, but
  // Google shows roughly 155 characters and cuts the rest mid-word.
  it('passes short text through untouched', () => {
    expect(metaSnippet('A corner shop on the ground floor.')).toBe('A corner shop on the ground floor.')
  })

  it('collapses the whitespace a textarea leaves behind', () => {
    expect(metaSnippet('  Two   lines\n\nof text.  ')).toBe('Two lines of text.')
  })

  it('cuts at a word boundary and says the sentence goes on', () => {
    const text = 'word '.repeat(60).trim()
    const out = metaSnippet(text, 40)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(41)
    expect(out).not.toMatch(/wor…$/)      // never mid-word
  })

  // One very long word at the start must still be cut, not collapsed to two characters
  // and an ellipsis — the reason the boundary is only honoured past halfway.
  it('still cuts when there is no space to cut at', () => {
    const out = metaSnippet(`x${'y'.repeat(200)}`, 30)
    expect(out.length).toBe(31)
    expect(out.endsWith('…')).toBe(true)
  })

  // undefined, never '': the caller hands this straight to usePageMeta, where undefined
  // means "use the site default" and '' would mean "this page's description is blank".
  it.each([null, undefined, '', '   ', '\n\t '])('returns undefined for %o', (value) => {
    expect(metaSnippet(value)).toBeUndefined()
  })

  it('is exact at the limit', () => {
    const exact = 'a'.repeat(155)
    expect(metaSnippet(exact)).toBe(exact)
    expect(metaSnippet(`${exact}b`)).toHaveLength(156)   // 155 cut + the ellipsis
  })
})

describe('pageMetaTags — robots', () => {
  const base = { origin: 'https://elmadenah.com', path: '/favourites', title: 'Saved', description: 'd' }
  const valueOf = (tags, selector) => tags.find(t => t.selector === selector)?.value

  // nginx answers 200 for every path, so a mistyped URL renders the 404 page. Giving every
  // path its own canonical fixed the real pages and left those claiming to be real too.
  it('keeps a page out of the index when it asks to be', () => {
    expect(valueOf(pageMetaTags({ ...base, robots: NOINDEX }), 'meta[name="robots"]')).toBe('noindex, follow')
  })

  // `follow`, not `none`: do not index a 404, but do keep walking the links on it, which
  // are the ones that lead back into the real site.
  it('still lets a crawler follow the links on it', () => {
    expect(NOINDEX).toContain('follow')
    expect(NOINDEX).not.toContain('nofollow')
  })

  // The failure this prevents: one noindex page closing every page the visitor opens next.
  it('re-opens the next page by default', () => {
    expect(valueOf(pageMetaTags(base), 'meta[name="robots"]')).toBe(INDEX)
    expect(valueOf(pageMetaTags({ ...base, robots: undefined }), 'meta[name="robots"]')).toBe('index, follow')
  })
})

describe('pageMetaTags — the picture is described correctly', () => {
  const base = {
    origin: 'https://elmadenah.com',
    path: '/property/rent/x',
    title: 'Shop in Muaither | AL-Madenah',
    description: 'A shop.',
    fallback: { image: '/brand/og-cover.png', imageAlt: 'AL-Madenah Real Estate' },
  }
  const valueOf = (tags, selector) => tags.find(t => t.selector === selector)?.value

  it('describes the listing photo as the listing, not as the company logo', () => {
    const tags = pageMetaTags({ ...base, image: '/api/media/images/abc' })
    expect(valueOf(tags, 'meta[property="og:image:alt"]')).toBe(base.title)
  })

  it('puts the company alt back when the cover is back', () => {
    expect(valueOf(pageMetaTags(base), 'meta[property="og:image:alt"]')).toBe('AL-Madenah Real Estate')
  })
})

describe('readSiteOrigin', () => {
  const docWithCanonical = (href) => ({
    querySelector: () => (href === null ? null : { getAttribute: () => href }),
  })

  // The build stamps PUBLIC_ORIGIN into index.html's canonical link. Reading the origin back
  // out of it keeps the domain configured in exactly one place.
  it('takes the origin from the canonical link the build wrote', () => {
    expect(readSiteOrigin(docWithCanonical('https://elmadenah.com/'), { origin: 'http://10.0.0.1' }))
      .toBe('https://elmadenah.com')
  })

  // On a developer's machine nothing replaced the placeholder, so the browser's own origin
  // is what keeps the app working there unchanged.
  it('falls back to the browser origin when the tag is missing or not a URL', () => {
    expect(readSiteOrigin(docWithCanonical(null), { origin: 'http://localhost:5173' }))
      .toBe('http://localhost:5173')
    expect(readSiteOrigin(docWithCanonical('/'), { origin: 'http://localhost:5173' }))
      .toBe('http://localhost:5173')
  })

  it('survives having no document at all', () => {
    expect(readSiteOrigin(undefined, { origin: 'http://localhost:5173' }))
      .toBe('http://localhost:5173')
    expect(readSiteOrigin(undefined, undefined)).toBe('')
  })
})
