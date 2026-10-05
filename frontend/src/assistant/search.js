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
import { normalize } from './nlu/normalize'

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

// An amenity concept ("pool") → the catalog feature row the site actually stores ("Swimming
// Pool"), so the condition can be a server-side ?featureIds= filter instead of a disclaimer.
// Matched by the same token rule the mock catalogue uses, over the catalog the admin edits —
// so an amenity the admin has not created a feature for returns null and is reported honestly
// rather than silently ignored.
export function featureIdFor(key, features) {
  const tokens = amenityTokens(key)
  if (!tokens.length) return null
  const hit = (features || []).find((ft) => {
    const name = lc(ft.name)
    return tokens.some((t) => name.includes(t))
  })
  return hit?.id || null
}

// Splits the requested amenities into the ones the backend can filter on and the ones it
// cannot. Both halves matter: the first becomes a query parameter, the second becomes the
// note that tells the user which conditions were not applied.
function splitAmenities(keys, features) {
  const ids = []
  const unmapped = []
  for (const k of keys || []) {
    const id = featureIdFor(k, features)
    if (id) ids.push(id)
    else unmapped.push(k)
  }
  return { ids, unmapped }
}

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

// An area the lexicon never heard of (see unknownPlaceIn in nlu/parse.js). It is searched as
// free text over the words a listing actually carries, because that is where an agent types
// the area name when adding a property — never silently dropped.
function unknownPlaceMatches(p, stem) {
  const needle = normalize(stem)
  if (!needle) return false
  return [p.city, p.area, p.district, p.title, p.titleAr, p.description]
    .some((h) => h && normalize(h).includes(needle))
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
    if (!entry && f.unknownPlace && !unknownPlaceMatches(p, f.unknownPlace.stem)) return false
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
    // «بدون مسبح» — the listing must NOT have it. Dropping the requirement was never the
    // same answer as excluding it.
    if (f.excludeAmenities?.length && f.excludeAmenities.some((k) => amenityHits(p, k))) return false
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

function liveParams(f, typeNames, typeIdByName, features) {
  const params = { pageSize: 60, page: 1 }
  if (f.purpose) params.listingKind = f.purpose === 'sale' ? 'Sale' : 'Rent'
  const typeName = typeNames.find((n) => typeIdByName?.[n])
  if (typeName) params.propertyTypeId = typeIdByName[typeName]
  const entry = f.location ? locationEntry(f.location) : null
  if (entry) {
    if (entry.isCity) params.city = entry.label
    else params.q = entry.label // LIKE over title + city — the same free-text the site search uses
  } else if (f.unknownPlace) {
    // An area the lexicon does not know goes down the SAME free-text road, on the stem that
    // survives Arabic spelling differences (see placeSearchStem in nlu/parse.js).
    params.q = f.unknownPlace.stem
  }
  if (f.beds != null) params.minRooms = f.beds
  if (f.baths != null) params.minBathrooms = f.baths
  if (f.minArea != null) params.minArea = f.minArea
  if (f.maxArea != null) params.maxArea = f.maxArea
  if (f.minPrice != null) params.minPrice = f.minPrice
  if (f.maxPrice != null) params.maxPrice = f.maxPrice
  // Amenities are a real SQL condition now (?featureIds=…&excludeFeatureIds=…), not a
  // disclaimer. The list DTO deliberately carries no amenities — one row per card — so the
  // browser could never check them; the server can, and always could.
  const wanted = splitAmenities(f.amenities, features)
  const unwanted = splitAmenities(f.excludeAmenities, features)
  if (wanted.ids.length) params.featureIds = wanted.ids
  if (unwanted.ids.length) params.excludeFeatureIds = unwanted.ids
  if (API_SORT[f.sort]) params.sort = API_SORT[f.sort]
  return params
}

// Returns { items, total }: `items` is this page's rows, `total` is how many the SEARCH
// matched. They are different numbers and conflating them is what made the assistant
// announce "I found 60" for a search matching four hundred listings.
export async function liveFetch(f, typeNames, typeIdByName, features) {
  const page = await publicApi.searchProperties(liveParams(f, typeNames, typeIdByName, features))
  let items = page?.items || []
  let total = Number.isFinite(page?.totalCount) ? page.totalCount : items.length

  const before = items.length
  if (f.beds != null && f.bedsExact !== false) items = items.filter((p) => (p.bedrooms ?? 0) === f.beds)
  if (f.featured) items = items.filter((p) => p.exclusive)
  // Those two narrow the rows HERE, over one page, so the server's total stops describing
  // them. Fall back to what was actually kept rather than overstating it.
  if (items.length !== before) total = items.length

  if (f.sort === 'sizeDesc') items = [...items].sort((a, b) => (b.sizeSqm ?? 0) - (a.sizeSqm ?? 0))
  return { items, total }
}

// ------------------------------------------------------------------------------------------
// Relaxation ladder for the "no exact matches" case — one clearly-labelled suggestion set.
// ------------------------------------------------------------------------------------------
function relaxations(f) {
  const out = []
  if (f.maxPrice != null) out.push({ kind: 'price', apply: { maxPrice: Math.round(f.maxPrice * 1.25) } })
  if (f.beds != null && f.bedsExact !== false) out.push({ kind: 'beds', apply: { bedsExact: false } })
  if (f.amenities?.length) out.push({ kind: 'amenities', apply: { amenities: [] } })
  if (f.excludeAmenities?.length) out.push({ kind: 'amenities', apply: { excludeAmenities: [] } })
  if (f.type) out.push({ kind: 'type', apply: { type: null } })
  if (f.location) out.push({ kind: 'location', apply: { location: null } })
  // An unrecognised area is the MOST likely reason a search came back empty, so dropping it
  // is the suggestion worth offering — "nothing in الدفنة, but here is what there is".
  if (!f.location && f.unknownPlace) out.push({ kind: 'location', apply: { unknownPlace: null } })
  return out
}

// ------------------------------------------------------------------------------------------
export async function runSearch(filters, ctx) {
  const { properties = [], propertyTypes = [], typeIdByName = {}, features = [] } = ctx || {}
  const typeNames = filters.type ? matchTypeNames(filters.type, propertyTypes) : []

  // Which amenity conditions can actually be ENFORCED? In mock mode the catalogue carries
  // them, so all of them. Live, each one needs a matching row in the feature catalog the
  // admin edits; the ones without become the honest note instead of a silent pass.
  const unmappable = MOCK_MODE ? [] : [
    ...splitAmenities(filters.amenities, features).unmapped,
    ...splitAmenities(filters.excludeAmenities, features).unmapped,
  ]

  const notes = {
    // the user asked for a type that doesn't exist in THIS project's catalogue
    unknownType: !!(filters.type && !typeNames.length),
    // amenities with no feature row behind them — stated, never faked
    unverifiedAmenities: [...new Set(unmappable)],
    // the budget that could not follow the user from renting to buying
    droppedBudget: filters.droppedBudget || null,
  }
  const effective = notes.unknownType ? { ...filters, type: null } : filters

  const fetchOnce = async (f) => {
    if (MOCK_MODE) {
      const items = rank(mockFilter(properties, f, f.type ? matchTypeNames(f.type, propertyTypes) : []), f)
      return { items, total: items.length }
    }
    return liveFetch(f, f.type ? matchTypeNames(f.type, propertyTypes) : [], typeIdByName, features)
  }

  const first = await fetchOnce(effective)
  const items = first.items
  let relaxed = null
  if (!items.length) {
    for (const r of relaxations(effective)) {
      const alt = await fetchOnce({ ...effective, ...r.apply })
      if (alt.items.length) { relaxed = { kind: r.kind, items: alt.items.slice(0, 3) }; break }
    }
  }
  return { items, total: first.total, relaxed, notes }
}
