import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import en from './en'
import ar from './ar'
import { applyPageMetaTags, pageMetaTags, readSiteOrigin } from '../lib/pageMeta'

// ---------------------------------------------------------------------------------------
// Lightweight localization, mirroring the approach sketched in docs/ROADMAP.md
// ("a translation dictionary in the frontend"): no library, one context, two dictionaries.
//
//   const { t, lang, dir, isRTL, setLang } = useI18n()
//   t('nav.rent')                        -> "Rent" | "إيجار"
//   t('listings.results', { n: 12 })     -> "12 properties" (simple {var} interpolation)
//
// Key resolution: dictionaries are nested objects; 'a.b.c' walks them. A key missing from
// Arabic falls back to English; a key missing from both renders the key itself (loud in
// dev, harmless in production).
//
// The choice persists in localStorage under 'qre.lang' (same prefix convention as the
// auth token's 'qre.accessToken'), so a refresh keeps the language.
//
// The provider owns the <html> element's lang/dir attributes. Everything directional in
// CSS keys off dir="rtl": Tailwind logical utilities (ms-*/ps-*/text-start), the rtl:
// variant, and the [dir="rtl"] rules in index.css.
// ---------------------------------------------------------------------------------------

const DICTS = { en, ar }
const STORAGE_KEY = 'qre.lang'

// Read ONCE, here at module load, which runs on import — before React has rendered anything
// and so before the effect below has rewritten anything.
//
//   SITE_ORIGIN    the configured domain, taken from the canonical link Vite stamped into
//                  index.html, so the domain stays set in one place (PUBLIC_ORIGIN).
//   FALLBACK_IMAGE the company cover, restored on every page that has no picture of its
//                  own — otherwise a villa's photo would follow the visitor onto the
//                  careers page and be the card WhatsApp shows for it.
//
// FALLBACK_IMAGE comes from qre:default-og-image, a tag that exists only so this module can
// read it, rather than from og:image, which this module rewrites. With og:image, a hot
// reload while sitting on a listing re-runs this line, captures THAT listing's photo as the
// site-wide default, and every page after it "restores" the villa.
//
// All guard on `document` because the test run is a node environment with no DOM.
const meta = (name) => (typeof document === 'undefined'
  ? ''
  : document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '')

const SITE_ORIGIN = typeof document === 'undefined'
  ? ''
  : readSiteOrigin(document, typeof window === 'undefined' ? null : window.location)

const FALLBACK_IMAGE = meta('qre:default-og-image')
const FALLBACK_IMAGE_ALT = meta('qre:default-og-image-alt')

const I18nContext = createContext(null)

function lookup(dict, path) {
  let node = dict
  for (const part of path.split('.')) {
    if (node == null || typeof node !== 'object') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'ar' || v === 'en' ? v : 'en'
  } catch {
    return 'en' // storage blocked (private mode etc.) — default, no persistence
  }
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang)

  // What the CURRENT page wants in the title and description, or null for the site default.
  // Pages do not write document.title themselves -- see the note on the effect below.
  const [pageMeta, setPageMeta] = useState(null)

  // The address bar, as the router knows it, because the canonical tag has to follow
  // navigation and pageMeta alone cannot carry that: moving between two pages that set no
  // meta of their own never changes this state, so the effect would not re-run and the
  // second page would go on claiming the first one's address.
  //
  // Reading it here costs nothing downstream — `pathname` is deliberately NOT in the
  // memo below, so the context value stays identical across a navigation and no consumer
  // re-renders because of it.
  const { pathname } = useLocation()

  const setLang = useCallback((next) => {
    const value = next === 'ar' ? 'ar' : 'en'
    setLangState(value)
    try { localStorage.setItem(STORAGE_KEY, value) } catch { /* non-fatal */ }
  }, [])

  const t = useCallback((key, vars) => {
    let text = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
    return text
  }, [lang])

  // The provider is the single writer of <html lang dir>, the document title and the
  // SEO description meta — Google renders JS, so Arabic visitors get the Arabic snippet.
  // (The static values in index.html stay as the crawler/scraper fallback.)
  //
  // Pages supply their own title through usePageMeta() rather than writing document.title,
  // and the reason is ordering, not tidiness. React runs a child's effect BEFORE its
  // parent's, so a page that wrote the title directly would have it overwritten by this
  // effect the moment the language changed -- every page silently reverting to the site
  // default, and only on language switch, which is the kind of bug nobody reproduces.
  // Registering the intention as state instead means this effect always runs last and
  // always has the current page's answer.
  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = lang === 'ar' ? 'rtl' : 'ltr'

    // A page gives the specific part; the brand is appended here so every page in the site
    // ends the same way without each one remembering to.
    const title = pageMeta?.title
      ? `${pageMeta.title} | ${t('meta.brand')}`
      : t('meta.title')
    const description = pageMeta?.description || t('meta.description')

    document.title = title

    // The same answer goes to the search result, the shared link's card and the canonical
    // tag, so a page says one thing about itself everywhere. Only the picture needs a
    // fallback: the title and description already resolve to the site defaults above.
    applyPageMetaTags(document, pageMetaTags({
      origin: SITE_ORIGIN,
      path: pathname,
      title,
      description,
      image: pageMeta?.image,
      robots: pageMeta?.robots,
      fallback: { image: FALLBACK_IMAGE, imageAlt: FALLBACK_IMAGE_ALT },
    }))
  }, [lang, t, pageMeta, pathname])

  // Display-only translation for catalog names (property types). The RAW name stays the
  // value used in filters/URLs/API calls — only what the user SEES is localized.
  const typeLabel = useCallback((name) => {
    if (!name) return name
    const key = `types.${name}`
    const v = t(key)
    return v === key ? name : v
  }, [t])

  const value = useMemo(() => ({
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    isRTL: lang === 'ar',
    setLang,
    toggleLang: () => setLang(lang === 'ar' ? 'en' : 'ar'),
    t,
    typeLabel,
    setPageMeta,
  }), [lang, setLang, t, typeLabel])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

/**
 * Give this page its own title, search-result description and shared-link picture.
 *
 *   usePageMeta(
 *     t('categories.officesForRent.title'),      // "مكاتب للإيجار في قطر"
 *     t('categories.officesForRent.description'),
 *     p.images?.[0],                             // optional: the card WhatsApp shows
 *   )
 *
 * The brand is appended to the title by the provider, so pass only the part that describes
 * the page. Pass nothing (or undefined) and the site default applies — which is what every
 * page did before, and why a search for anything on this site returned a page whose title
 * said nothing about what was on it.
 *
 * `image` may be relative ("/api/media/images/{id}"); the provider makes it absolute, which
 * it has to be for a scraper that never loaded the page.
 *
 * `robots` is for a page that exists but should not be in the index — pass NOINDEX from
 * lib/pageMeta. It defaults back to index,follow on every other page, so one noindex page
 * cannot close the next one.
 *
 * Clears on unmount, so navigating away cannot leave the previous page's title behind.
 *
 * WORTH KNOWING: Google runs JavaScript, so it sees everything this sets. WhatsApp and
 * Facebook do NOT — they read the raw HTML and nothing more, so the card they draw is
 * still the static one in index.html. Giving them the real per-page values needs the
 * SERVER to write the tags before the page is sent, which is a separate piece of work.
 */
export function usePageMeta(title, description, image, robots) {
  const { setPageMeta } = useI18n()
  useEffect(() => {
    if (!title && !description && !image && !robots) return undefined
    setPageMeta({ title, description, image, robots })
    return () => setPageMeta(null)
  }, [title, description, image, robots, setPageMeta])
}
