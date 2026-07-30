// ---------------------------------------------------------------------------------------
// Mapbox GL JS loader.
//
// The library is pulled from the CDN ON DEMAND -- the first time a component that actually
// draws a map mounts -- and never from index.html. Nothing is added to the global layout,
// so every route that has no map (which is most of them) still ships zero Mapbox bytes.
//
// The promise is memoised: two maps on one page (or a remount) reuse the single <script>
// rather than racing to inject a second copy.
// ---------------------------------------------------------------------------------------
const CDN = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0'

// The token is a BUILD-TIME env var (frontend/.env.local), never a literal in the source.
// Vite inlines it, so it is public by nature -- restrict it by URL in the Mapbox dashboard.
// Both spellings accepted; VITE_MAPBOX_TOKEN is the canonical one in .env.local.
// NOTE: Vite reads .env files ONLY at dev-server startup — if the token was added while
// `npm run dev` was already running, the map shows its "token not set" panel until the
// dev server is restarted.
export const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''
export const MAP_STYLE = 'mapbox://styles/mapbox/light-v11'

let pending = null

export function loadMapbox() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.mapboxgl) return Promise.resolve(window.mapboxgl)
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-mapbox-gl]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = CDN + '/mapbox-gl.css'
      link.setAttribute('data-mapbox-gl', 'true')
      document.head.appendChild(link)
    }

    const script = document.createElement('script')
    script.src = CDN + '/mapbox-gl.js'
    script.async = true
    script.setAttribute('data-mapbox-gl', 'true')
    script.onload = () => {
      if (window.mapboxgl) resolve(window.mapboxgl)
      else { pending = null; reject(new Error('mapbox-gl.js loaded but window.mapboxgl is missing')) }
    }
    // Clearing `pending` on failure means a later mount gets a fresh attempt instead of
    // being handed the already-rejected promise forever.
    script.onerror = () => { pending = null; reject(new Error('Failed to load Mapbox GL JS')) }
    document.head.appendChild(script)
  })

  return pending
}
