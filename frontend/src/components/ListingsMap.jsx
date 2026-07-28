import { useEffect, useRef, useState } from 'react'
import { loadMapbox, MAPBOX_TOKEN, MAP_STYLE } from '../lib/mapbox'
import { compactPrice } from './ui'
import { IconMap } from './icons'

// Doha. The very first render has no bounds to fit yet -- fitBounds only fires once the
// first batch of pins arrives -- so the map needs somewhere sensible to open.
const DOHA = [51.531, 25.286]

/**
 * The right-hand pane of the split view.
 *
 * The map instance is built EXACTLY ONCE. Every callback the parent passes lives in a ref
 * that the effects read at call time, so a parent re-render (which happens on every hover)
 * can never tear the map down and rebuild it -- that would flash the tiles and lose the
 * viewport the user just panned to.
 */
export default function ListingsMap({
  items = [],
  activeId = null,
  onHoverPin,
  onSelectPin,
  onSearchArea,
  searching = false,
  resizeSignal = 0,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const userMovedRef = useRef(false)
  const cbRef = useRef({})
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [moved, setMoved] = useState(false)

  cbRef.current = { onHoverPin, onSelectPin, onSearchArea }

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

        // e.originalEvent is present only for moves the USER caused (drag, wheel, dblclick).
        // Programmatic fitBounds has no original event, so the initial fit cannot arm the
        // "Search this area" button and make the page look like it needs a second search.
        map.on('moveend', (e) => {
          if (!e.originalEvent) return
          userMovedRef.current = true
          setMoved(true)
        })

        mapRef.current = map
        map.on('load', () => { if (!cancelled) setReady(true) })
      })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => {
      cancelled = true
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // ---- diff the markers against `items` ----------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !window.mapboxgl) return
    const mapboxgl = window.mapboxgl
    const live = markersRef.current
    const seen = new Set()

    items.forEach((it) => {
      if (!Number.isFinite(Number(it.lat)) || !Number.isFinite(Number(it.lng))) return
      seen.add(it.id)
      const existing = live.get(it.id)
      if (existing) {
        existing.setLngLat([Number(it.lng), Number(it.lat)])
        existing.getElement().textContent = compactPrice(it.price)
        return
      }

      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'pin'
      el.textContent = compactPrice(it.price)
      el.setAttribute('aria-label', it.title || 'Listing')
      el.addEventListener('mouseenter', () => cbRef.current.onHoverPin?.(it.id))
      el.addEventListener('mouseleave', () => cbRef.current.onHoverPin?.(null))
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        cbRef.current.onSelectPin?.(it.id)
      })

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([Number(it.lng), Number(it.lat)])
        .addTo(map)
      live.set(it.id, marker)
    })

    // Anything no longer in the result set leaves the map.
    live.forEach((marker, id) => {
      if (seen.has(id)) return
      marker.remove()
      live.delete(id)
    })

    // Auto-fit ONLY while the user has not taken control of the viewport. Once they pan,
    // re-fitting under them would fight their input on every filter change.
    if (!userMovedRef.current && items.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      let count = 0
      items.forEach((it) => {
        if (!Number.isFinite(Number(it.lat)) || !Number.isFinite(Number(it.lng))) return
        bounds.extend([Number(it.lng), Number(it.lat)])
        count += 1
      })
      if (count > 0) map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 })
    }
  }, [items, ready])

  // ---- active pin highlight ----------------------------------------------
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      marker.getElement().classList.toggle('pin-active', id === activeId)
    })
  }, [activeId, items])

  // ---- mobile pane toggle: the map was display:none, so it measured 0x0 ---
  useEffect(() => {
    if (!resizeSignal) return
    const t = setTimeout(() => mapRef.current?.resize(), 50)
    return () => clearTimeout(t)
  }, [resizeSignal])

  const searchHere = () => {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    const minLat = Math.max(-90, b.getSouth())
    const maxLat = Math.min(90, b.getNorth())
    const minLng = Math.max(-180, b.getWest())
    const maxLng = Math.min(180, b.getEast())
    // A world-wrapped viewport can report west > east. Re-querying with an inverted box
    // returns nothing, which reads as "no listings here" -- so skip it instead.
    if (minLat >= maxLat || minLng >= maxLng) return
    setMoved(false)
    cbRef.current.onSearchArea?.({ minLat, maxLat, minLng, maxLng })
  }

  if (failed) {
    return (
      <div className="qre-map-fallback">
        <div className="text-center px-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-200 text-neutral-500 flex items-center justify-center mb-3"><IconMap className="w-6 h-6" /></div>
          <p className="text-sm text-neutral-600">
            {MAPBOX_TOKEN
              ? 'The map could not be loaded. Check your connection and try again.'
              : 'Map unavailable — VITE_MAPBOX_TOKEN is not set in this build.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="qre-split-map">
      <div ref={containerRef} className="absolute inset-0" />
      {moved && (
        <button type="button" onClick={searchHere} disabled={searching} className="qre-search-area">
          {searching ? 'Searching…' : 'Search this area'}
        </button>
      )}
    </div>
  )
}
