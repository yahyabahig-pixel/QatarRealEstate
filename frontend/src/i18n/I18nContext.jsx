import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './en'
import ar from './ar'

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
    document.title = pageMeta?.title
      ? `${pageMeta.title} | ${t('meta.brand')}`
      : t('meta.title')

    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', pageMeta?.description || t('meta.description'))
  }, [lang, t, pageMeta])

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
 * Give this page its own title and search-result description.
 *
 *   usePageMeta(
 *     t('categories.officesForRent.title'),      // "مكاتب للإيجار في قطر"
 *     t('categories.officesForRent.description'),
 *   )
 *
 * The brand is appended to the title by the provider, so pass only the part that describes
 * the page. Pass nothing (or undefined) and the site default applies — which is what every
 * page did before, and why a search for anything on this site returned a page whose title
 * said nothing about what was on it.
 *
 * Clears on unmount, so navigating away cannot leave the previous page's title behind.
 */
export function usePageMeta(title, description) {
  const { setPageMeta } = useI18n()
  useEffect(() => {
    if (!title && !description) return undefined
    setPageMeta({ title, description })
    return () => setPageMeta(null)
  }, [title, description, setPageMeta])
}
