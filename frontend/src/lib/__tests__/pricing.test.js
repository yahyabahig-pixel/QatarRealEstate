import { describe, expect, it } from 'vitest'
import { compactPrice } from '../format'
import { qs } from '../../api/client'

// The map pin label rounded to NEAREST, so a listing at 6,950,000 advertised "7M" and one at
// 12,500 advertised "13K" — a price shown ABOVE what the seller is asking. For a price one
// direction is a pleasant surprise and the other is a bait-and-switch, so it rounds down.
describe('compactPrice never rounds a price up', () => {
  it.each([
    [7_450, '7.4K'],
    [12_500, '12.5K'],
    [8_000, '8K'],
    [999, '999'],
    [1_000, '1K'],
    [3_950_000, '3.9M'],
    [6_950_000, '6.9M'],
    [12_500_000, '12.5M'],
    [1_000_000, '1M'],
  ])('%i -> %s', (input, expected) => {
    expect(compactPrice(input)).toBe(expected)
  })

  it.each([0, -1, null, undefined, NaN, 'abc'])('shows POA for %o', (value) => {
    expect(compactPrice(value)).toBe('POA')
  })

  it('is never higher than the real figure', () => {
    const parse = (label) => {
      const n = parseFloat(label)
      if (label.endsWith('M')) return n * 1e6
      if (label.endsWith('K')) return n * 1e3
      return n
    }
    for (const amount of [7_450, 12_500, 999_999, 3_950_000, 6_950_000, 12_549_999]) {
      expect(parse(compactPrice(amount))).toBeLessThanOrEqual(amount)
    }
  })
})

// The amenity filter sent "?featureIds=a,b" because Object.fromEntries collapsed the array
// into one comma-joined value. ASP.NET Core does not bind that to a Guid[], so the filter
// silently sent the server nothing it understood and every amenity search returned zero.
describe('qs repeats an array key instead of joining it', () => {
  it('repeats the key once per value', () => {
    expect(qs({ featureIds: ['a', 'b', 'c'] })).toBe('?featureIds=a&featureIds=b&featureIds=c')
  })

  it('drops an empty array entirely', () => {
    expect(qs({ featureIds: [], page: 1 })).toBe('?page=1')
  })

  it('drops null, undefined and empty strings', () => {
    expect(qs({ a: 1, b: null, c: undefined, d: '', e: 0 })).toBe('?a=1&e=0')
  })

  it('returns an empty string when there is nothing to send', () => {
    expect(qs({})).toBe('')
    expect(qs({ a: null })).toBe('')
  })

  it('encodes values', () => {
    expect(qs({ q: 'The Pearl, Doha' })).toBe('?q=The+Pearl%2C+Doha')
  })
})
