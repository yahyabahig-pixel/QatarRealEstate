// ---------------------------------------------------------------------------------------
// Geocoding helpers + Qatar geography constants.
//
// Geocoding now runs on Photon (photon.komoot.io) — an open, no-key geocoder built on
// OpenStreetMap data, designed for search-as-you-type. It replaced the Mapbox Geocoding
// API when the map engine moved to MapLibre + OpenFreeMap, so the whole map stack works
// with no account and no token. Function signatures and return shapes are UNCHANGED —
// the pickers and search boxes built against the old implementation run as-is.
//
// COORDINATE CONVENTION (do not change): X = LONGITUDE, Y = LATITUDE.
// This matches both MapLibre ([lng, lat] everywhere) and the backend Location value
// object (XCoordinate = longitude, YCoordinate = latitude). Every function here takes
// and returns them explicitly named so a swap cannot slip through unnoticed.
// ---------------------------------------------------------------------------------------

const PHOTON = 'https://photon.komoot.io'

export const QATAR_CENTER = [51.44, 25.32]            // [lng, lat]
export const QATAR_ZOOM = 8.3
// Generous box around the peninsula: pickers can pan the whole country but not drift
// into Saudi Arabia or open water halfway to Iran.
export const QATAR_MAX_BOUNDS = [[50.35, 24.25], [52.35, 26.45]]

async function geoFetch(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding request failed (${res.status})`)
  return res.json()
}

// One readable line out of Photon's address parts, deduplicated in order.
const placeName = (p = {}) => {
  const parts = [p.name, [p.housenumber, p.street].filter(Boolean).join(' '), p.district, p.city, p.state, p.country]
  return parts.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')
}

// Search-as-you-type. Bounded to the Qatar box and biased toward Doha so
// "West Bay" finds West Bay, Doha — not West Bay, New Zealand.
export async function forwardGeocode(query) {
  if (!query.trim()) return []
  const data = await geoFetch(
    `${PHOTON}/api/?q=${encodeURIComponent(query.trim())}` +
    `&limit=6&lang=en&lat=25.29&lon=51.53&bbox=50.35,24.25,52.35,26.45`)
  return (data.features || [])
    .filter(f => Array.isArray(f.geometry?.coordinates))
    .map((f, i) => ({
      id: `${f.properties?.osm_id ?? 'p'}-${i}`,
      name: placeName(f.properties) || `${f.geometry.coordinates[1].toFixed(4)}, ${f.geometry.coordinates[0].toFixed(4)}`,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }))
}

// Point → address parts, shaped for the backend Location model.
export async function reverseGeocode(lng, lat) {
  const data = await geoFetch(`${PHOTON}/reverse?lon=${lng}&lat=${lat}&lang=en`)
  const p = data.features?.[0]?.properties
  if (!p) return { country: 'Qatar', city: '', street: '', state: '', description: '' }

  const street = [p.housenumber, p.street].filter(Boolean).join(' ')
    || (p.type === 'house' || p.type === 'street' ? p.name : '')

  return {
    country: p.country || 'Qatar',
    city: p.city || p.district || p.county || 'Doha',
    street: street || p.name || '',
    state: p.state || p.district || p.city || '',
    description: placeName(p),
  }
}

// ---------------------------------------------------------------------------------------
// Deterministic in-Qatar fallback for listings that have no saved coordinates yet.
// Seeded by the property id, so the same listing always lands on the same spot —
// a page refresh must not teleport a villa across Doha. Anchors are real populated
// areas; jitter is ±~0.9km so pins spread instead of stacking.
// ---------------------------------------------------------------------------------------
const QATAR_ANCHORS = [
  [25.2854, 51.5310],   // West Bay, Doha
  [25.2760, 51.5228],   // Al Sadd
  [25.3705, 51.5504],   // The Pearl
  [25.3548, 51.4244],   // Al Rayyan
  [25.4106, 51.4904],   // Lusail Fox Hills
  [25.3210, 51.4400],   // Al Waab
  [25.1715, 51.6034],   // Al Wakrah
  [25.6804, 51.4969],   // Al Khor
  [25.2919, 51.4419],   // Al Aziziya
  [25.4300, 51.5450],   // Lusail Marina
]

export function fallbackQatarCoord(seed = '') {
  let h = 0
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const [lat, lng] = QATAR_ANCHORS[h % QATAR_ANCHORS.length]
  const jitter = (n) => (((h >>> (n * 7)) % 1000) / 1000 - 0.5) * 0.016
  return {
    lat: +(lat + jitter(1)).toFixed(6),
    lng: +(lng + jitter(2)).toFixed(6),
    approx: true,
  }
}
