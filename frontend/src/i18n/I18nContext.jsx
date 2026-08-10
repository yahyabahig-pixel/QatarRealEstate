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

  // The provider is the single writer of <html lang dir> and the document title.
  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = t('meta.title')
  }, [lang, t])

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
  }), [lang, setLang, t, typeLabel])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
