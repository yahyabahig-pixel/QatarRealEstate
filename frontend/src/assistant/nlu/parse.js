// ---------------------------------------------------------------------------------------
// The intent parser: one user message → { intent, slots, removals, sort, greeting, lang }.
//
// Deterministic and free — no external API. It matches the normalized message against the
// lexicon (token-safe, definite-article and و/ب prefix tolerant), pulls numbers through
// extractNumericSlots, and understands three kinds of edits on top of fresh criteria:
//
//   set      "خليها 3 غرف"                 → slots.beds = 3
//   replace  "خليها في لوسيل بدل اللؤلؤة"  → slots.location = lusail (+ removal of the old)
//   remove   "شيل شرط المسبح"              → removals: [{kind:'amenity', key:'pool'}]
//
// The hook that owns conversation state decides how these merge into the running filters.
// ---------------------------------------------------------------------------------------
import { normalize, isArabicText } from './normalize.js'
import { extractNumericSlots } from './numbers.js'
import {
  TYPES, LOCATIONS, AMENITIES, PURPOSES, SORTS, FEATURED_WORDS,
  GREETINGS, THANKS, BYE, WHOAMI, HELP, RESET, REMOVE_VERBS, AVAILABILITY,
} from './lexicon.js'

// Arabic attaches particles to the word: مسبح → المسبح/ومسبح/بمسبح/وبالمسبح…
// Every alias is therefore tried with these prefixes, longest variant first.
const PREFIXES = ['', 'ال', 'و', 'وال', 'ب', 'بال', 'وب', 'وبال', 'لل', 'ول', 'فال']

// EVERY alias passes through normalize() once at module load — the lexicon is written
// close to normalized form, but hamza carriers (ؤ/ئ), stray tashkeel or a future edit
// must never silently break matching (e.g. اللؤلؤة → اللولوه).
const flatten = (table) => {
  // [{ key, alias }] sorted longest-alias-first, so "اهلا وسهلا" beats "اهلا".
  const out = []
  for (const [key, def] of Object.entries(table)) {
    const aliases = Array.isArray(def) ? def : def.aliases
    for (const alias of aliases) out.push({ key, alias: normalize(alias) })
  }
  return out.sort((a, b) => b.alias.length - a.alias.length)
}
const normList = (arr) => [...new Set(arr.map(normalize))].sort((a, b) => b.length - a.length)

const TYPE_LIST = flatten(TYPES)
const LOC_LIST = flatten(LOCATIONS)
const AMEN_LIST = flatten(AMENITIES)
const PURPOSE_LIST = flatten(PURPOSES)
const SORT_LIST = flatten(SORTS)
const GREETINGS_N = Object.fromEntries(Object.entries(GREETINGS).map(([k, v]) => [k, normList(v)]))
const THANKS_N = normList(THANKS)
const BYE_N = normList(BYE)
const WHOAMI_N = normList(WHOAMI)
const HELP_N = normList(HELP)
const RESET_N = normList(RESET)
const FEATURED_N = normList(FEATURED_WORDS)
const AVAILABILITY_N = normList(AVAILABILITY)

// ---- token-safe matching on the padded working text --------------------------------------
const pad = (s) => ` ${s.replace(/\s+/g, ' ').trim()} `

function eatPhrase(state, phrase) {
  for (const p of PREFIXES) {
    const needle = ` ${p}${phrase} `
    const i = state.text.indexOf(needle)
    if (i !== -1) {
      state.text = `${state.text.slice(0, i)} ${state.text.slice(i + needle.length)}`
      return true
    }
  }
  return false
}

function eatList(state, list) {
  for (const alias of list) if (eatPhrase(state, alias)) return alias
  return null
}

function eatConcept(state, flat) {
  for (const { key, alias } of flat) if (eatPhrase(state, alias)) return key
  return null
}

function eatConceptsAll(state, flat) {
  const found = []
  let hit = true
  while (hit) {
    hit = false
    for (const { key, alias } of flat) {
      if (found.includes(key)) continue
      if (eatPhrase(state, alias)) { found.push(key); hit = true; break }
    }
  }
  return found
}

// Filler that sits between a removal verb and the thing being removed, and carries no
// meaning of its own. English needs an article here and Arabic does not: people write
// "without a pool", never "without pool". Demanding that the concept start immediately
// after the verb meant the removal silently failed on every English negation — and the
// amenity sweep further down then read that same "pool" as a REQUIREMENT, so the
// assistant answered "without a pool" with the pools. Skipping these words first is the
// whole fix.
const REMOVE_FILLER = ['a', 'an', 'the', 'any', 'شرط', 'ال']

// Try to read one concept right AT the given position (used after بدل/شيل verbs).
function conceptAt(text, from, flat) {
  let tail = text.slice(from).replace(/^\s+/, '')
  for (;;) {
    const hit = REMOVE_FILLER.find((w) => tail === w || tail.startsWith(`${w} `))
    if (!hit) break
    tail = tail.slice(tail.length === hit.length ? hit.length : hit.length + 1).replace(/^\s+/, '')
  }
  // Everything between `from` and the concept — whitespace and filler alike — has to be
  // counted, because the caller uses this length to cut the whole phrase out of the text.
  const offset = text.length - tail.length - from
  for (const { key, alias } of flat) {
    for (const p of PREFIXES) {
      const v = `${p}${alias}`
      if (tail === v || tail.startsWith(`${v} `))
        return { key, length: offset + v.length }
    }
  }
  return null
}

// Plain-word targets for removals that aren't lexicon concepts.
const REMOVE_TARGETS = [
  { kind: 'price', words: ['الحد الاقصي', 'حد اقصي', 'الميزانيه', 'ميزانيه', 'السعر', 'سعر', 'الاسعار', 'budget', 'price limit', 'price', 'max price'] },
  { kind: 'beds', words: ['عدد الغرف', 'الغرف', 'غرف', 'شرط الغرف', 'bedrooms', 'rooms', 'beds'] },
  { kind: 'baths', words: ['الحمامات', 'حمامات', 'bathrooms', 'baths'] },
  { kind: 'size', words: ['المساحه', 'مساحه', 'size'] },
  { kind: 'location', words: ['المنطقه', 'منطقه', 'المكان', 'المدينه', 'location', 'the area'] },
  { kind: 'type', words: ['النوع', 'نوع العقار', 'property type', 'the type'] },
  { kind: 'featured', words: ['المميزه', 'مميزه', 'شرط المميز', 'featured', 'exclusive'] },
]

const GENERIC_PROPERTY = normList([
  'عقارات', 'عقار', 'بيوت', 'بيت', 'منزل', 'منازل', 'سكن', 'مسكن', 'حاجه', 'شي', 'شيء',
  'properties', 'property', 'real estate', 'homes', 'home', 'houses', 'house', 'a place', 'anything', 'something', 'options',
])

const REMOVE_VERBS_SORTED = normList(REMOVE_VERBS)
const REPLACE_VERBS = normList(['بدلا من', 'بدل من', 'بدل', 'بدال', 'عوض', 'instead of'])
const REMOVE_TARGETS_N = REMOVE_TARGETS.map((t) => ({ kind: t.kind, words: normList(t.words) }))

// ------------------------------------------------------------------------------------------
export function parseMessage(raw, { hasContext = false } = {}) {
  const lang = isArabicText(raw) ? 'ar' : 'en'
  const state = { text: pad(normalize(raw)) }

  const result = {
    lang,
    intent: 'chat',
    greeting: null,
    howAreYou: false,
    thanks: false,
    bye: false,
    whoami: false,
    help: false,
    reset: false,
    sort: null,
    slots: {},
    removals: [],
  }

  // ---- small talk & control phrases (consumed so they can't pollute slots) --------------
  if (eatList(state, RESET_N)) result.reset = true
  for (const kind of ['salam', 'morning', 'evening', 'hi']) {
    if (eatList(state, GREETINGS_N[kind])) { result.greeting = result.greeting || kind }
  }
  if (eatList(state, GREETINGS_N.howAreYou)) { result.howAreYou = true; result.greeting = result.greeting || 'hi' }
  if (eatList(state, THANKS_N)) result.thanks = true
  if (eatList(state, WHOAMI_N)) result.whoami = true
  if (eatList(state, HELP_N)) result.help = true
  if (eatList(state, BYE_N)) result.bye = true

  let forceSearch = false
  if (eatList(state, AVAILABILITY_N)) forceSearch = true

  // ---- numbers first: a "3" spent on غرف can't be re-spent on price ----------------------
  const { slots: numSlots, rest } = extractNumericSlots(state.text)
  state.text = pad(rest)
  Object.assign(result.slots, numSlots)

  // ---- "… بدل اللؤلؤة": the concept AFTER the verb is the OLD value ---------------------
  for (const verb of REPLACE_VERBS) {
    let idx = state.text.indexOf(` ${verb} `)
    while (idx !== -1) {
      const after = idx + verb.length + 2
      const hit = conceptAt(state.text, after, LOC_LIST) || conceptAt(state.text, after, TYPE_LIST)
      if (hit) {
        const kind = LOCATIONS[hit.key] ? 'location' : 'type'
        result.removals.push({ kind, key: hit.key })
        state.text = pad(state.text.slice(0, idx) + ' ' + state.text.slice(after + hit.length))
      } else break
      idx = state.text.indexOf(` ${verb} `)
    }
  }

  // ---- removals: «شيل / بدون / من غير …» --------------------------------------------------
  for (const verb of REMOVE_VERBS_SORTED) {
    let guard = 0
    let idx = state.text.indexOf(` ${verb} `)
    while (idx !== -1 && guard++ < 6) {
      const after = idx + verb.length + 2
      let consumed = 0
      let removal = null

      const amen = conceptAt(state.text, after, AMEN_LIST)
      if (amen) { removal = { kind: 'amenity', key: amen.key }; consumed = amen.length }
      if (!removal) {
        const loc = conceptAt(state.text, after, LOC_LIST)
        if (loc) { removal = { kind: 'location', key: loc.key }; consumed = loc.length }
      }
      if (!removal) {
        const typ = conceptAt(state.text, after, TYPE_LIST)
        if (typ) { removal = { kind: 'type', key: typ.key }; consumed = typ.length }
      }
      if (!removal) {
        outer:
        for (const t of REMOVE_TARGETS_N) {
          for (const w of [...t.words].sort((a, b) => b.length - a.length)) {
            for (const p of PREFIXES) {
              const v = `${p}${w}`
              const tail = state.text.slice(after).replace(/^\s+/, '')
              if (tail === v || tail.startsWith(`${v} `)) {
                removal = { kind: t.kind }
                consumed = (state.text.length - tail.length - after) + v.length
                break outer
              }
            }
          }
        }
      }

      if (removal) {
        result.removals.push(removal)
        state.text = pad(state.text.slice(0, idx) + ' ' + state.text.slice(after + consumed))
        idx = state.text.indexOf(` ${verb} `)
      } else {
        idx = state.text.indexOf(` ${verb} `, idx + 1)
      }
    }
  }

  // ---- remaining concepts ------------------------------------------------------------------
  const sortKey = eatConcept(state, SORT_LIST)
  if (sortKey) result.sort = sortKey

  if (eatList(state, FEATURED_N)) result.slots.featured = true

  const purpose = eatConcept(state, PURPOSE_LIST)
  if (purpose) result.slots.purpose = purpose // 'sale' | 'rent'

  const type = eatConcept(state, TYPE_LIST)
  if (type) result.slots.type = type

  const location = eatConcept(state, LOC_LIST)
  if (location) result.slots.location = location

  const amenities = eatConceptsAll(state, AMEN_LIST)
  if (amenities.length) result.slots.amenities = amenities

  const generic = !!eatList(state, GENERIC_PROPERTY)

  // ---- intent -------------------------------------------------------------------------------
  const s = result.slots
  const hasSlots = !!(s.purpose || s.type || s.location || s.beds != null || s.baths != null
    || s.minArea != null || s.maxArea != null || s.minPrice != null || s.maxPrice != null
    || (s.amenities && s.amenities.length) || s.featured)

  if (result.reset && !hasSlots) result.intent = 'reset'
  else if (result.removals.length && !hasSlots) result.intent = 'remove'
  else if (hasSlots || forceSearch || (generic && !result.whoami && !result.help)) result.intent = 'search'
  else if (result.sort) result.intent = hasContext ? 'sort' : 'chat'
  else if (result.whoami) result.intent = 'whoami'
  else if (result.help) result.intent = 'help'
  else if (result.thanks) result.intent = 'thanks'
  else if (result.bye) result.intent = 'bye'
  else if (result.greeting) result.intent = 'greeting'

  return result
}
