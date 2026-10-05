import { describe, expect, it, vi, beforeEach } from 'vitest'
import { runSearch, liveFetch } from '../search'
import { parseMessage } from '../nlu/parse'
import { summarize } from '../replies'
import { applyRemovals, mergeSlots } from '../filters'

// ---------------------------------------------------------------------------------------
// Two defects live here, and both made the assistant say something that was not true.
//
//   1. An area the lexicon does not know (الدفنة، بن محمود، معيذر — Qatar has far more
//      areas than the 18 in LOCATIONS, and an agent can add one in the admin panel at any
//      time) was dropped in silence. The assistant searched everything else and announced
//      the result as "matching", so a visitor asking for الدفنة got listings in الخور with
//      nothing saying the area had been ignored.
//
//   2. The result count was the PAGE size. A search matching four hundred listings was
//      announced as "I found 60" because that is how many rows came back in one page.
// ---------------------------------------------------------------------------------------

vi.mock('../../api/realEstateApi', () => ({
  publicApi: { searchProperties: vi.fn() },
}))
const { publicApi } = await import('../../api/realEstateApi')

// MOCK_MODE is on in tests (VITE_API_URL is unset), so these exercise the in-memory path.
const CATALOGUE = [
  {
    id: 1, title: 'Modern apartment', purpose: 'rent', type: 'Apartment', status: 'available',
    city: 'Doha', area: 'الدفنة', district: 'الدفنة', bedrooms: 2, bathrooms: 2, price: 8000, sizeSqm: 120,
  },
  {
    id: 2, title: 'Marina apartment', purpose: 'rent', type: 'Apartment', status: 'available',
    city: 'Lusail', area: 'Marina District', district: 'Marina District', bedrooms: 2, bathrooms: 2, price: 9000, sizeSqm: 130,
  },
  {
    id: 3, title: 'شقة في فريج بن محمود', purpose: 'rent', type: 'Apartment', status: 'available',
    city: 'Doha', area: 'Bin Mahmoud', district: 'Bin Mahmoud', bedrooms: 1, bathrooms: 1, price: 5500, sizeSqm: 80,
  },
]
const TYPES = [{ id: 't1', name: 'Apartment' }, { id: 't2', name: 'Villa' }]
const ctx = { properties: CATALOGUE, propertyTypes: TYPES, typeIdByName: { Apartment: 't1', Villa: 't2' } }

const filtersFor = (text) => parseMessage(text, { hasContext: false }).slots

describe('an area the lexicon does not know is SEARCHED, not dropped', () => {
  it('limits the results to listings that actually carry that area', async () => {
    const { items } = await runSearch(filtersFor('شقة للإيجار في الدفنة'), ctx)
    expect(items.map((p) => p.id)).toEqual([1])
  })

  it('matches across the ة/ه spelling difference normalize() introduces', async () => {
    // The user types الدفنة, normalize() gives الدفنه, the catalogue holds الدفنة. Comparing
    // the two raw strings finds nothing; the stem (الدفن) finds the listing.
    expect(filtersFor('شقة في الدفنة').unknownPlace.stem).toBe('الدفن')
    const { items } = await runSearch(filtersFor('شقة في الدفنة'), ctx)
    expect(items).toHaveLength(1)
  })

  it('finds a two-word area the agent wrote with an extra word in front', async () => {
    // "بن محمود" in the message; "فريج بن محمود" in the listing title.
    const { items } = await runSearch(filtersFor('ابي شقة في بن محمود للايجار'), ctx)
    expect(items.map((p) => p.id)).toEqual([3])
  })

  it('says the area by name in the criteria line, so an empty result explains itself', () => {
    const f = filtersFor('شقة للإيجار في معيذر')
    expect(summarize(f, 'ar')).toContain('في معيذر')
    // …and keeps the user's own spelling, not the normalized matching form.
    expect(summarize(filtersFor('شقة في الدفنة'), 'ar')).toContain('الدفنة')
  })

  it('returns nothing — and offers the area-free alternative — when it really is not there', async () => {
    const { items, relaxed } = await runSearch(filtersFor('شقة للإيجار في معيذر'), ctx)
    expect(items).toHaveLength(0)
    expect(relaxed.kind).toBe('location')
    expect(relaxed.items.length).toBeGreaterThan(0)
  })

  it('does not invent an area out of an ordinary sentence', async () => {
    expect(filtersFor('عايز شقة في حدود 8000').unknownPlace).toBeUndefined()
    expect(filtersFor('شقة في منطقة هادئة').unknownPlace).toBeUndefined()
    expect(filtersFor('apartment in a nice area').unknownPlace).toBeUndefined()
    // A place the lexicon DOES know stays a proper location filter.
    const known = filtersFor('شقة في لوسيل')
    expect(known.location).toBe('lusail')
    expect(known.unknownPlace).toBeUndefined()
  })
})

describe('the two area conditions never apply at once', () => {
  it('a known area replaces an unrecognised one', () => {
    const f = mergeSlots({ unknownPlace: { label: 'الدفنة', stem: 'الدفن' } }, { location: 'lusail' })
    expect(f.location).toBe('lusail')
    expect(f.unknownPlace).toBeUndefined()
  })

  it('an unrecognised area replaces a known one', () => {
    const f = mergeSlots({ location: 'lusail' }, { unknownPlace: { label: 'الدفنة', stem: 'الدفن' } })
    expect(f.unknownPlace.label).toBe('الدفنة')
    expect(f.location).toBeUndefined()
  })

  it('«شيل المنطقة» clears whichever one is set', () => {
    const removal = [{ kind: 'location' }]
    expect(applyRemovals({ location: 'lusail', beds: 2 }, removal)).toEqual({ beds: 2 })
    expect(applyRemovals({ unknownPlace: { label: 'الدفنة', stem: 'الدفن' }, beds: 2 }, removal)).toEqual({ beds: 2 })
  })
})

describe('the count reported to the user is the MATCH count, not the page size', () => {
  beforeEach(() => { publicApi.searchProperties.mockReset() })

  // These drive the live branch directly: MOCK_MODE short-circuits runSearch, so the live
  // helper is exercised through the same filters a message produces.
  const live = (filters) => liveFetch(filters, ['Apartment'], { Apartment: 't1' })

  it('uses totalCount from the server, not items.length', async () => {
    publicApi.searchProperties.mockResolvedValue({
      items: Array.from({ length: 60 }, (_, i) => ({ id: i, bedrooms: 2 })),
      totalCount: 412,
    })
    const { items, total } = await live({})
    expect(items).toHaveLength(60)
    expect(total).toBe(412)
  })

  it('falls back to what was kept when a client-side filter narrows the page', async () => {
    // bedsExact and featured are applied in the browser over ONE page, so the server's total
    // stops describing the rows the user is shown. Reporting 412 there would be a lie.
    publicApi.searchProperties.mockResolvedValue({
      items: [{ id: 1, bedrooms: 2 }, { id: 2, bedrooms: 3 }, { id: 3, bedrooms: 2 }],
      totalCount: 412,
    })
    const { items, total } = await live({ beds: 2 })
    expect(items).toHaveLength(2)
    expect(total).toBe(2)
  })

  it('sends an unrecognised area to the backend as a free-text query', async () => {
    publicApi.searchProperties.mockResolvedValue({ items: [], totalCount: 0 })
    await live({ unknownPlace: { label: 'الدفنة', stem: 'الدفن' } })
    expect(publicApi.searchProperties).toHaveBeenCalledWith(expect.objectContaining({ q: 'الدفن' }))
  })
})
