// ---------------------------------------------------------------------------------------
// Map engine loader — MapLibre GL (open-source) + OpenFreeMap tiles.
//
// HISTORY: this module originally loaded Mapbox GL, which requires a paid-tier access
// token. It now loads MapLibre GL — the open-source, API-compatible fork — with the
// OpenFreeMap "positron" style (OpenStreetMap data, no key, no usage caps, production
// allowed). Nothing else in the app changed: MapLibre is exposed under BOTH
// window.maplibregl and the legacy window.mapboxgl alias, so every component keeps
// working untouched. Pinned to v4.x because the pin-clustering code uses the callback
// form of getClusterExpansionZoom (v5 made it Promise-only).
//
// WHY IT IS NO LONGER A CDN <script> TAG
// --------------------------------------
// It used to inject `https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js` into the page:
// a floating major version, no Subresource Integrity, from a third party, executed with
// full access to the page. That page includes the ADMIN PANEL — the property form draws a
// location picker — and the admin's JWT lives in sessionStorage, which any script running
// on the page can read. A compromised release or a compromised CDN would have handed over
// admin sessions. And when unpkg was simply down, the location picker did not load at all,
// so no listing could be created.
//
// maplibre-gl is now a project dependency with an exact version in package-lock.json,
// installed at build time and served from this site's own origin. The dynamic import()
// keeps the original benefit: Vite splits it into its own chunk, so routes without a map
// still ship zero map bytes, and the browser fetches it the first time a map mounts.
//
// The RTL text plugin (Arabic map labels) is the one thing MapLibre insists on fetching by
// URL at runtime, so it is served from this origin too — see public/vendor/.
// ---------------------------------------------------------------------------------------

// Served from this site, not a CDN. See public/vendor/README.md.
const RTL_PLUGIN = '/vendor/mapbox-gl-rtl-text.min.js'

// Kept for compatibility: many call sites gate on a truthy token before mounting a map.
// MapLibre + OpenFreeMap need no token at all, so this is now a constant "yes, maps work".
export const MAPBOX_TOKEN = 'open-free'

// Light, minimal basemap — closest OpenFreeMap match to the old Mapbox light-v11 look.
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

let pending = null

export function loadMapbox() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.mapboxgl) return Promise.resolve(window.mapboxgl)
  if (pending) return pending

  pending = (async () => {
    // Both the module and its stylesheet come from the bundle. Vite turns these into a
    // separate chunk plus a CSS file it injects when the chunk loads.
    const [mod] = await Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])
    const gl = mod.default ?? mod
    if (!gl?.Map) throw new Error('maplibre-gl loaded but has no Map constructor')

    // Legacy alias — the components were written against window.mapboxgl.
    window.maplibregl = gl
    window.mapboxgl = gl
    // Arabic (and other RTL) map labels shape correctly. Lazy: the worker loads only when
    // an RTL glyph is actually encountered on the map.
    try { gl.setRTLTextPlugin(RTL_PLUGIN, true) } catch { /* already set on remount */ }
    return gl
  })()

  // Clearing `pending` on failure means a later mount gets a fresh attempt instead of
  // being handed the already-rejected promise forever.
  pending.catch(() => { pending = null })
  return pending
}
