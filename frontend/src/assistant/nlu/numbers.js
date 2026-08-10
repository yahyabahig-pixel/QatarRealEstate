// ---------------------------------------------------------------------------------------
// Numeric understanding: bedrooms, bathrooms, areas (sqm) and prices — Arabic (فصحى +
// مصري + خليجي) and English. Works on normalize()d text only.
//
//   "٣ غرف" / "ثلاث غرف" / "3 غرف"      → beds: 3
//   "غرفتين"                              → beds: 2
//   "أقل من 2 مليون"                      → maxPrice: 2,000,000
//   "من مليون إلى مليون ونص"              → minPrice: 1e6, maxPrice: 1.5e6
//   "أقل من 8000 ريال"                    → maxPrice: 8,000
//   "فوق 150 متر"                         → minArea: 150
//   "زود الميزانية إلى 3 مليون"           → maxPrice: 3,000,000
//
// The extractor CONSUMES what it matches (replaces the span with spaces), so a number
// used as a bedroom count can never be re-read as a price. Order matters and is fixed:
// area (unit-tagged) → beds → baths → price (whatever money talk remains).
// ---------------------------------------------------------------------------------------

const WORD_NUMS = {
  'واحد': 1, 'واحده': 1, 'وحده': 1,
  'اثنين': 2, 'اتنين': 2, 'اثنان': 2,
  'ثلاث': 3, 'ثلاثه': 3, 'تلات': 3, 'تلاته': 3,
  'اربع': 4, 'اربعه': 4,
  'خمس': 5, 'خمسه': 5,
  'ست': 6, 'سته': 6,
  'سبع': 7, 'سبعه': 7,
  'ثمان': 8, 'ثمانيه': 8, 'تمن': 8, 'تمانيه': 8, 'تمانه': 8,
  'تسع': 9, 'تسعه': 9,
  'عشر': 10, 'عشره': 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10,
}
// longest first so "ثلاثه" wins over "ثلاث"
const WORDS_ALT = Object.keys(WORD_NUMS).sort((a, b) => b.length - a.length).join('|')

// Word-numbers are guarded on both sides so "ست" can never fire inside "استوديو".
const GUARD_B = '(?<![؀-ۿa-z])'
const GUARD_A = '(?![؀-ۿa-z])'
const NUM = `(?:\\d+(?:[.,]\\d+)*|${GUARD_B}(?:${WORDS_ALT})${GUARD_A})`
// مليونين/الفين are dual forms — a count of 2 baked into the word itself.
// The trailing guard keeps "الف" from firing inside "الفيلا".
const MULT = `(?:مليونين|ملايين|مليون|مليارات|مليار|الفين|الاف|الف|billions?|millions?|thousands?|k|m)${GUARD_A}`
const FRAC = '(?:و\\s?(?:نصف|نص|ربع)|and a half)'

// A money-ish amount: "2 مليون", "مليون ونص", "800 الف", "1.5m", "8000", "خمسه الاف".
const AMOUNT = `((?:${NUM}\\s*)?${MULT}(?:\\s*${FRAC})?|${NUM})`

const MULT_VALUES = {
  'مليون': 1e6, 'ملايين': 1e6, 'مليونين': 1e6, 'مليار': 1e9, 'مليارات': 1e9,
  'الف': 1e3, 'الاف': 1e3, 'الفين': 1e3,
  billion: 1e9, billions: 1e9, million: 1e6, millions: 1e6,
  thousand: 1e3, thousands: 1e3, k: 1e3, m: 1e6,
}
const DUAL_MULTS = { 'مليونين': 2, 'الفين': 2 }

function wordOrNumber(s) {
  if (s == null) return NaN
  const w = s.trim()
  if (w in WORD_NUMS) return WORD_NUMS[w]
  // "1,500,000" and "1.5" both arrive here; commas are thousands separators.
  return parseFloat(w.replace(/,/g, ''))
}

// Parse one matched AMOUNT string → number (or NaN).
export function readAmount(str) {
  if (!str) return NaN
  const s = str.trim()
  const m = s.match(new RegExp(`^(?:(${NUM})\\s*)?(مليونين|ملايين|مليون|مليارات|مليار|الفين|الاف|الف|billions?|millions?|thousands?|k|m)(?:\\s*(${FRAC}))?$`))
  if (m) {
    const dual = DUAL_MULTS[m[2]] || null
    const base = dual ?? (m[1] != null ? wordOrNumber(m[1]) : 1)
    const mult = MULT_VALUES[m[2]] ?? 1
    let v = base * mult
    if (m[3]) v += (/ربع/.test(m[3]) ? 0.25 : 0.5) * mult
    return v
  }
  return wordOrNumber(s)
}

// -------------------------------------------------------------------------------------
// Comparator vocabularies (already-normalized spellings).
// -------------------------------------------------------------------------------------
const MAX_WORDS = '(?:اقل من|تحت|بحد اقصي|حد اقصي|اقصي حاجه|اقصي شي|اقصي شيء|واقصي حاجه|اقصي|(?:مش|ما|لا)\\s*(?:عايز|عاوز|ابي|ابغي|اريد)?\\s*(?:اكتر|اكثر|ازيد)\\s*من|ما يزيد عن|لا يزيد عن|لغايه|لحد|في حدود|up to|under|below|max(?:imum)?|at most|no more than|less than|within)'
const MIN_WORDS = '(?:اكثر من|اكتر من|فوق|اعلي من|اكبر من|علي الاقل|عالاقل|مش اقل من|لا يقل عن|ما يقل عن|يبدا من|ابتداء من|above|over|more than|at least|min(?:imum)?|starting from|bigger than|larger than)'
const RANGE_OPEN = '(?:من|بين|from|between)'
const RANGE_SEP = '(?:الي|حتي|لغايه|لحد|و|ل|to|and|[-–])'

const AREA_UNIT = '(?:متر مربع|متر²|م2|م²|متر|sq\\.? ?m|sqm|m2|m²|square ?met(?:er|re)s?)'
const CURRENCY = '(?:ريالات|ريال قطري|ريال|ر ق|qar|qr|riyals?|rials?)'
const BED_UNIT = '(?:غرفه نوم|غرف نوم|اوض نوم|اوضه|غرفه|غرف|اوض|bed ?rooms?|bedrooms?|beds?|rooms?|br)'
const BATH_UNIT = '(?:حمامات|حمام|دورات مياه|دوره مياه|bath ?rooms?|bathrooms?|baths?|toilets?|wc)'

const re = (src) => new RegExp(src, 'g')
// Consume a regex's matches out of the working text; hand each match to `take`.
function consume(state, pattern, take) {
  state.text = state.text.replace(re(pattern), (...args) => {
    const groups = args.slice(1, -2)
    return take(...groups) === false ? args[0] : ' '
  })
}

// -------------------------------------------------------------------------------------
// Main extractor. Input: normalized text. Output: { slots, rest }.
//   slots: beds, bedsExact, baths, minArea, maxArea, minPrice, maxPrice (only when found)
//   rest:  the text with every consumed numeric phrase blanked out.
// -------------------------------------------------------------------------------------
export function extractNumericSlots(normalizedText) {
  const state = { text: ` ${normalizedText} ` }
  const slots = {}

  // ---- 1. AREA (sqm) — always unit-tagged, so it goes first ----------------------------
  consume(state, `${RANGE_OPEN}\\s*${AMOUNT}\\s*${RANGE_SEP}\\s*${AMOUNT}\\s*${AREA_UNIT}`, (a, b) => {
    slots.minArea = readAmount(a); slots.maxArea = readAmount(b)
  })
  consume(state, `${MAX_WORDS}\\s*${AMOUNT}\\s*${AREA_UNIT}`, (a) => { slots.maxArea = readAmount(a) })
  consume(state, `${MIN_WORDS}\\s*${AMOUNT}\\s*${AREA_UNIT}`, (a) => { slots.minArea = readAmount(a) })
  consume(state, `(?:مساحه|مساحتها|المساحه|size|area)\\s*(?:حوالي|تقريبا|about|around)?\\s*${AMOUNT}\\s*(?:${AREA_UNIT})?`, (a) => {
    const v = readAmount(a)
    if (!Number.isFinite(v)) return false
    slots.minArea = Math.round(v * 0.85); slots.maxArea = Math.round(v * 1.15)
  })
  // "شقة 150 متر" — approximate wish → a friendly ±15% window.
  consume(state, `${AMOUNT}\\s*${AREA_UNIT}`, (a) => {
    const v = readAmount(a)
    if (!Number.isFinite(v)) return false
    slots.minArea = Math.round(v * 0.85); slots.maxArea = Math.round(v * 1.15)
  })

  // ---- 2. BEDROOMS ---------------------------------------------------------------------
  consume(state, '(?:غرفتين|اوضتين)', () => { slots.beds = 2; slots.bedsExact = slots.bedsExact ?? true })
  consume(state, `${MIN_WORDS}\\s*(${NUM})\\s*${BED_UNIT}`, (n) => {
    slots.beds = wordOrNumber(n); slots.bedsExact = false
  })
  consume(state, `(${NUM})\\s*${BED_UNIT}\\s*(?:او اكثر|فاكثر|واكثر|\\+|or more|and up)`, (n) => {
    slots.beds = wordOrNumber(n); slots.bedsExact = false
  })
  consume(state, `(${NUM})\\s*${BED_UNIT}`, (n) => {
    slots.beds = wordOrNumber(n); slots.bedsExact = slots.bedsExact ?? true
  })
  consume(state, `${BED_UNIT}\\s*(?:واحده|واحد|one|single)`, () => {
    slots.beds = 1; slots.bedsExact = true
  })

  // ---- 3. BATHROOMS ----------------------------------------------------------------------
  consume(state, '(?:حمامين)', () => { slots.baths = 2 })
  consume(state, `(${NUM})\\s*${BATH_UNIT}`, (n) => { slots.baths = wordOrNumber(n) })
  consume(state, `${BATH_UNIT}\\s*(?:واحده|واحد|one)`, () => { slots.baths = 1 })

  // ---- 4. PRICE — everything money-flavoured that's left --------------------------------
  // explicit budget mention: "ميزانيتي 2 مليون" / "زود الميزانية إلى 3 مليون" / "budget 800k"
  consume(state, `(?:ميزانيتي|الميزانيه|ميزانيه|بميزانيه|budget(?: is)?|my budget)\\s*(?:هي|تقريبا|حوالي|الي|لحد|ل|تبقي|تكون|تصير|around|about|to|=)?\\s*${AMOUNT}\\s*(?:${CURRENCY})?`, (a) => {
    slots.maxPrice = readAmount(a)
  })
  consume(state, `${RANGE_OPEN}\\s*${AMOUNT}\\s*${RANGE_SEP}\\s*${AMOUNT}\\s*(?:${CURRENCY})?`, (a, b) => {
    const lo = readAmount(a), hi = readAmount(b)
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false
    slots.minPrice = Math.min(lo, hi); slots.maxPrice = Math.max(lo, hi)
  })
  consume(state, `${MAX_WORDS}\\s*${AMOUNT}\\s*(?:${CURRENCY})?`, (a) => {
    const v = readAmount(a)
    if (!Number.isFinite(v)) return false
    slots.maxPrice = v
  })
  consume(state, `${MIN_WORDS}\\s*${AMOUNT}\\s*(?:${CURRENCY})?`, (a) => {
    const v = readAmount(a)
    if (!Number.isFinite(v)) return false
    slots.minPrice = v
  })
  // currency-tagged bare amount → treated as a budget ceiling: "شقه ب 8000 ريال"
  consume(state, `${AMOUNT}\\s*${CURRENCY}`, (a) => {
    const v = readAmount(a)
    if (!Number.isFinite(v)) return false
    slots.maxPrice = v
  })
  // bare multiplier amount (مليون / مليونين / 2m / 800k…) → budget ceiling
  consume(state, `((?:${NUM}\\s*)?${MULT}(?:\\s*${FRAC})?)`, (a) => {
    const v = readAmount(a)
    if (!Number.isFinite(v) || v < 1000) return false
    slots.maxPrice = v
  })

  // Round the money fields (word math can leave 1499999.999…).
  for (const k of ['minPrice', 'maxPrice', 'minArea', 'maxArea'])
    if (slots[k] != null) slots[k] = Number.isFinite(slots[k]) ? Math.round(slots[k]) : undefined
  for (const k of ['beds', 'baths'])
    if (slots[k] != null && !Number.isFinite(slots[k])) delete slots[k]
  for (const k of Object.keys(slots)) if (slots[k] === undefined) delete slots[k]

  return { slots, rest: state.text.replace(/\s+/g, ' ').trim() }
}
