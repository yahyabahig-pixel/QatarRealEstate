import { useEffect, useRef, useState } from 'react'
import { loadMapbox, MAPBOX_TOKEN, MAP_STYLE } from '../lib/mapbox'

// ---------------------------------------------------------------------------------------
// The Location block on a property detail page: heading, area label, map, Google Maps link.
//
// It renders NOTHING -- not an empty heading, not a grey box -- when the listing has no
// usable coordinates. The backend already collapses "half a coordinate" to two nulls
// (PropertyDetailsDto.Latitude/Longitude), so one null here means one thing: we do not know
// where this property is, and guessing is worse than staying quiet.
// ---------------------------------------------------------------------------------------
export default function PropertyLocation({ lat, lng, areaLabel, title, approx = false }) {
  const containerRef = useRef(null)
  const [failed, setFailed] = useState(false)

  const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      && lat !== null && lng !== null
  const latitude = Number(lat)
  const longitude = Number(lng)

  useEffect(() => {
    if (!hasCoords || !MAPBOX_TOKEN) return
    let cancelled = false
    let map = null

    loadMapbox()
      .then(mapboxgl => {
        if (cancelled || !containerRef.current) return
        mapboxgl.accessToken = MAPBOX_TOKEN
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [longitude, latitude],
          zoom: approx ? 13 : 15,
        })
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
        map.on('error', (e) => {
          const status = e?.error?.status
          if ((status === 401 || status === 403 || !map.loaded()) && !cancelled) setFailed(true)
        })
        // A map embedded mid-article must not swallow the page scroll. Ctrl/⌘+wheel and the
        // +/- controls still zoom.
        map.scrollZoom.disable()

        // Custom element, so Mapbox's default blue teardrop is never created.
        const el = document.createElement('div')
        el.className = 'qre-marker'
        el.setAttribute('aria-label', title || 'Property location')
        el.innerHTML =
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
          '<path d="M12 3 2.5 11h2.6v9h5.1v-5.4h3.6V20h5.1v-9h2.6L12 3z"/></svg>'
        new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([longitude, latitude])
          .addTo(map)
      })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => { cancelled = true; if (map) map.remove() }
  }, [hasCoords, latitude, longitude, title])

  if (!hasCoords) return null

  return (
    <>
      <h2 className="eyebrow mb-3 mt-6">Location</h2>

      {areaLabel && (
        <div className="flex items-center gap-1.5 mb-3 text-sm" style={{ color: 'var(--muted)' }}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: 'var(--primary)' }} aria-hidden="true">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
          <span>{areaLabel}</span>
        </div>
      )}

      {approx && (
        <p className="text-xs mb-3 -mt-1" style={{ color: 'var(--muted)' }}>
          Approximate area shown — an exact location has not been set for this listing yet.
        </p>
      )}

      {MAPBOX_TOKEN && !failed
        ? <div ref={containerRef} data-lat={latitude} data-lng={longitude} className="qre-detail-map" />
        : (
          <div className="qre-detail-map flex items-center justify-center text-sm"
               style={{ background: '#f5f5f4', color: 'var(--muted)' }}>
            {MAPBOX_TOKEN
              ? 'The map could not be loaded right now.'
              : 'Map unavailable — VITE_MAPBOX_TOKEN is not set for this build.'}
          </div>
        )}

      {approx ? <div className="mb-10" /> : (
        <a href={'https://maps.google.com/?q=' + latitude + ',' + longitude}
           target="_blank" rel="noreferrer"
           className="brand-link text-primary text-sm inline-block mt-3 mb-10">
          View on Google Maps ↗
        </a>
      )}
    </>
  )
}
