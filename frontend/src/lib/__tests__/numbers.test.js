import { describe, expect, it } from 'vitest'
import { extractNumericSlots, readAmount } from '../../assistant/nlu/numbers'

// ---------------------------------------------------------------------------------------
// The search assistant reads a budget out of what the visitor typed. "k" and "m" sat in the
// multiplier list unguarded on the left, so EVERY English word ending in one was read as a
// number: "I am looking for a villa for sale" set a maximum price of 1,000,000 from the "m"
// of "am". The visitor got zero results and no explanation.
//
// These three sentences are the ones that actually failed on the live site.
// ---------------------------------------------------------------------------------------
describe('ordinary English words are not budgets', () => {
  const cases = [
    'i am looking for a villa for sale',   // "am"   -> 1,000,000
    'show me villas near a park',          // "park" -> 1,000
    'apartment with a gym for sale',       // "gym"  -> 1,000,000
    'looking for a home with a pool',
    'flat near the corniche',
    'i need a room for my mum',
  ]
  it.each(cases)('%s', (text) => {
    const { slots } = extractNumericSlots(text)
    expect(slots.maxPrice).toBeUndefined()
    expect(slots.minPrice).toBeUndefined()
  })

  it('does not swallow the word it mistook for a number', () => {
    const { rest } = extractNumericSlots('apartment with a gym for sale')
    expect(rest).toContain('gym')
  })
})

describe('real amounts are still understood', () => {
  it.each([
    ['villa in the pearl, budget 2m', { maxPrice: 2_000_000 }],
    ['apartment under 800k', { maxPrice: 800_000 }],
    ['1.5 m budget', { maxPrice: 1_500_000 }],
    ['under 1,500,000', { maxPrice: 1_500_000 }],
    ['between 1m and 2m', { minPrice: 1_000_000, maxPrice: 2_000_000 }],
  ])('%s', (text, expected) => {
    const { slots } = extractNumericSlots(text)
    expect(slots).toMatchObject(expected)
  })
})

describe('Arabic amounts are untouched by the fix', () => {
  it.each([
    ['اقل من 2 مليون', { maxPrice: 2_000_000 }],
    ['شقه بمليون ونص', { maxPrice: 1_500_000 }],
    ['من مليون الي مليون ونص', { minPrice: 1_000_000, maxPrice: 1_500_000 }],
    ['شقه ب 8000 ريال', { maxPrice: 8_000 }],
    ['فوق 150 متر', { minArea: 150 }],
  ])('%s', (text, expected) => {
    const { slots } = extractNumericSlots(text)
    expect(slots).toMatchObject(expected)
  })

  it('reads bedrooms without turning them into money', () => {
    const { slots } = extractNumericSlots('3 غرف نوم')
    expect(slots.beds).toBe(3)
    expect(slots.maxPrice).toBeUndefined()
  })
})

describe('readAmount', () => {
  it.each([
    ['2m', 2_000_000],
    ['800k', 800_000],
    ['مليون', 1_000_000],
    ['مليونين', 2_000_000],
    ['8000', 8_000],
    ['1,500,000', 1_500_000],
  ])('%s -> %i', (text, expected) => {
    expect(readAmount(text)).toBe(expected)
  })

  it('does not read a bare letter as a multiplier', () => {
    expect(Number.isNaN(readAmount('m'))).toBe(true)
    expect(Number.isNaN(readAmount('k'))).toBe(true)
  })
})
