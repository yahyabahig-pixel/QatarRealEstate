import { describe, expect, it } from 'vitest'
import { parseMessage } from '../parse'
import { normalize } from '../normalize'
import { extractNumericSlots, readAmount } from '../numbers'

// The assistant's understanding layer had no tests at all, which is how every bug below
// reached a live site: each one makes the assistant answer confidently with the wrong
// listings, and none of them throws, logs, or looks broken from the outside.
//
// `slots` of a parsed message, with only the keys a test cares about.
const parse = (text) => parseMessage(text, { hasContext: false })
const money = (text) => {
  const s = parse(text).slots
  const out = {}
  for (const k of ['minPrice', 'maxPrice', 'beds', 'baths', 'minArea', 'maxArea']) {
    if (s[k] != null) out[k] = s[k]
  }
  return out
}

describe('a bare figure is a budget', () => {
  // "شقة للإيجار في لوسيل 8000" is how a rent is actually typed. Every price rule needed
  // a comparator, a currency or a multiplier, so the number was dropped and the assistant
  // answered with units at any price while the criteria line mentioned no budget at all.
  it('reads a plain four-digit number as the ceiling', () => {
    expect(money('شقة للإيجار في لوسيل 8000')).toEqual({ maxPrice: 8000 })
    expect(money('villa for rent in lusail 25000')).toEqual({ maxPrice: 25000 })
  })

  it('does not mistake a room count, a bathroom count or an area for a price', () => {
    expect(money('شقة ١٢٠ متر ٣ غرف')).toEqual({ beds: 3, minArea: 102, maxArea: 138 })
    expect(money('فيلا 3 غرف 2 حمام')).toEqual({ beds: 3, baths: 2 })
    expect(money('غرفتين وحمامين')).toEqual({ beds: 2, baths: 2 })
  })

  it('never overrides a budget that was stated properly', () => {
    expect(money('شقة أقل من 2 مليون في برج 5000')).toEqual({ maxPrice: 2000000 })
  })
})

describe('Arabic tens and hundreds', () => {
  // Without these in the word list, readAmount fell through to a multiplier with an
  // implicit base of 1: a hundred thousand and twenty thousand both became 1,000, which
  // matches nothing, so an ordinary budget returned "لا توجد نتائج".
  it('reads مية / عشرين / خمسين as the number, not as 1', () => {
    expect(money('شقة مية ألف')).toEqual({ maxPrice: 100000 })
    expect(money('شقة عشرين ألف')).toEqual({ maxPrice: 20000 })
    expect(money('فيلا خمسين ألف')).toEqual({ maxPrice: 50000 })
    expect(money('فيلا ميتين ألف')).toEqual({ maxPrice: 200000 })
  })

  it('reads them with the بـ clitic glued on, which is how budgets are written', () => {
    expect(money('شقة بمية ألف')).toEqual({ maxPrice: 100000 })
    expect(money('شقة بعشرين ألف')).toEqual({ maxPrice: 20000 })
  })

  it('still refuses to find numbers inside ordinary words', () => {
    // ست inside استوديو, الف inside الفيلا — the guards that stop these must survive the
    // clitic exception above.
    expect(money('استوديو للإيجار')).toEqual({})
    expect(money('عايز الفيلا دي')).toEqual({})
  })
})

describe('a fraction before the multiplier', () => {
  // Only the trailing form ("مليون ونص") was handled, so "نص مليون" matched the bare
  // multiplier and came back as a whole million — double what was asked.
  it('نص مليون is half a million, not a million', () => {
    expect(money('فيلا بنص مليون')).toEqual({ maxPrice: 500000 })
    expect(money('شقة بربع مليون')).toEqual({ maxPrice: 250000 })
    expect(money('villa half a million')).toEqual({ maxPrice: 500000 })
  })

  it('the trailing form still works', () => {
    expect(readAmount('مليون ونص')).toBe(1500000)
    expect(money('من مليون إلى مليون ونص')).toEqual({ minPrice: 1000000, maxPrice: 1500000 })
  })
})

describe('the Qatari riyal written ر.ق', () => {
  // The currency list had "ر ق" all along; the period was what stopped it matching, and
  // ر.ق is the common written form. The budget vanished silently.
  it('normalizes the period out so the currency matches', () => {
    expect(normalize('٨٠٠٠ ر.ق')).toBe('8000 ر ق')
    expect(money('شقة للإيجار ٨٠٠٠ ر.ق')).toEqual({ maxPrice: 8000 })
  })

  it('leaves a decimal point inside a number alone', () => {
    expect(normalize('1.5 مليون')).toBe('1.5 مليون')
    expect(money('شقة 1.5 مليون')).toEqual({ maxPrice: 1500000 })
  })
})

describe('a range states its scale once', () => {
  // "من 1 إلى 2 مليون" read the ends independently: minPrice 1, maxPrice 2,000,000 — and
  // the criteria line told the user it was searching "من 1 ر.ق".
  it('carries the multiplier from the second bound to the first', () => {
    expect(money('شقة من 1 إلى 2 مليون')).toEqual({ minPrice: 1000000, maxPrice: 2000000 })
  })

  it('leaves a range that states both scales alone', () => {
    expect(money('شقة من 500 ألف إلى 2 مليون')).toEqual({ minPrice: 500000, maxPrice: 2000000 })
  })
})

describe('negation must not become a requirement', () => {
  // The worst class of all: the assistant looked like it understood and then returned the
  // exact opposite. Two causes — English needs an article after "without", which broke the
  // match, and مش / غير / بلا were not removal words at all. The negated thing then fell
  // through to the amenity sweep and became a filter.
  const amenities = (t) => parse(t).slots.amenities ?? []
  const removed = (t) => parse(t).removals.map((r) => r.key)

  it.each([
    'apartment without a pool',
    'no pool please',
    'فيلا بلا مسبح',
    'فيلا من غير مسبح',
  ])('%s does not require a pool', (text) => {
    expect(amenities(text)).not.toContain('pool')
    expect(removed(text)).toContain('pool')
  })

  it.each([
    'شقة مش مفروشة',
    'شقة غير مفروشة',
  ])('%s does not require furnishing', (text) => {
    expect(amenities(text)).not.toContain('furnished')
    expect(removed(text)).toContain('furnished')
  })

  it('still requires what is asked for positively', () => {
    expect(amenities('فيلا بمسبح')).toContain('pool')
    expect(amenities('apartment with a pool')).toContain('pool')
    expect(amenities('شقة مفروشة')).toContain('furnished')
  })

  it('a negative word with nothing after it changes nothing', () => {
    expect(parse('مش عارف اختار').removals).toEqual([])
    expect(parse('غير كده عندك ايه').removals).toEqual([])
  })
})

describe('the k/m multiplier still needs a digit in front', () => {
  // Every English word ending in m or k used to read as a budget: "I am looking for a
  // villa" set a 1,000,000 ceiling from the "m" of "am".
  it.each([
    'I am looking for a villa for sale',
    'apartment with a gym for sale',
    'villas near a park',
    'show me something in west bay',
  ])('%s has no price', (text) => {
    expect(money(text)).toEqual({})
  })

  it('reads a real one', () => {
    expect(money('800k')).toEqual({ maxPrice: 800000 })
    expect(money('2m villa')).toEqual({ maxPrice: 2000000 })
  })
})

describe('extractNumericSlots consumes what it matches', () => {
  // The ordering guarantee the whole module rests on: a number spent on bedrooms can
  // never be read again as a budget.
  it('leaves nothing numeric behind for a later rule to misread', () => {
    const { slots, rest } = extractNumericSlots(normalize('فيلا 4 غرف 3 حمام 500 متر'))
    expect(slots.beds).toBe(4)
    expect(slots.baths).toBe(3)
    expect(slots.minArea).toBe(425)
    expect(slots.maxArea).toBe(575)
    expect(slots.maxPrice).toBeUndefined()
    expect(rest).not.toMatch(/\d/)
  })
})
