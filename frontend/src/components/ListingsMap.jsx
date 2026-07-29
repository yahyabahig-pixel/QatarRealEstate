import { useEffect, useRef, useState } from 'react'
import { loadMapbox, MAPBOX_TOKEN, MAP_STYLE } from '../lib/mapbox'
import { forwardGeocode } from '../lib/geo'
import { compactPrice } from './ui'
import { IconMap, IconSearch, IconX } from './icons'

// Doha. The very first render has no bounds to fit yet -- fitBounds only fires once the
// first batch of pins arrives -- so the map needs somewhere sensible to open.
const DOHA = [51.531, 25.286]
const SRC = 'qre-listings'

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Inline SVG strings for the popup (mapbox popups take HTML, not React elements).
// Same stroke language as components/icons.jsx.
const S = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
const SVG = {
  bed: S('<path d="M2 9V5"/><path d="M2 16h20"/><path d="M2 20v-8h20v8"/><path d="M2 12V9h8v3"/><path d="M12 12V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/>'),
  bath: S('<path d="M4 12h16a1 1 0 0 1 1 1 5 5 0 0 1-5 5H8a5 5 0 0 1-5-5 1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 4 0"/><path d="M6 20l-1 2"/><path d="M18 20l1 2"/>'),
  area: S('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 3v3M16 3v3M3 8h3M3 16h3M21 8h-3M21 16h-3M8 21v-3M16 21v-3"/>'),
  pin: S('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
}

// Pin label: compact, prefixed with the currency ("QAR 2.6M"). Space on a pin is ~80px,
// so "Price on Request" becomes "On Request" here and the full phrase lives in the popup.
const pinLabel = (it, purpose) =>
  it.price == null
    ? 'On Request'
    : `${it.currency || 'QAR'} ${compactPrice(it.price)}${purpose === 'rent' ? '/mo' : ''}`

const fullPrice = (it, purpose) =>
  it.price == null
    ? 'Price on Request'
    : `${it.currency || 'QAR'} ${Number(it.price).toLocaleString('en-US')}${purpose === 'rent' ? ' /mo' : ''}`

/**
 * The right-hand pane of the split view.
 *
 * The map instance is built EXACTLY ONCE; parent callbacks live in a ref so re-renders
 * never rebuild it. Pins come from a clustered GeoJSON source (Mapbox's recommended
 * clustering): nearby listings collapse into a count bubble that zoom-expands on click,
 * and individual listings render as DOM price pills synced from the cluster source —
 * one map instance, no per-property maps, no per-marker requests.
 */
export default function ListingsMap({
  items = [],
  activeId = null,
  onHoverPin,
  onSelectPin,
  onSearchArea,
  searching = false,
  resizeSignal = 0,
  purpose = 'buy',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())     // key → mapboxgl.Marker ("p<id>" | "c<clusterId>")
  const popupRef = useRef(null)
  const itemsRef = useRef(new Map())       // id → item (popup + label data)
  const userMovedRef = useRef(false)
  const activeIdRef = useRef(null)
  const purposeRef = useRef(purpose)
  const cbRef = useRef({})
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [failReason, setFailReason] = useState('')
  const [moved, setMoved] = useState(false)

  cbRef.current = { onHoverPin, onSelectPin, onSearchArea }
  purposeRef.current = purpose
  activeIdRef.current = activeId

  // ---- popup ------------------------------------------------------------
  const popupHtml = (it) => {
    const badges =
      (it.isExclusive ? '<span class="qre-badge qre-badge-brand">Exclusive</span>' : '') +
      (it.isOffPlan ? '<span class="qre-badge qre-badge-ink">Off-Plan</span>' : '')
    const specs = [
      it.type ? `<span class="qre-popup-type">${esc(it.type)}</span>` : '',
      `<span>${SVG.bed}${it.beds === 0 ? 'Studio' : it.beds}</span>`,
      it.bathrooms > 0 ? `<span>${SVG.bath}${it.bathrooms}</span>` : '',
      `<span>${SVG.area}${(Number(it.sizeM2) || 0).toLocaleString()} m²</span>`,
    ].filter(Boolean).join('')
    return (
      '<div class="qre-popup">' +
      (it.thumbUrl
        ? `<div class="qre-popup-media"><img src="${esc(it.thumbUrl)}" alt="" loading="lazy" />${badges}</div>`
        : (badges ? `<div class="qre-popup-media qre-popup-media-empty">${badges}</div>` : '')) +
      '<div class="qre-popup-body">' +
      `<div class="qre-popup-price">${esc(fullPrice(it, purposeRef.current))}</div>` +
      `<div class="qre-popup-title">${esc(it.title)}</div>` +
      (it.area ? `<div class="qre-popup-loc">${SVG.pin}${esc(it.area)}</div>` : '') +
      `<div class="qre-popup-specs">${specs}</div>` +
      `<a class="qre-popup-btn" href="/property/${esc(purposeRef.current)}/${esc(it.id)}">View Property</a>` +
      '</div></div>'
    )
  }

  const openPopup = (it) => {
    const mapboxgl = window.mapboxgl
    const map = mapRef.current
    if (!mapboxgl || !map) return
    popupRef.current?.remove()
    popupRef.current = new mapboxgl.Popup({ offset: 18, closeButton: true, maxWidth: '280px' })
      .setLngLat([Number(it.lng), Number(it.lat)])
      .setHTML(popupHtml(it))
      .addTo(map)
  }

  // ---- markers, synced from the clustered source -------------------------
  const syncMarkers = () => {
    const map = mapRef.current
    const mapboxgl = window.mapboxgl
    if (!map || !mapboxgl || !map.getSource(SRC)) return
    const live = markersRef.current
    const seen = new Set()

    for (const f of map.querySourceFeatures(SRC)) {
      const props = f.properties || {}
      const key = props.cluster ? `c${props.cluster_id}` : `p${props.id}`
      if (seen.has(key)) continue          // tiles duplicate features at boundaries
      seen.add(key)
      const existing = live.get(key)
      if (existing) { existing.setLngLat(f.geometry.coordinates); continue }

      let el
      if (props.cluster) {
        el = document.createElement('button')
        el.type = 'button'
        el.className = 'pin pin-cluster'
        el.textContent = props.point_count_abbreviated
        el.setAttribute('aria-label', `${props.point_count} properties — zoom in`)
        const clusterId = props.cluster_id
        const center = f.geometry.coordinates
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          map.getSource(SRC).getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return
            map.easeTo({ center, zoom: zoom + 0.25, duration: 500 })
          })
        })
      } else {
        const it = itemsRef.current.get(String(props.id))
        if (!it) continue
        el = document.createElement('button')
        el.type = 'button'
        el.className = 'pin' + (String(props.id) === String(activeIdRef.current) ? ' pin-active' : '')
        el.dataset.pid = String(props.id)
        el.textContent = pinLabel(it, purposeRef.current)
        el.setAttribute('aria-label', it.title || 'Listing')
        el.addEventListener('mouseenter', () => cbRef.current.onHoverPin?.(it.id))
        el.addEventListener('mouseleave', () => cbRef.current.onHoverPin?.(null))
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          cbRef.current.onSelectPin?.(it.id)
          openPopup(it)
        })
      }
      live.set(key, new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(f.geometry.coordinates).addTo(map))
    }

    live.forEach((marker, key) => {
      if (seen.has(key)) return
      marker.remove()
      live.delete(key)
    })
  }

  // ---- build the map once ------------------------------------------------
  useEffect(() => {
    if (!MAPBOX_TOKEN) { setFailed(true); return }
    let cancelled = false

    loadMapbox()
      .then((mapboxgl) => {
        if (cancelled || !containerRef.current || mapRef.current) return
        mapboxgl.accessToken = MAPBOX_TOKEN
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: DOHA,
          zoom: 9.5,
          attributionControl: true,
        })
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

        // A silent white map is worse than an error message. Style/auth failures are
        // fatal (401 = invalid token, 403 = token URL-restricted away from this origin);
        // transient tile errors after a successful load are not.
        map.on('error', (e) => {
          const status = e?.error?.status
          const fatal = status === 401 || status === 403 || !map.loaded()
          if (!fatal || cancelled) return
          setFailReason(status === 401
            ? 'Mapbox rejected the token (401 — invalid or rotated). Check VITE_MAPBOX_TOKEN and restart the dev server.'
            : status === 403
              ? "Mapbox refused this origin (403). The token's URL restrictions don't allow this site — allow localhost in the Mapbox dashboard."
              : 'The map style failed to load — check the connection and the Mapbox token, then reload.')
          setFailed(true)
        })

        // e.originalEvent is present only for USER moves (drag, wheel, dblclick) — the
        // initial fitBounds cannot arm the "Search this area" button.
        map.on('moveend', (e) => {
          if (e.originalEvent) { userMovedRef.current = true; setMoved(true) }
          syncMarkers()
        })
        // Cluster membership changes as tiles load — resync whenever the source settles.
        map.on('sourcedata', (e) => {
          if (e.sourceId === SRC && map.isSourceLoaded(SRC)) syncMarkers()
        })

        map.on('load', () => {
          if (cancelled) return
          map.addSource(SRC, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: 14,   // beyond this every listing stands alone
            clusterRadius: 55,    // px — how close pins must be to merge
          })
          // Mapbox only loads a source's data once AT LEAST ONE style layer uses it —
          // with no layer, querySourceFeatures() stays empty forever and no pin would
          // ever appear. This invisible zero-radius layer exists purely to make the
          // clustered source load (same trick as Mapbox's own cluster-HTML example);
          // the visible pins are the DOM markers synced in syncMarkers().
          map.addLayer({
            id: SRC + '-anchor',
            type: 'circle',
            source: SRC,
            paint: { 'circle-radius': 0, 'circle-opacity': 0 },
          })
          setReady(true)
        })

        mapRef.current = map
      })
      .catch(() => { if (!cancelled) { setFailReason('Mapbox GL JS could not be downloaded — check the connection.'); setFailed(true) } })

    // Layout shifts (mobile pane toggle, sidebar collapse, orientation) resize the pane;
    // a Mapbox canvas measured at the old size renders stretched or blank until resize().
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => requestAnimationFrame(() => mapRef.current?.resize()))
      : null
    if (ro && containerRef.current) ro.observe(containerRef.current)

    return () => {
      cancelled = true
      ro?.disconnect()
      popupRef.current?.remove()
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ---- push items into the source ---------------------------------------
  useEffect(() => {
    const map = mapRef.current
    const mapboxgl = window.mapboxgl
    if (!map || !ready || !mapboxgl) return

    const valid = items.filter(it => Number.isFinite(Number(it.lat)) && Number.isFinite(Number(it.lng)))
    itemsRef.current = new Map(valid.map(it => [String(it.id), it]))

    map.getSource(SRC)?.setData({
      type: 'FeatureCollection',
      features: valid.map(it => ({
        type: 'Feature',
        properties: { id: String(it.id) },
        geometry: { type: 'Point', coordinates: [Number(it.lng), Number(it.lat)] },
      })),
    })

    // Result set changed: rebuild markers so labels/clusters can't go stale, and close
    // a popup that may point at a listing no longer in the results.
    if (popupRef.current && ![...itemsRef.current.keys()].some(id => true)) popupRef.current.remove()
    markersRef.current.forEach((m) => m.remove())
    markersRef.current.clear()
    syncMarkers()

    // Auto-fit ONLY while the user has not taken control of the viewport.
    if (!userMovedRef.current && valid.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      valid.forEach(it => bounds.extend([Number(it.lng), Number(it.lat)]))
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 })
    }
  }, [items, ready])  // eslint-disable-line react-hooks/exhaustive-deps

  // ---- active pin highlight ----------------------------------------------
  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const el = marker.getElement()
      if (el.dataset.pid) el.classList.toggle('pin-active', el.dataset.pid === String(activeId))
    })
    // Card → map sync: if the highlighted listing sits outside the current viewport
    // (or is folded into a cluster off-screen), ease the map over to it — same zoom,
    // no jump-cuts, and never while the user is mid-drag.
    const map = mapRef.current
    const it = activeId != null ? itemsRef.current.get(String(activeId)) : null
    if (map && it) {
      const pos = [Number(it.lng), Number(it.lat)]
      if (Number.isFinite(pos[0]) && Number.isFinite(pos[1]) && !map.getBounds().contains(pos)) {
        map.easeTo({ center: pos, duration: 450 })
      }
    }
  }, [activeId, items])

  // ---- mobile pane toggle: the map was display:none, so it measured 0x0 ---
  useEffect(() => {
    if (!resizeSignal) return
    const t = setTimeout(() => mapRef.current?.resize(), 50)
    return () => clearTimeout(t)
  }, [resizeSignal])

  // ---- location search (persistent overlay control) -----------------------
  // Lives in the REACT layer, as a sibling of the map container -- never injected
  // into Mapbox's internal control DOM, so map re-renders/resizes/route changes
  // between /buy and /rent cannot remove it.
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState([])
  const [placesOpen, setPlacesOpen] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) { setPlaces([]); setPlacesOpen(false); return }
    let stale = false
    const t = setTimeout(() => {
      forwardGeocode(query)
        .then((r) => { if (!stale) { setPlaces(r); setPlacesOpen(r.length > 0) } })
        .catch(() => { if (!stale) { setPlaces([]); setPlacesOpen(false) } })
    }, 300)
    return () => { stale = true; clearTimeout(t) }
  }, [query])

  const goToPlace = (p) => {
    setPlacesOpen(false)
    setQuery(p.name)
    const map = mapRef.current
    if (!map) return
    // Flying somewhere IS taking control of the viewport: stop auto-fit from
    // yanking the user back, and arm "Search this area" so they can requery here.
    userMovedRef.current = true
    setMoved(true)
    map.easeTo({ center: [p.lng, p.lat], zoom: 13.5, duration: 800 })
  }

  const searchHere = () => {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    const minLat = Math.max(-90, b.getSouth())
    const maxLat = Math.min(90, b.getNorth())
    const minLng = Math.max(-180, b.getWest())
    const maxLng = Math.min(180, b.getEast())
    if (minLat >= maxLat || minLng >= maxLng) return
    setMoved(false)
    cbRef.current.onSearchArea?.({ minLat, maxLat, minLng, maxLng })
  }

  if (failed) {
    return (
      <div className="qre-map-fallback">
        <div className="text-center px-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-200 text-neutral-500 flex items-center justify-center mb-3"><IconMap className="w-6 h-6" /></div>
          <p className="text-sm text-neutral-600 max-w-sm mx-auto">
            {MAPBOX_TOKEN
              ? (failReason || 'The map could not be loaded. Check your connection and try again.')
              : 'Map unavailable — VITE_MAPBOX_TOKEN is not set in this build. Add it to frontend/.env.local and RESTART the dev server (Vite only reads env files at startup).'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="qre-split-map">
      {/* Map container: INLINE style on purpose, not Tailwind's `absolute inset-0`.
          Tailwind v4 emits utilities inside a cascade layer, while Mapbox's own
          stylesheet is unlayered and sets `.mapboxgl-map { position: relative }` --
          unlayered CSS outranks ANY layered utility, so the moment Mapbox adds its
          class the container would lose `position: absolute`, collapse to 0px height
          and clip the canvas (map invisible although the DOM is fully built).
          Inline styles outrank both. */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Location search: always rendered (never conditional), positioned over the
          canvas by the app's own UI layer. The map stays interactive around it. */}
      <div className="qre-map-search">
        <IconSearch className="qre-map-search-icon" />
        <input
          type="text"
          value={query}
          placeholder="Search location…"
          aria-label="Search location on the map"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => places.length > 0 && setPlacesOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') setPlacesOpen(false) }}
        />
        {query && (
          <button type="button" className="qre-map-search-clear" aria-label="Clear search"
            onClick={() => { setQuery(''); setPlaces([]); setPlacesOpen(false) }}>
            <IconX className="w-3.5 h-3.5" />
          </button>
        )}
        {placesOpen && (
          <div className="qre-map-search-results" role="listbox">
            {places.map((p) => (
              <button key={p.id} type="button" role="option" onClick={() => goToPlace(p)}>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {moved && (
        <button type="button" onClick={searchHere} disabled={searching} className="qre-search-area">
          {searching ? 'Searching…' : 'Search this area'}
        </button>
      )}
    </div>
  )
}
