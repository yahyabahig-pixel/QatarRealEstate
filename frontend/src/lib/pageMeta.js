// ---------------------------------------------------------------------------------------
// WHAT EVERY PAGE TELLS GOOGLE AND WHATSAPP ABOUT ITSELF.
//
// index.html carries one set of these tags, baked at build time, and nginx serves that one
// file for every route. So before this module existed, all ~143 addresses in the sitemap
// shipped the same three answers:
//
//   <link rel="canonical" href="https://elmadenah.com/">   "I am a copy of the home page."
//   <meta property="og:title" content="…Premier Property Portal">
//   <meta property="og:image" content="…/brand/og-cover.png">
//
// The canonical one is the expensive mistake. It is not a hint about formatting; it is the
// page telling a crawler which address to index INSTEAD of this one. Every category page
// built to win "محلات للإيجار في أم صلال" was pointing the crawler back at the home page.
//
// Keeping the writing here rather than in the provider has a second payoff: the hard part
// is deciding WHAT each tag should say, and the functions that decide are pure, so they
// are tested without a DOM.
// ---------------------------------------------------------------------------------------

/**
 * For a page that is a real page but not one to put in the index.
 *
 * Giving every path its own canonical fixed the 143 pages that deserve one and quietly
 * broke the rest. nginx answers 200 for ANY path, so a mistyped URL or a link to an address
 * from some older version of the site used to fold into the home page — the one accidental
 * benefit of the canonical pointing there. Now such a path says "I am my own page", under
 * the site's default title, with index,follow still set in index.html. Google indexes it as
 * a thin duplicate instead of consolidating it.
 *
 * `follow` rather than `none` on purpose: do not index this address, but do keep walking
 * the links on it, which on a 404 page are the ones that lead back into the real site.
 */
export const NOINDEX = 'noindex, follow'
export const INDEX = 'index, follow'

/**
 * The path a page should claim as its own, with the query string dropped.
 *
 * Dropping it is the point. /rent?type=Office&page=3 is the /rent page wearing a filter —
 * same template, same heading, a different slice of the same list. Letting each combination
 * claim its own address is how a listings site turns a dozen real pages into thousands of
 * near-duplicates and spends its crawl budget on all of them.
 *
 * The trailing slash goes so /rent and /rent/ cannot be filed as two pages; "/" keeps its
 * own, because an origin with no path is written that way everywhere else on the site.
 */
export function canonicalPath(pathname) {
  const path = String(pathname ?? '/').split('?')[0].split('#')[0]
  const trimmed = path.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * Make a URL absolute against the site's origin.
 *
 * og:image and og:url are read by scrapers that never visited the page, so a relative
 * "/api/media/images/{id}" means nothing to them — WhatsApp resolves it against its own
 * host and shows no picture at all. Anything already absolute (an Unsplash photo, a CDN)
 * is left exactly as it is.
 */
export function absoluteUrl(value, origin) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (!origin) return v
  return `${String(origin).replace(/\/+$/, '')}${v.startsWith('/') ? '' : '/'}${v}`
}

/**
 * Cut a body of text down to a search-result snippet.
 *
 * A listing's own description sells it better than anything generated from its fields, but
 * Google shows roughly 155 characters and cuts the rest mid-word. Cutting at a space keeps
 * the last word whole; the ellipsis says the sentence goes on.
 *
 * Returns undefined, not '', for nothing to show: the caller passes it straight to
 * usePageMeta, where undefined means "use the site default" and '' would mean "this page's
 * description is blank".
 */
export function metaSnippet(text, max = 155) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) return undefined
  if (clean.length <= max) return clean

  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  // Only honour the space if it leaves most of the snippet — one very long word at the
  // start should still be cut, not collapsed to a couple of characters and an ellipsis.
  const body = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut
  return `${body.trimEnd()}…`
}

/**
 * Every tag write this page needs, as data: [{ selector, attribute, value }].
 *
 * Returned rather than applied so the decisions can be asserted in a test without a DOM,
 * and so one render performs one pass over a known list instead of a scattering of
 * querySelector calls nobody can audit.
 *
 * `fallback` holds what the site defaults to — its title, description and cover image.
 * Passing it on EVERY call is what makes navigation safe: a property page sets og:image to
 * its own photo, and the next page, having none, must put the cover back rather than
 * inherit a picture of someone else's villa. `robots` works the same way and for the same
 * reason: it defaults back to INDEX, so leaving a noindex page re-opens the next one.
 */
export function pageMetaTags({ origin, path, title, description, image, robots, fallback = {} }) {
  const url = `${String(origin ?? '').replace(/\/+$/, '')}${canonicalPath(path)}`

  // The browser tab and the Google result show the full "page | brand" string; so should
  // the WhatsApp card, so a shared link reads the same wherever it lands.
  const fullTitle = title || fallback.title || ''
  const desc = description || fallback.description || ''
  const own = absoluteUrl(image, origin)
  const picture = own || absoluteUrl(fallback.image, origin)

  return [
    { selector: 'link[rel="canonical"]', attribute: 'href', value: url },
    { selector: 'meta[name="description"]', attribute: 'content', value: desc },
    { selector: 'meta[name="robots"]', attribute: 'content', value: robots || INDEX },

    { selector: 'meta[property="og:title"]', attribute: 'content', value: fullTitle },
    { selector: 'meta[property="og:description"]', attribute: 'content', value: desc },
    { selector: 'meta[property="og:url"]', attribute: 'content', value: url },
    { selector: 'meta[property="og:image"]', attribute: 'content', value: picture },
    // Describes whatever picture is actually there. Left on the company cover it would tell
    // a reader with images off that a photo of a shop in Muaither is the company logo.
    { selector: 'meta[property="og:image:alt"]', attribute: 'content', value: own ? fullTitle : (fallback.imageAlt || fullTitle) },

    { selector: 'meta[name="twitter:title"]', attribute: 'content', value: fullTitle },
    { selector: 'meta[name="twitter:description"]', attribute: 'content', value: desc },
    { selector: 'meta[name="twitter:image"]', attribute: 'content', value: picture },
  ].filter(tag => tag.value !== '')
}

/**
 * The origin every absolute URL on the page is built from.
 *
 * Taken from the canonical link index.html ships, because Vite replaced %VITE_SITE_URL%
 * there at build time with the configured PUBLIC_ORIGIN — the same value og:url, og:image
 * and the JSON-LD block already use. Reading it instead of adding another configuration
 * knob means the domain is still set in exactly one place.
 *
 * Call this ONCE, before anything rewrites that tag: this module's whole job is to rewrite
 * it, and a later read would hand back its own output.
 *
 * window.location.origin is the fallback, which is also what makes the app work unchanged
 * on a developer's localhost, where nothing replaced the placeholder.
 */
export function readSiteOrigin(doc, loc) {
  try {
    const href = doc?.querySelector?.('link[rel="canonical"]')?.getAttribute?.('href')
    if (href && /^https?:\/\//i.test(href)) return new URL(href).origin
  } catch { /* no tag, or an href that is not a URL — fall through */ }
  return loc?.origin || ''
}

/** Write the tags. Kept apart from the deciding above so that stays testable. */
export function applyPageMetaTags(doc, tags) {
  for (const { selector, attribute, value } of tags) {
    doc?.querySelector?.(selector)?.setAttribute?.(attribute, value)
  }
}
