// ---------------------------------------------------------------------------------------
// The assistant's Property Search Engine. The site's own data is the ONLY source of truth:
//
//   MOCK mode  — filters the seed catalogue in memory (same array the whole site renders).
//   LIVE mode  — sends the criteria to the real backend: GET /api/properties with
//                listingKind / propertyTypeId / city / minRooms / minBathrooms /
//                minArea / maxArea / minPrice / maxPrice / sort / q — the exact query
//                surface SearchPropertiesQuery already exposes. No backend changes.
//
// Hard filters are never violated: a 2.5M listing is NOT a "match" for a 2M budget.
// When nothing matches, `relaxed` carries a clearly-labelled nearby alternative set
// (budget +25%, then dropping the softest condition) so the UI can OFFER it — separate
// from matches, exactly as requested.
//
// KNOWN LIMITS (honest by design, stated to the user in replies.js):
//   • live list rows don't carry amenities (thin DTO by design), so amenity conditions
//     are applied in mock mode and reported as "check the details page" in live mode —
//     they are never silently faked. Adding a feature filter param to the backend later
//     plugs straight in here.
// ---------------------------------------------------------------------------------------
import { MOCK_MODE } from '../api/client'
import { publicApi } from '../api/realEstateApi'
import { TYPES, LOCATIONS, AMENITIES } from './nlu/lexicon'

const lc = (s) => String(s ?? '').toLowerCase()

// Which REAL catalog type names match this concept? ("villa" → ["Villa"] live;
// ["Standalone Villa", "Compound Villa", …] in the mock catalogue.)
export function matchTypeNames(typeKey, propertyTypes) {
  const def = TYPES[typeKey]
  if (!def) return []
  return (propertyTypes || [])
    .map((t) => t.name)
    .filter((name) => def.match.some((tok) => lc(name).includes(tok)))
}

export const locationEntry = (locKey) => LOCATIONS[locKey] || null

const amenityTokens = (key) => (AMENITIES[key]?.match) || []

function amenityHits(p, key) {
  const tokens = amenityTokens(key)
  const hay = [
    ...(p.amenities || []),
    p.balcony ? 'balcony' : '',
    (p.parking || 0) > 0 ? 'parking' : '',
  ].map(lc)
  if (key === 'furnished') {
    const f = lc(p.furnishing)
    return (f.includes('furnish') && !f.startsWith('un') && !f.startsWith('non'))
      || hay.some((h) => h.includes('furnished') && !h.startsWith('un'))
  }
  return hay.some((h) => tokens.some((t) => h.includes(t)))
}

function locationMatches(p, entry) {
  const label = lc(entry.label)
  const hay = [p.city, p.area, p.district].map(lc)
  if (entry.isCity) return hay.some((h) => h === label || h.includes(label))
  return hay.some((h) => h && h.includes(label))
}

// ------------------------------------------------------------------------------------------
// MOCK: pure in-memory filtering over the seed shape (rich fields).
// ------------------------------------------------------------------------------------------
function mockFilter(all, f, typeNames) {
  const entry = f.location ? locationEntry(f.location) : null
  return all.filter((p) => {
    if (p.status && p.status !== 'available') return false
    if (f.purpose && p.purpose !== (f.purpose === 'sale' ? 'buy' : 'rent')) return false
    if (typeNames.length && !typeNames.includes(p.type)) return false
    if (entry && !locationMatches(p, entry)) return false
    if (f.beds != null && (f.bedsExact !== false ? (p.bedrooms ?? 0) !== f.beds : (p.bedrooms ?? 0) < f.beds)) return false
    if (f.baths != null && (p.bathrooms ?? 0) < f.baths) return false
    if (f.minArea != null && !((p.sizeSqm ?? 0) >= f.minArea)) return false
    if (f.maxArea != null && !((p.sizeSqm ?? 0) <= f.maxArea)) return false
    if (!p.priceOnRequest) {
      if (f.minPrice != null && !(p.price >= f.minPrice)) return false
      if (f.maxPrice != null && !(p.price <= f.maxPrice)) return false
    } else if (f.minPrice != null || f.maxPrice != null) {
      // price-on-request can't prove it fits the budget — keep it OUT of exact matches;
      // the relaxation pass may still surface it as a labelled suggestion.
      return false
    }
    if (f.amenities?.length && !f.amenities.every((k) => amenityHits(p, k))) return false
    if (f.featured && !p.exclusive) return false
    return true
  })
}

function rank(items, f) {
  const score = (p) => (p.exclusive ? 3 : 0) + (p.priceOnRequest ? 0 : 1)
  const time = (p) => Date.parse(p.addedOn || 0) || 0
  const price = (p) => (p.priceOnRequest || p.price == null ? Infinity : p.price)
  const sorted = [...items]
  switch (f.sort) {
    case 'priceAsc': return sorted.sort((a, b) => price(a) - price(b))
    case 'priceDesc': return sorted.sort((a, b) => (price(b) === Infinity ? -1 : price(b)) - (price(a) === Infinity ? -1 : price(a)))
    case 'sizeDesc': return sorted.sort((a, b) => (b.sizeSqm ?? 0) - (a.sizeSqm ?? 0))
    case 'newest': return sorted.sort((a, b) => time(b) - time(a))
    default: return sorted.sort((a, b) => score(b) - score(a) || price(a) - price(b))
  }
}

// ------------------------------------------------------------------------------------------
// LIVE: real API call. Criteria → SearchPropertiesQuery params.
// ------------------------------------------------------------------------------------------
const API_SORT = { priceAsc: 'PriceAsc', priceDesc: 'PriceDesc', newest: 'Newest' }

function liveParams(f, typeNames, typeIdByName) {
  const params = { pageSize: 60, page: 1 }
  if (f.purpose) params.listingKind = f.purpose === 'sale' ? 'Sale' : 'Rent'
  const typeName = typeNames.find((n) => typeIdByName?.[n])
  if (typeName) params.propertyTypeId = typeIdByName[typeName]
  const entry = f.location ? locationEntry(f.location) : null
  if (entry) {
    if (entry.isCity) params.city = entry.label
    else params.q = entry.label // LIKE over title + city — the same free-text the site search uses
  }
  if (f.beds != null) params.minRooms = f.beds
  if (f.baths != null) params.minBathrooms = f.baths
  if (f.minArea != null) params.minArea = f.minArea
  if (f.maxArea != null) params.maxArea = f.maxArea
  if (f.minPrice != null) params.minPrice = f.minPrice
  if (f.maxPrice != null) params.maxPrice = f.maxPrice
  if (API_SORT[f.sort]) params.sort = API_SORT[f.sort]
  return params
}

async function liveFetch(f, typeNames, typeIdByName) {
  const page = await publicApi.searchProperties(liveParams(f, typeNames, typeIdByName))
  let items = page?.items || []
  if (f.beds != null && f.bedsExact !== false) items = items.filter((p) => (p.bedrooms ?? 0) === f.beds)
  if (f.featured) items = items.filter((p) => p.exclusive)
  if (f.sort === 'sizeDesc') items = [...items].sort((a, b) => (b.sizeSqm ?? 0) - (a.sizeSqm ?? 0))
  return items
}

// ------------------------------------------------------------------------------------------
// Relaxation ladder for the "no exact matches" case — one clearly-labelled suggestion set.
// ------------------------------------------------------------------------------------------
function relaxations(f) {
  const out = []
  if (f.maxPrice != null) out.push({ kind: 'price', apply: { maxPrice: Math.round(f.maxPrice * 1.25) } })
  if (f.beds != null && f.bedsExact !== false) out.push({ kind: 'beds', apply: { bedsExact: false } })
  if (f.amenities?.length) out.push({ kind: 'amenities', apply: { amenities: [] } })
  if (f.type) out.push({ kind: 'type', apply: { type: null } })
  if (f.location) out.push({ kind: 'location', apply: { location: null } })
  return out
}

// ------------------------------------------------------------------------------------------
export async function runSearch(filters, ctx) {
  const { properties = [], propertyTypes = [], typeIdByName = {} } = ctx || {}
  const typeNames = filters.type ? matchTypeNames(filters.type, propertyTypes) : []
  const notes = {
    // the user asked for a type that doesn't exist in THIS project's catalogue
    unknownType: !!(filters.type && !typeNames.length),
    // live rows can't verify amenities — surfaced honestly, never faked
    unverifiedAmenities: !MOCK_MODE && (filters.amenities?.length ? [...filters.amenities] : []),
  }
  const effective = notes.unknownType ? { ...filters, type: null } : filters

  const fetchOnce = async (f) => {
    if (MOCK_MODE) return rank(mockFilter(properties, f, f.type ? matchTypeNames(f.type, propertyTypes) : []), f)
    const liveF = notes.unverifiedAmenities.length ? { ...f, amenities: [] } : f
    return liveFetch(liveF, liveF.type ? matchTypeNames(liveF.type, propertyTypes) : [], typeIdByName)
  }

  const items = await fetchOnce(effective)
  let relaxed = null
  if (!items.length) {
    for (const r of relaxations(effective)) {
      const alt = await fetchOnce({ ...effective, ...r.apply })
      if (alt.length) { relaxed = { kind: r.kind, items: alt.slice(0, 3) }; break }
    }
  }
  return { items, total: items.length, relaxed, notes }
}
