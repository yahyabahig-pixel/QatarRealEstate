import { MAPBOX_TOKEN } from './mapbox'

// ---------------------------------------------------------------------------------------
// Geocoding helpers + Qatar geography constants.
//
// COORDINATE CONVENTION (do not change): X = LONGITUDE, Y = LATITUDE.
// This matches both Mapbox ([lng, lat] everywhere) and the backend Location value
// object (XCoordinate = longitude, YCoordinate = latitude). Every function here takes
// and returns them explicitly named so a swap cannot slip through unnoticed.
// ---------------------------------------------------------------------------------------

const GEO = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

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

// Search-as-you-type. Restricted to Qatar (country=qa) and biased toward Doha so
// "West Bay" finds West Bay, Doha — not West Bay, New Zealand.
export async function forwardGeocode(query) {
  if (!MAPBOX_TOKEN || !query.trim()) return []
  const data = await geoFetch(
    `${GEO}/${encodeURIComponent(query.trim())}.json` +
    `?access_token=${MAPBOX_TOKEN}&country=qa&proximity=51.53,25.29&limit=6&language=en`)
  return (data.features || []).map(f => ({
    id: f.id,
    name: f.place_name,
    lng: f.center[0],
    lat: f.center[1],
  }))
}

// Point → address parts, shaped for the backend Location model.
// Mapbox context ids are prefixed by kind: country / region / place / locality /
// neighborhood / address — that prefix is the lookup key.
export async function reverseGeocode(lng, lat) {
  if (!MAPBOX_TOKEN) return null
  const data = await geoFetch(
    `${GEO}/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&language=en`)
  const f = data.features?.[0]
  if (!f) return { country: 'Qatar', city: '', street: '', state: '', description: '' }

  const ring = [f, ...(f.context || [])]
  const find = (prefix) => ring.find(c => c.id?.startsWith(prefix))?.text || ''

  const street = f.place_type?.includes('address')
    ? [f.address, f.text].filter(Boolean).join(' ')
    : find('address') || find('neighborhood') || find('locality')

  return {
    country: find('country') || 'Qatar',
    city: find('place') || find('locality') || 'Doha',
    street,
    state: find('region') || find('district') || find('place') || '',
    description: f.place_name || '',
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
