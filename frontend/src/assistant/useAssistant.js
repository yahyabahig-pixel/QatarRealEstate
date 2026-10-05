// ---------------------------------------------------------------------------------------
// Conversation state: the multi-turn memory the requirements describe. Filters ACCUMULATE
// across messages — «للإيجار» after «عايز شقة في لوسيل» refines the same search, «خليها
// 3 غرف» edits one slot, «شيل شرط المسبح» removes one condition — and nothing resets
// unless the user asks to start over.
//
// Clarification policy (deliberately minimal): the only essential missing piece worth a
// question is buy-vs-rent, asked AT MOST ONCE per search thread. Everything else is
// refined after showing honest results, never by interrogating the user.
// ---------------------------------------------------------------------------------------
import { useCallback, useMemo, useRef, useState } from 'react'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { parseMessage } from './nlu/parse'
import { runSearch, matchTypeNames } from './search'
import { pick, summarize, countPhrase, removalPhrase, relaxedIntro, notesPhrase, SUGGESTIONS } from './replies'
import { recordSearch } from './telemetry'
import { hasAny, applyRemovals, mergeSlots } from './filters'

const GREET_SHORT = {
  salam: { ar: 'وعليكم السلام ورحمة الله وبركاته!', en: 'Wa alaykum assalam!' },
  morning: { ar: 'صباح النور!', en: 'Good morning!' },
  evening: { ar: 'مساء النور!', en: 'Good evening!' },
  hi: { ar: 'أهلاً بك!', en: 'Hello!' },
}
const ERR_TEXT = {
  ar: 'عذرًا، حدث خطأ أثناء البحث. حاول مرة أخرى بعد لحظات.',
  en: 'Sorry — something went wrong while searching. Please try again in a moment.',
}
const NARROW_HINT = {
  ar: 'لو حددت عدد الغرف أو الميزانية أقدر أضيّق النتائج أكثر.',
  en: 'Tell me a bedroom count or a budget and I can narrow these down further.',
}

// The «عرض الكل» link hands the same criteria to the full listings page. That page's
// URL params are its own (type name, beds-minimum, price bounds, amenity names).
function listingsLink(f, propertyTypes) {
  if (!f.purpose) return null
  const params = new URLSearchParams()
  const typeName = f.type ? matchTypeNames(f.type, propertyTypes)[0] : null
  if (typeName) params.set('type', typeName)
  if (f.beds != null) params.set('beds', String(f.beds))
  if (f.baths != null) params.set('baths', String(f.baths))
  if (f.minPrice != null) params.set('minPrice', String(f.minPrice))
  if (f.maxPrice != null) params.set('maxPrice', String(f.maxPrice))
  if (f.minArea != null) params.set('minSize', String(f.minArea))
  if (f.maxArea != null) params.set('maxSize', String(f.maxArea))
  const qs = params.toString()
  return `/${f.purpose === 'rent' ? 'rent' : 'buy'}${qs ? `?${qs}` : ''}`
}

let seq = 0
const mid = () => `m${Date.now().toString(36)}-${seq++}`

export function useAssistant() {
  const { properties, propertyTypes, features } = useData()
  const { lang: uiLang } = useI18n()

  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const filtersRef = useRef({})
  const askedPurposeRef = useRef(false)

  const typeIdByName = useMemo(
    () => Object.fromEntries((propertyTypes || []).map((t) => [t.name, t.id])), [propertyTypes])

  const push = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: mid(), ...msg }])
  }, [])

  const respondSearch = useCallback(async (lang, prefix = '') => {
    const f = filtersRef.current
    setBusy(true)
    try {
      const { items, total, relaxed, notes } = await runSearch(f, { properties, propertyTypes, typeIdByName, features })
      recordSearch(f, total, lang)
      const crit = summarize(f, lang)
      const extras = notesPhrase(notes, lang)

      if (total > 0) {
        const parts = [prefix, `${countPhrase(total, lang)} — ${crit}:`].filter(Boolean)
        const hintWorthy = total > 5 && f.beds == null && f.maxPrice == null && f.minPrice == null
        push({
          role: 'assistant',
          text: parts.join(' '),
          items: items.slice(0, 6),
          more: Math.max(0, total - 6),
          link: listingsLink(f, propertyTypes),
          footnotes: [...extras, ...(hintWorthy ? [NARROW_HINT[lang]] : [])],
        })
      } else {
        const lines = [prefix, pick('none', lang, { crit }), pick('noneAdvice', lang)].filter(Boolean)
        push({
          role: 'assistant',
          text: lines.join(' '),
          items: relaxed ? relaxed.items : [],
          relaxedNote: relaxed ? relaxedIntro(relaxed.kind, relaxed.items.length, lang) : null,
          footnotes: extras,
        })
      }
    } catch {
      push({ role: 'assistant', text: ERR_TEXT[lang] })
    } finally {
      setBusy(false)
    }
  }, [properties, propertyTypes, typeIdByName, features, push])

  const send = useCallback(async (raw) => {
    const text = String(raw || '').trim()
    if (!text || busy) return
    push({ role: 'user', text })

    const parsed = parseMessage(text, { hasContext: hasAny(filtersRef.current) })
    const lang = parsed.lang
    const greetPrefix = parsed.greeting ? GREET_SHORT[parsed.greeting][lang] : ''

    switch (parsed.intent) {
      case 'reset':
        filtersRef.current = {}
        askedPurposeRef.current = false
        push({ role: 'assistant', text: pick('reset', lang) })
        return

      case 'greeting':
        push({ role: 'assistant', text: pick(parsed.howAreYou ? 'greet.howAreYou' : `greet.${parsed.greeting || 'hi'}`, lang) })
        return

      case 'thanks': push({ role: 'assistant', text: pick('thanks', lang) }); return
      case 'bye': push({ role: 'assistant', text: pick('bye', lang) }); return
      case 'whoami': push({ role: 'assistant', text: pick('whoami', lang) }); return
      case 'help': push({ role: 'assistant', text: pick('help', lang) }); return

      case 'sort':
        filtersRef.current = { ...filtersRef.current, sort: parsed.sort }
        await respondSearch(lang)
        return

      case 'remove': {
        // applyRemovals FIRST, then the slots: «بدون مسبح» clears the pool requirement and
        // sets the exclusion in the same breath, and the order is what keeps the exclusion.
        let rf = applyRemovals(filtersRef.current, parsed.removals)
        rf = mergeSlots(rf, parsed.slots)
        filtersRef.current = rf
        if (parsed.sort) filtersRef.current.sort = parsed.sort
        const ack = parsed.removals
          .map((r) => removalPhrase(r, lang, parsed.slots.excludeAmenities))
          .join(' ')
        if (hasAny(filtersRef.current)) await respondSearch(lang, ack)
        else {
          askedPurposeRef.current = false
          push({ role: 'assistant', text: `${ack} ${pick('reset', lang)}` })
        }
        return
      }

      case 'search': {
        if (parsed.reset) { filtersRef.current = {}; askedPurposeRef.current = false }
        let f = applyRemovals(filtersRef.current, parsed.removals)
        f = mergeSlots(f, parsed.slots)
        if (parsed.sort) f.sort = parsed.sort
        filtersRef.current = f

        // Smart clarification: buy-vs-rent is the one essential — ask it once, never re-ask
        // what the user already said, never block a second time.
        if (!f.purpose && !askedPurposeRef.current) {
          askedPurposeRef.current = true
          const key = f.type ? 'askPurpose' : 'askPurposeType'
          push({ role: 'assistant', text: [greetPrefix, pick(key, lang)].filter(Boolean).join(' ') })
          return
        }
        await respondSearch(lang, greetPrefix)
        return
      }

      default:
        push({ role: 'assistant', text: [greetPrefix, pick('chat', lang)].filter(Boolean).join(' ') })
    }
  }, [busy, push, respondSearch])

  const reset = useCallback(() => {
    filtersRef.current = {}
    askedPurposeRef.current = false
    setMessages([])
  }, [])

  return {
    messages,
    busy,
    send,
    reset,
    suggestions: SUGGESTIONS[uiLang] || SUGGESTIONS.en,
    filters: filtersRef.current,
  }
}
