import { describe, expect, it, vi, beforeEach } from 'vitest'
import { runSearch, liveFetch, featureIdFor } from '../search'
import { parseMessage } from '../nlu/parse'
import { summarize, notesPhrase } from '../replies'
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

// ---------------------------------------------------------------------------------------
// "Without a pool" used to be answered WITH the pools. The removal machinery could only
// stop REQUIRING an amenity, and the amenity sweep further down then read the same word as
// a requirement — so the assistant returned the exact opposite of what was asked.
// ---------------------------------------------------------------------------------------
const FEATURES = [
  { id: 'f-pool', name: 'Swimming Pool' },
  { id: 'f-gym', name: 'Gym' },
  { id: 'f-garden', name: 'Private Garden' },
]
const WITH_POOL = [
  { id: 10, title: 'Villa with pool', purpose: 'buy', type: 'Villa', status: 'available', city: 'Doha', area: 'Al Waab', bedrooms: 5, bathrooms: 5, price: 6000000, sizeSqm: 500, amenities: ['Swimming Pool'] },
  { id: 11, title: 'Villa without one', purpose: 'buy', type: 'Villa', status: 'available', city: 'Doha', area: 'Al Waab', bedrooms: 5, bathrooms: 5, price: 5000000, sizeSqm: 450, amenities: ['Gym'] },
]
const poolCtx = { properties: WITH_POOL, propertyTypes: TYPES, typeIdByName: { Villa: 't2' }, features: FEATURES }

describe('a negated amenity is EXCLUDED, not merely un-required', () => {
  it('tells «بدون مسبح» apart from «شيل شرط المسبح»', () => {
    const neg = parseMessage('فيلا للبيع بدون مسبح', { hasContext: true })
    expect(neg.removals).toContainEqual({ kind: 'amenity', key: 'pool' })
    expect(neg.slots.excludeAmenities).toEqual(['pool'])

    const drop = parseMessage('شيل شرط المسبح', { hasContext: true })
    expect(drop.removals).toContainEqual({ kind: 'amenity', key: 'pool' })
    expect(drop.slots.excludeAmenities).toBeUndefined()
  })

  it('drops the listings that have it', async () => {
    const { items } = await runSearch({ purpose: 'sale', excludeAmenities: ['pool'] }, poolCtx)
    expect(items.map((p) => p.id)).toEqual([11])
  })

  it('does not also stop requiring it for everyone else', async () => {
    const { items } = await runSearch({ purpose: 'sale', amenities: ['pool'] }, poolCtx)
    expect(items.map((p) => p.id)).toEqual([10])
  })

  it('says so in the criteria line', () => {
    expect(summarize({ type: 'villa', excludeAmenities: ['pool'] }, 'ar')).toContain('بدون مسبح')
    expect(summarize({ type: 'villa', excludeAmenities: ['pool'] }, 'en')).toContain('without pool')
  })

  it('changing your mind replaces the condition instead of keeping both', () => {
    expect(mergeSlots({ excludeAmenities: ['pool'] }, { amenities: ['pool'] }))
      .toEqual({ amenities: ['pool'] })
    expect(mergeSlots({ amenities: ['pool'] }, { excludeAmenities: ['pool'] }))
      .toEqual({ excludeAmenities: ['pool'] })
  })
})

describe('amenities are a real server-side filter now, not a disclaimer', () => {
  beforeEach(() => { publicApi.searchProperties.mockReset() })

  it('sends featureIds and excludeFeatureIds', async () => {
    publicApi.searchProperties.mockResolvedValue({ items: [], totalCount: 0 })
    await liveFetch({ amenities: ['pool'], excludeAmenities: ['gym'] }, [], {}, FEATURES)
    expect(publicApi.searchProperties).toHaveBeenCalledWith(expect.objectContaining({
      featureIds: ['f-pool'],
      excludeFeatureIds: ['f-gym'],
    }))
  })

  it('reports only the amenities the catalogue has no feature for', async () => {
    // 'metro' has no matching row in FEATURES — that one, and only that one, is unverified.
    const { notes } = await runSearch({ amenities: ['pool', 'metro'] }, { ...poolCtx, properties: [] })
    // MOCK_MODE is on in tests, so the mock path enforces everything and the note is empty.
    expect(notes.unverifiedAmenities).toEqual([])
    // The mapping itself is what the live path depends on:
    expect(featureIdFor('pool', FEATURES)).toBe('f-pool')
    expect(featureIdFor('metro', FEATURES)).toBeNull()
  })
})

describe('a rental budget does not follow you into a purchase search', () => {
  it('drops it and says what it dropped', () => {
    const before = { purpose: 'rent', maxPrice: 8000, type: 'apartment' }
    const after = mergeSlots(before, { purpose: 'sale' })
    expect(after.maxPrice).toBeUndefined()
    expect(after.droppedBudget).toEqual({ min: null, max: 8000, from: 'rent' })
    expect(notesPhrase({ droppedBudget: after.droppedBudget }, 'ar').join(' ')).toContain('8,000')
  })

  it('keeps a budget the same message supplied', () => {
    const after = mergeSlots({ purpose: 'rent', maxPrice: 8000 }, { purpose: 'sale', maxPrice: 2000000 })
    expect(after.maxPrice).toBe(2000000)
    expect(after.droppedBudget).toBeUndefined()
  })

  it('leaves the budget alone when the purpose has not changed', () => {
    const after = mergeSlots({ purpose: 'rent', maxPrice: 8000 }, { beds: 2 })
    expect(after.maxPrice).toBe(8000)
  })
})
