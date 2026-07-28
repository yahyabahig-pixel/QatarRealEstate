import { useEffect, useRef, useState } from 'react'
import { loadMapbox, MAPBOX_TOKEN, MAP_STYLE } from '../lib/mapbox'
import { forwardGeocode, reverseGeocode, QATAR_CENTER, QATAR_MAX_BOUNDS, QATAR_ZOOM } from '../lib/geo'
import { IconPin, IconSearch } from './icons'
import { Spinner } from '../admin/adminUi'

// ---------------------------------------------------------------------------------------
// Reusable location selector for the Add/Edit Property forms.
//
//   value    = { x, y, country, city, street, state, description }   (x=lng, y=lat, strings)
//   onChange = (patch) => void   -- partial updates, parent merges into its form state
//
// The user NEVER types coordinates. They search or click; the marker is draggable; every
// placement reverse-geocodes and auto-fills country/city/street/state/description. Only
// State stays editable, per business rules. Coordinates live in hidden form state.
// ---------------------------------------------------------------------------------------
export default function LocationPicker({ value = {}, onChange, variant = 'dark' }) {
  // One picker, two skins: 'dark' for the admin panel, 'light' for public pages.
  const L = variant === 'light'
  const C = {
    input: L ? 'field !pl-10' : 'field-dark !pl-10',
    dropdown: L ? 'absolute z-20 mt-1 w-full card !rounded-lg shadow-xl overflow-hidden'
                : 'absolute z-20 mt-1 w-full panel-dark !rounded-lg shadow-2xl shadow-black/50 overflow-hidden',
    option: L ? 'w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-gold transition-colors flex items-center gap-2'
              : 'w-full text-left px-4 py-2.5 text-sm text-neutral-200 hover:bg-white/8 hover:text-gold transition-colors flex items-center gap-2',
    mapBox: L ? 'h-[340px] rounded-xl overflow-hidden border border-neutral-200'
              : 'h-[340px] rounded-xl overflow-hidden border border-white/10',
    panel: L ? 'rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3'
             : 'rounded-xl border border-white/8 bg-white/4 px-4 py-3',
    rowDivider: L ? 'flex justify-between gap-3 py-1.5 border-b border-neutral-200 text-sm'
                  : 'flex justify-between gap-3 py-1.5 border-b border-white/6 text-sm',
    rowValue: L ? 'text-neutral-800 text-right truncate' : 'text-neutral-200 text-right truncate',
    picked: L ? 'text-neutral-800 truncate' : 'text-neutral-200 truncate',
    stateInput: L ? 'field !w-auto !py-1 !px-2.5 text-right max-w-[220px]'
                  : 'field-dark !w-auto !py-1 !px-2.5 text-right max-w-[220px]',
    fallback: L ? 'rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500'
                : 'rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-neutral-400',
  }
  const v = { x: '', y: '', country: 'Qatar', city: '', street: '', state: '', description: '', ...value }
  const hasPoint = v.x !== '' && v.y !== '' && Number.isFinite(+v.x) && Number.isFinite(+v.y)

  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const cbRef = useRef(onChange)
  cbRef.current = onChange

  const [failed, setFailed] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchSeq = useRef(0)

  // ---- point placement (single path for click, drag and search) -------------------------
  const placeMarker = (lng, lat) => {
    const mapboxgl = window.mapboxgl
    const map = mapRef.current
    if (!mapboxgl || !map) return
    if (markerRef.current) { markerRef.current.setLngLat([lng, lat]); return }
    const el = document.createElement('div')
    el.className = 'qre-marker'
    el.style.cursor = 'grab'
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 2.5 11h2.6v9h5.1v-5.4h3.6V20h5.1v-9h2.6L12 3z"/></svg>'
    const marker = new mapboxgl.Marker({ element: el, anchor: 'center', draggable: true })
      .setLngLat([lng, lat]).addTo(map)
    marker.on('dragend', () => {
      const p = marker.getLngLat()
      setPoint(p.lng, p.lat, { fly: false })
    })
    markerRef.current = marker
  }

  const setPoint = async (lng, lat, { fly = true } = {}) => {
    placeMarker(lng, lat)
    if (fly) mapRef.current?.flyTo({ center: [lng, lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 700 })
    // Coordinates land immediately -- X IS LONGITUDE, Y IS LATITUDE -- so a save right
    // after the click is already correct even if reverse geocoding is still in flight.
    cbRef.current?.({ x: lng.toFixed(6), y: lat.toFixed(6), lat: +lat.toFixed(6), lng: +lng.toFixed(6) })
    setResolving(true)
    try {
      const info = await reverseGeocode(lng, lat)
      if (info) cbRef.current?.(info)   // country/city/street/state/description
    } catch { /* address lookup failed -- coordinates are already saved, admin can fill State */ }
    finally { setResolving(false) }
  }

  // ---- map bootstrap (once) -------------------------------------------------------------
  useEffect(() => {
    if (!MAPBOX_TOKEN) { setFailed(true); return }
    let cancelled = false
    loadMapbox()
      .then(mapboxgl => {
        if (cancelled || !containerRef.current || mapRef.current) return
        mapboxgl.accessToken = MAPBOX_TOKEN
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: hasPoint ? [+v.x, +v.y] : QATAR_CENTER,
          zoom: hasPoint ? 15 : QATAR_ZOOM,
          maxBounds: QATAR_MAX_BOUNDS,
        })
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
        map.on('error', (e) => {
          const status = e?.error?.status
          if ((status === 401 || status === 403 || !map.loaded()) && !cancelled) setFailed(true)
        })
        map.on('click', (e) => setPoint(e.lngLat.lng, e.lngLat.lat, { fly: false }))
        mapRef.current = map
        if (hasPoint) placeMarker(+v.x, +v.y)   // editing: show the saved location
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      markerRef.current?.remove(); markerRef.current = null
      mapRef.current?.remove(); mapRef.current = null
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ---- search (debounced, Qatar-only) ---------------------------------------------------
  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const seq = ++searchSeq.current
    const t = setTimeout(async () => {
      try {
        const found = await forwardGeocode(query)
        if (seq === searchSeq.current) setResults(found)
      } catch { if (seq === searchSeq.current) setResults([]) }
      finally { if (seq === searchSeq.current) setSearching(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  const pickResult = (r) => {
    setQ(r.name)
    setResults([])
    setPoint(r.lng, r.lat, { fly: true })
  }

  if (failed) {
    return (
      <div className={C.fallback}>
        Map unavailable — {MAPBOX_TOKEN ? 'Mapbox could not be loaded.' : 'VITE_MAPBOX_TOKEN is not set.'}
      </div>
    )
  }

  const row = (label, val) => (
    <div className={C.rowDivider}>
      <span className="text-neutral-500">{label}</span>
      <span className={C.rowValue}>{val || '—'}</span>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* search */}
      <div className="relative">
        <IconSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
        <input
          className={C.input}
          placeholder="Search a city, area, street or building… (e.g. West Bay, Doha)"
          value={q}
          onChange={e => setQ(e.target.value)}
          aria-label="Search for a location"
        />
        {(results.length > 0 || searching) && (
          <div className={C.dropdown}>
            {searching && <div className="px-4 py-2.5 text-xs text-neutral-500">Searching…</div>}
            {results.map(r => (
              <button key={r.id} type="button" onClick={() => pickResult(r)}
                className={C.option}>
                <IconPin className="w-3.5 h-3.5 shrink-0 text-gold" />
                <span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* map */}
      <div ref={containerRef} className={C.mapBox} />

      {/* selected location summary — no raw coordinate inputs, ever */}
      <div className={C.panel}>
        <div className="flex items-center gap-2 text-sm mb-1.5">
          <IconPin className="w-4 h-4 text-gold shrink-0" />
          {hasPoint
            ? <span className={C.picked}>{v.description || 'Location selected'}</span>
            : <span className="text-neutral-500">Click the map or search above to set the property location.</span>}
          {resolving && <span className="ml-auto text-xs text-gold flex items-center gap-1.5 shrink-0"><Spinner /> Fetching address…</span>}
        </div>
        {hasPoint && (
          <>
            {row('Country', v.country)}
            {row('City', v.city)}
            {row('Street', v.street)}
            <label className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="text-neutral-500 shrink-0">State <span className="text-[10px] text-neutral-600">(editable)</span></span>
              <input
                className={C.stateInput}
                value={v.state}
                onChange={e => cbRef.current?.({ state: e.target.value })}
                placeholder="e.g. Baladiyat ad Dawhah"
              />
            </label>
          </>
        )}
      </div>
    </div>
  )
}
