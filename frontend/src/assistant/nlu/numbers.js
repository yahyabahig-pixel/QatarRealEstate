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
  // TENS AND HUNDREDS. Without these, "شقة بمية ألف" and "شقة عشرين ألف" fell through to
  // the multiplier-only branch of readAmount, where the base defaults to 1 — so a hundred
  // thousand and twenty thousand both came out as a flat 1,000 and the user's own number
  // was thrown away with the rest of the text. A 1,000 QAR ceiling matches nothing, so an
  // ordinary budget produced "لا توجد نتائج". These are the normalized spellings (ة→ه,
  // ئ→ي), because that is what the matcher sees.
  'عشرين': 20, 'ثلاثين': 30, 'تلاتين': 30, 'اربعين': 40, 'خمسين': 50,
  'ستين': 60, 'سبعين': 70, 'ثمانين': 80, 'تمانين': 80, 'تسعين': 90,
  'ميه': 100, 'مايه': 100, 'ميتين': 200, 'مايتين': 200,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
}
// longest first so "ثلاثه" wins over "ثلاث"
const WORDS_ALT = Object.keys(WORD_NUMS).sort((a, b) => b.length - a.length).join('|')

// Word-numbers are guarded on both sides so "ست" can never fire inside "استوديو".
//
// The one exception on the left is a leading بـ or لـ, which in Arabic is glued to the
// word rather than spaced off it: a budget is written "بمية ألف", not "ب مية ألف". The
// plain guard rejected that, so "شقة بمية ألف" lost its hundred and came back as a 1,000
// ceiling — while the identical "شقة مية ألف" worked. Only ب and ل are let through, and
// only at a word boundary, so "استوديو" stays safe (the ست there follows ا, not ب).
const GUARD_B = '(?:(?<![؀-ۿa-z])|(?<=(?:^|\\s)[بل]))'
const GUARD_A = '(?![؀-ۿa-z])'
const NUM = `(?:\\d+(?:[.,]\\d+)*|${GUARD_B}(?:${WORDS_ALT})${GUARD_A})`
// مليونين/الفين are dual forms — a count of 2 baked into the word itself.
// The trailing guard keeps "الف" from firing inside "الفيلا".
const MULT_WORDS = 'مليونين|ملايين|مليون|مليارات|مليار|الفين|الاف|الف|billions?|millions?|thousands?'
// "k" and "m" are the ONLY multipliers that are a single letter, and they used to sit in
// this alternation unguarded on the left. Every English word ending in one therefore read
// as a budget: "I am looking for a villa for sale" set a maximum price of 1,000,000 (from
// the "m" of "am"), "show me villas near a park" set 1,000, and "apartment with a gym for
// sale" set 1,000,000 while swallowing the word "gym". The visitor got zero results and no
// clue why. A digit has to be in front — that is what "2m" and "800k" actually look like.
// (One or two spaces are tolerated so "1.5 m" still reads; JS allows variable-length
// lookbehind, and GUARD_B above already relies on it.)
const MULT_SUFFIX = '(?<=\\d\\s{0,2})[km]'
const MULT = `(?:${MULT_WORDS}|${MULT_SUFFIX})${GUARD_A}`
const FRAC = '(?:و\\s?(?:نصف|نص|ربع)|and a half)'
// A fraction stated BEFORE the multiplier: "نص مليون", "ربع مليون", "half a million".
// FRAC above only reads the trailing form ("مليون ونص"), so "نص مليون" used to match the
// bare multiplier and come back as a whole million — double what the user asked for, and
// the kind of error that quietly prices them out of every result they wanted.
const FRAC_PRE = '(?:نصف|نص|ربع|half(?: an?)?|quarter(?: of an?)?)'
const FRAC_VALUES = [[/ربع|quarter/, 0.25], [/نصف|نص|half/, 0.5]]
const fracValue = (s) => (FRAC_VALUES.find(([re_]) => re_.test(s)) || [null, 1])[1]

// A money-ish amount: "2 مليون", "مليون ونص", "نص مليون", "800 الف", "1.5m", "8000".
const AMOUNT = `((?:${FRAC_PRE}\\s*)?(?:${NUM}\\s*)?${MULT}(?:\\s*${FRAC})?|${NUM})`

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
  // Same multiplier vocabulary as MULT above — one list, so the extractor and the reader
  // can never drift apart about what counts as "k".
  const m = s.match(new RegExp(
    `^(?:(${FRAC_PRE})\\s*)?(?:(${NUM})\\s*)?(${MULT_WORDS}|${MULT_SUFFIX})(?:\\s*(${FRAC}))?$`))
  if (m) {
    const [, pre, num, multWord, post] = m
    const dual = DUAL_MULTS[multWord] || null
    // "نص مليون" has no number of its own: the fraction IS the base.
    const base = dual ?? (num != null ? wordOrNumber(num) : (pre ? fracValue(pre) : 1))
    const mult = MULT_VALUES[multWord] ?? 1
    let v = base * mult
    if (post) v += (/ربع|quarter/.test(post) ? 0.25 : 0.5) * mult
    return v
  }
  return wordOrNumber(s)
}

// The multiplier word inside an already-matched AMOUNT, or undefined. Used to carry the
// scale of one end of a range onto the other.
function multiplierOf(str) {
  const m = String(str ?? '').match(new RegExp(`(${MULT_WORDS}|${MULT_SUFFIX})`))
  return m ? m[1] : undefined
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
    let lo = readAmount(a)
    const hi = readAmount(b)
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false
    // "من 1 إلى 2 مليون" states the scale once, at the end, and means it for both ends.
    // Reading them independently gave minPrice 1 and maxPrice 2,000,000, and the criteria
    // line then told the user it was searching "من 1 ر.ق إلى 2,000,000 ر.ق".
    const scale = multiplierOf(b)
    if (scale && !multiplierOf(a)) lo *= (MULT_VALUES[scale] ?? 1)
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
  consume(state, `((?:${FRAC_PRE}\\s*)?(?:${NUM}\\s*)?${MULT}(?:\\s*${FRAC})?)`, (a) => {
    const v = readAmount(a)
    if (!Number.isFinite(v) || v < 1000) return false
    slots.maxPrice = v
  })

  // A BARE FIGURE, no comparator and no currency: "شقة للإيجار في لوسيل 8000".
  //
  // This is how most people type a rent, and until now it matched none of the rules above
  // — the budget rule needs a budget word, the range rule needs من/بين, max/min need a
  // comparator, the currency rule needs ريال, and the multiplier rule needs ألف or m. So
  // the number was dropped and the assistant answered "وجدت لك 11 عقارًا مطابقًا" with
  // units at any price, while the criteria line said nothing about a budget at all.
  //
  // Last on purpose. Area, bedrooms and bathrooms have already been consumed above, so a
  // figure still standing here is not a room count or a square metre. Four digits or more
  // (>= 1000) keeps it away from "3 غرف" leftovers and from a floor or building number.
  // Only when no price was found any other way — an explicit budget always wins.
  consume(state, '(?<![\\d.,])(\\d{4,})(?![\\d.,])', (n) => {
    if (slots.maxPrice != null || slots.minPrice != null) return false
    const v = wordOrNumber(n)
    if (!Number.isFinite(v)) return false
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
