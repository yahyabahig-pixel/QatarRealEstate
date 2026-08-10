// ---------------------------------------------------------------------------------------
// Map engine loader — MapLibre GL (open-source) + OpenFreeMap tiles.
//
// HISTORY: this module originally loaded Mapbox GL, which requires a paid-tier access
// token. It now loads MapLibre GL — the open-source, API-compatible fork — with the
// OpenFreeMap "positron" style (OpenStreetMap data, no key, no usage caps, production
// allowed). Nothing else in the app changed: MapLibre is exposed under BOTH
// window.maplibregl and the legacy window.mapboxgl alias, so every component keeps
// working untouched. Pinned to v4.x because the pin-clustering code uses the
// callback form of getClusterExpansionZoom (v5 made it Promise-only).
//
// The library is pulled from the CDN ON DEMAND -- the first time a component that
// actually draws a map mounts -- and never from index.html, so every route without a
// map still ships zero map bytes. The promise is memoised: two maps on one page (or a
// remount) reuse the single <script> rather than racing to inject a second copy.
// ---------------------------------------------------------------------------------------
const CDN = 'https://unpkg.com/maplibre-gl@4/dist'
const RTL_PLUGIN = 'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js'

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

  pending = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-mapbox-gl]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = CDN + '/maplibre-gl.css'
      link.setAttribute('data-mapbox-gl', 'true')
      document.head.appendChild(link)
    }

    const script = document.createElement('script')
    script.src = CDN + '/maplibre-gl.js'
    script.async = true
    script.setAttribute('data-mapbox-gl', 'true')
    script.onload = () => {
      const gl = window.maplibregl
      if (gl) {
        // Legacy alias — the components were written against window.mapboxgl.
        window.mapboxgl = gl
        // Arabic (and other RTL) map labels shape correctly. Lazy: the worker loads
        // only when an RTL glyph is actually encountered on the map.
        try { gl.setRTLTextPlugin(RTL_PLUGIN, true) } catch { /* already set on remount */ }
        resolve(gl)
      } else {
        pending = null
        reject(new Error('maplibre-gl.js loaded but window.maplibregl is missing'))
      }
    }
    // Clearing `pending` on failure means a later mount gets a fresh attempt instead of
    // being handed the already-rejected promise forever.
    script.onerror = () => { pending = null; reject(new Error('Failed to load MapLibre GL JS')) }
    document.head.appendChild(script)
  })

  return pending
}
