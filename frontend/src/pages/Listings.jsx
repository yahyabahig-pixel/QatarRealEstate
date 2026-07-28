import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import PropertyCard from '../components/PropertyCard'
import MapListingCard from '../components/MapListingCard'
import ListingsMap from '../components/ListingsMap'
import { Breadcrumb, EmptyState } from '../components/ui'
import { IconHeart, IconList, IconMap, IconSliders } from '../components/icons'
import { AgentsStrip, RecentlyViewed } from '../components/misc'
import { PROPERTY_TYPES, AMENITIES } from '../data/mockData'
import { MOCK_MODE } from '../api/client'
import { publicApi } from '../api/realEstateApi'

const FAQ = [
  ['Can foreigners buy property in Qatar?', 'Yes — freehold ownership is open to all nationalities in designated zones including The Pearl, Lusail Marina District, West Bay Lagoon and Qetaifan Island. A 99-year renewable leasehold applies in many additional areas.'],
  ['Does buying property grant residency?', 'Property valued above QAR 730,000 qualifies the owner for renewable residency; above QAR 3.65 million qualifies for the long-term golden residency tier, both extendable to family members.'],
  ['What fees should buyers budget for?', 'Registration at the Ministry of Justice is roughly 1.25% of the sale value in freehold zones, plus agency fees per market norms.'],
  ['Are rental prices negotiable?', 'Often, especially on annual contracts paid with fewer cheques. Your agent will advise on realistic negotiation room per building.'],
  ['What documents do I need to rent?', 'A QID (or passport for new arrivals), and typically one month deposit. Corporate leases need trade licence copies.'],
  ['How fast can a purchase complete?', 'A cash purchase in a freehold zone can complete in under two weeks once documents are ready.'],
  ['Is off-plan safe in Qatar?', 'Off-plan projects by escrow-backed developers offer staged payment security; we list only vetted developers.'],
  ['Can I get a mortgage as a non-resident?', 'Several Qatari banks lend to non-residents on freehold property, typically up to 70% loan-to-value.'],
]

// The /api/properties/map endpoint REQUIRES a viewport, but the very first fetch happens
// before the map exists and therefore before there are real bounds to send. Qatar's national
// bounding box is the honest answer to "everything" here.
const QATAR_BOUNDS = { minLat: 24.4, maxLat: 26.25, minLng: 50.65, maxLng: 51.75 }

export default function Listings({ purpose, offMarket = false }) {
  const { properties, propertyTypes } = useData()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const perPage = 6

  // ---- split-view state ---------------------------------------------------
  const [showMap, setShowMap] = useState(false)
  const [pane, setPane] = useState('list')          // mobile only: which half is on screen
  const [activeId, setActiveId] = useState(null)
  const [bounds, setBounds] = useState(null)        // null => QATAR_BOUNDS
  const [remoteItems, setRemoteItems] = useState([])
  const [mapLoading, setMapLoading] = useState(false)
  const [mapError, setMapError] = useState('')
  const [resizeTick, setResizeTick] = useState(0)
  const listRef = useRef(null)

  const f = {
    q: params.get('q') || '', type: params.get('type') || '',
    beds: params.get('beds') || '', baths: params.get('baths') || '',
    minPrice: params.get('minPrice') || '', maxPrice: params.get('maxPrice') || '',
    minSize: params.get('minSize') || '', maxSize: params.get('maxSize') || '',
    furnishing: params.get('furnishing') || '', amenities: params.getAll('am'),
  }
  const setF = (k, v) => {
    const next = new URLSearchParams(params)
    if (v === '' || v == null) next.delete(k); else next.set(k, v)
    setParams(next, { replace: true }); setPage(1)
  }
  const toggleAmenity = (a) => {
    const next = new URLSearchParams(params)
    const cur = next.getAll('am')
    next.delete('am')
    ;(cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a]).forEach(x => next.append('am', x))
    setParams(next, { replace: true }); setPage(1)
  }

  const pool = useMemo(() => properties.filter(p =>
    p.purpose === purpose &&
    (offMarket ? true : p.status === 'available') &&
    (offMarket ? p.exclusive : true)
  ), [properties, purpose, offMarket])

  const typeCounts = useMemo(() => {
    const counts = {}
    pool.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1 })
    return PROPERTY_TYPES.map(t => [t, counts[t] || 0]).filter(([, c]) => c > 0)
  }, [pool])

  const results = useMemo(() => {
    let r = pool.filter(p =>
      (!f.q || `${p.title} ${p.area} ${p.district} ${p.city}`.toLowerCase().includes(f.q.toLowerCase())) &&
      (!f.type || p.type === f.type) &&
      (!f.beds || p.bedrooms >= +f.beds) &&
      (!f.baths || p.bathrooms >= +f.baths) &&
      (!f.minPrice || p.priceOnRequest || p.price >= +f.minPrice) &&
      (!f.maxPrice || p.priceOnRequest || p.price <= +f.maxPrice) &&
      (!f.minSize || p.sizeSqm >= +f.minSize) &&
      (!f.maxSize || p.sizeSqm <= +f.maxSize) &&
      (!f.furnishing || p.furnishing === f.furnishing) &&
      (f.amenities.length === 0 || f.amenities.every(a => p.amenities.includes(a)))
    )
    if (sort === 'priceAsc') r = [...r].sort((a, b) => a.price - b.price)
    if (sort === 'priceDesc') r = [...r].sort((a, b) => b.price - a.price)
    if (sort === 'newest') r = [...r].sort((a, b) => b.addedOn.localeCompare(a.addedOn))
    return r
  }, [pool, f.q, f.type, f.beds, f.baths, f.minPrice, f.maxPrice, f.minSize, f.maxSize, f.furnishing, f.amenities, sort])

  // The chips carry a type NAME; the API wants the catalog id. DataContext exports the
  // catalog itself, so the lookup happens here rather than adding a second export.
  const propertyTypeId = useMemo(() => {
    if (!f.type) return undefined
    const hit = (propertyTypes || []).find(t => t.name === f.type)
    return hit?.id
  }, [f.type, propertyTypes])

  const listingKind = purpose === 'rent' ? 'Rent' : 'Sale'

  // ---- live-mode pin fetch -----------------------------------------------
  // The search DTO carries no coordinates at all, so in live mode the pins CANNOT come
  // from `properties` -- they have to come from the dedicated map endpoint.
  useEffect(() => {
    if (!showMap || MOCK_MODE) return
    let cancelled = false
    const view = bounds || QATAR_BOUNDS
    setMapLoading(true)
    publicApi.propertiesForMap({
      ...view,
      listingKind,
      propertyTypeId,
      minPrice: f.minPrice || undefined,
      maxPrice: f.maxPrice || undefined,
      take: 500,
    })
      .then(items => {
        if (cancelled) return
        setRemoteItems(items)
        setMapError('')
      })
      .catch(err => {
        if (cancelled) return
        // Deliberately NOT clearing remoteItems: a failed refresh must not wipe the pins
        // the user is currently looking at. Last good result stays, error shows alongside.
        setMapError(err?.message || 'Could not load map results.')
      })
      .finally(() => { if (!cancelled) setMapLoading(false) })
    return () => { cancelled = true }
  }, [showMap, bounds, listingKind, propertyTypeId, f.minPrice, f.maxPrice])

  // ---- what the map and the split list actually render ---------------------
  const mapItems = useMemo(() => {
    if (MOCK_MODE) {
      return results.map(p => ({
        id: p.id,
        title: p.title,
        area: p.area || p.city || '',
        price: p.priceOnRequest ? null : p.price,
        currency: p.currency || 'QAR',
        beds: p.bedrooms ?? 0,
        bathrooms: p.bathrooms ?? 0,
        type: p.type || '',
        sizeM2: p.sizeSqm || 0,
        lat: p.lat,
        lng: p.lng,
        thumbUrl: p.images?.[0] || '',
        isExclusive: !!p.exclusive,
        isOffPlan: !!p.offPlan,
      }))
    }
    // The map endpoint filters by viewport, kind, type and price. Everything else the
    // filter drawer offers is applied here so the two panes never disagree.
    const q = f.q.trim().toLowerCase()
    return remoteItems.filter(it =>
      (!q || `${it.title} ${it.area}`.toLowerCase().includes(q)) &&
      (!f.beds || (it.beds ?? 0) >= +f.beds) &&
      (!f.minSize || (it.sizeM2 || 0) >= +f.minSize) &&
      (!f.maxSize || (it.sizeM2 || 0) <= +f.maxSize)
    )
  }, [results, remoteItems, f.q, f.beds, f.minSize, f.maxSize])

  const selectFromPin = (id) => {
    setActiveId(id)
    if (!id) return
    const node = listRef.current?.querySelector(`[data-pid="${id}"]`)
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const togglePane = (next) => {
    setPane(next)
    // The map pane was display:none, so Mapbox measured a 0x0 canvas. It needs a resize()
    // once it is actually on screen or the tiles render as a grey box.
    if (next === 'map') setResizeTick(t => t + 1)
  }

  const pageItems = results.slice((page - 1) * perPage, page * perPage)
  const pages = Math.max(1, Math.ceil(results.length / perPage))
  const label = purpose === 'rent' ? 'rent' : 'sale'
  const shownCount = showMap ? mapItems.length : results.length
  const title = offMarket
    ? `Off-market opportunities — ${results.length} listings`
    : `Properties for ${label} in Qatar — ${shownCount.toLocaleString()} listings`

  return (
    <div className="pt-16">
      {/* top bar */}
      <div className="border-b border-neutral-200 bg-white sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 text-sm">
          {/* Off-market prices are blurred on the cards; a price pin would leak them. */}
          {!offMarket && (
            <button
              className={`btn-outline !py-1.5 ${showMap ? '!border-gold !text-gold' : ''}`}
              aria-pressed={showMap}
              onClick={() => { setShowMap(s => !s); setPane('list'); setActiveId(null) }}>
              {showMap ? <><IconList className="w-4 h-4" /> List</> : <><IconMap className="w-4 h-4" /> Map</>}
            </button>
          )}
          <button className={`btn-outline !py-1.5 ${filtersOpen ? '!border-gold !text-gold' : ''}`} onClick={() => setFiltersOpen(o => !o)}><IconSliders className="w-4 h-4" /> Filters</button>
          <button className="btn-outline !py-1.5 hidden md:inline-flex"><IconHeart className="w-4 h-4" /> Save search</button>
          <select value={sort} onChange={e => setSort(e.target.value)} className="ml-auto field !w-auto !py-1.5">
            <option value="newest">Newest first</option>
            <option value="priceAsc">Price: low to high</option>
            <option value="priceDesc">Price: high to low</option>
          </select>
        </div>
      </div>

      {/* filters drawer — shared by both layouts */}
      {filtersOpen && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="border border-neutral-200 bg-neutral-50 p-5 grid md:grid-cols-4 gap-4 text-sm">
            <input placeholder="Keyword or area" className="field" value={f.q} onChange={e => setF('q', e.target.value)} />
            <select className="field" value={f.beds} onChange={e => setF('beds', e.target.value)}>
              <option value="">Bedrooms (any)</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
            <select className="field" value={f.baths} onChange={e => setF('baths', e.target.value)}>
              <option value="">Bathrooms (any)</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
            <select className="field" value={f.furnishing} onChange={e => setF('furnishing', e.target.value)}>
              <option value="">Furnishing (any)</option>
              {['Furnished', 'Semi-furnished', 'Unfurnished', 'Fitted'].map(x => <option key={x}>{x}</option>)}
            </select>
            <input placeholder="Min price" type="number" className="field" value={f.minPrice} onChange={e => setF('minPrice', e.target.value)} />
            <input placeholder="Max price" type="number" className="field" value={f.maxPrice} onChange={e => setF('maxPrice', e.target.value)} />
            <input placeholder="Min size m²" type="number" className="field" value={f.minSize} onChange={e => setF('minSize', e.target.value)} />
            <input placeholder="Max size m²" type="number" className="field" value={f.maxSize} onChange={e => setF('maxSize', e.target.value)} />
            <div className="md:col-span-4 flex flex-wrap gap-2 pt-1">
              {AMENITIES.slice(0, 12).map(a => (
                <label key={a} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${f.amenities.includes(a) ? 'bg-gold text-black border-gold' : 'border-neutral-300'}`}>
                  <input type="checkbox" className="hidden" checked={f.amenities.includes(a)} onChange={() => toggleAmenity(a)} />{a}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMap ? (
        <>
          {/* mobile pane switch — the split view collapses to one full-screen half */}
          <div className="lg:hidden border-b border-neutral-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 py-2 flex gap-2 text-sm">
              {['list', 'map'].map(k => (
                <button key={k} onClick={() => togglePane(k)}
                  className={`chip flex-1 text-center justify-center inline-flex items-center gap-1.5 ${pane === k ? 'chip-active' : ''}`}>
                  {k === 'list' ? <><IconList className="w-4 h-4" /> List ({mapItems.length})</> : <><IconMap className="w-4 h-4" /> Map</>}
                </button>
              ))}
            </div>
          </div>

          <div className="qre-split">
            <div ref={listRef} className={`qre-split-list ${pane === 'map' ? 'hidden lg:block' : ''}`}>
              <div className="p-4">
                <h1 className="h-serif text-xl mb-1">{title}</h1>
                {mapError && (
                  <p className="text-xs text-red-600 mb-3">{mapError} Showing the last results loaded.</p>
                )}
                {mapLoading && <p className="text-xs text-neutral-500 mb-3">Loading listings…</p>}
                {mapItems.length === 0 && !mapLoading
                  ? <EmptyState message="No properties in this area. Pan the map or widen your filters." />
                  : (
                    <div className="space-y-4">
                      {mapItems.map(it => (
                        <MapListingCard
                          key={it.id}
                          item={it}
                          purpose={purpose}
                          active={activeId === it.id}
                          onHover={setActiveId}
                        />
                      ))}
                    </div>
                  )}
              </div>
            </div>

            <div className={pane === 'list' ? 'hidden lg:block' : ''}>
              <ListingsMap
                items={mapItems}
                purpose={purpose}
                activeId={activeId}
                searching={mapLoading}
                resizeSignal={resizeTick}
                onHoverPin={setActiveId}
                onSelectPin={selectFromPin}
                onSearchArea={(b) => { setBounds(b); setPage(1) }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: purpose === 'rent' ? 'Rent' : 'Buy', to: `/${purpose}` }, { label: 'Qatar' }]} />
            <h1 className="h-serif text-3xl md:text-4xl mt-3 mb-6">{title}</h1>

            {offMarket && (
              <p className="max-w-2xl text-neutral-600 mb-6 text-sm">
                A private selection our sellers prefer to keep off the open market. Prices are shared
                on request — submit an inquiry and a senior consultant will grant access.
              </p>
            )}

            {/* type chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-6">
              <button onClick={() => setF('type', '')}
                className={`chip ${!f.type ? 'chip-active' : ''}`}>
                View All
              </button>
              {typeCounts.map(([t, c]) => (
                <button key={t} onClick={() => setF('type', f.type === t ? '' : t)}
                  className={`chip ${f.type === t ? 'chip-active' : ''}`}>
                  {t} ({c})
                </button>
              ))}
            </div>

            {/* results */}
            {pageItems.length === 0
              ? <EmptyState message="No properties match these filters yet. Try widening your search." />
              : <div className="space-y-6">{pageItems.map(p => <PropertyCard key={p.id} p={p} wide blurPrice={offMarket} />)}</div>}

            {/* pagination */}
            <div className="flex items-center justify-between mt-8 text-sm text-neutral-600">
              <span>Showing {results.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, results.length)} of {results.length} results</span>
              <div className="flex gap-1">
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${page === i + 1 ? 'bg-ink text-white border-ink' : 'bg-white border-neutral-300 hover:border-gold hover:text-gold'}`}>{i + 1}</button>
                ))}
              </div>
            </div>

            {/* SEO content */}
            {!offMarket && (
              <div className="mt-16 max-w-3xl space-y-10 text-sm leading-relaxed text-neutral-700">
                <div>
                  <h2 className="h-serif text-2xl mb-3">Why {purpose === 'rent' ? 'rent' : 'buy'} in Qatar?</h2>
                  <p>Qatar pairs tax-free income with world-class infrastructure. The freehold market has matured around The Pearl and Lusail, while rentals span the full spectrum from Msheireb studios to beachfront estates.</p>
                  <ul className="list-disc pl-5 mt-3 space-y-1">
                    <li>Freehold zones open to all nationalities — The Pearl, Lusail Marina, West Bay Lagoon, Qetaifan Island</li>
                    <li>99-year renewable leasehold available across many additional districts</li>
                    <li>Residency benefits from QAR 730,000; golden-tier residency from QAR 3.65M</li>
                  </ul>
                </div>
                <div>
                  <h2 className="h-serif text-2xl mb-3">Financing</h2>
                  <p>Local banks finance freehold purchases up to 70–80% for residents and up to 70% for non-residents. Developer payment plans on off-plan units routinely spread 60–90% of the price past handover.</p>
                </div>
                <div>
                  <h2 className="h-serif text-2xl mb-4">Frequently asked questions</h2>
                  <div className="divide-y divide-neutral-200 border border-neutral-200">
                    {FAQ.map(([q, a]) => (
                      <details key={q} className="group p-4">
                        <summary className="cursor-pointer font-medium list-none flex justify-between items-center">{q}<span className="text-gold group-open:rotate-45 transition-transform">+</span></summary>
                        <p className="mt-2 text-neutral-600">{a}</p>
                      </details>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="h-serif text-2xl mb-3">Search by {purpose === 'rent' ? 'bedrooms' : 'property type'}</h2>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {(purpose === 'rent'
                      ? [['Studio rentals', 1], ['1-bedroom rentals', 2], ['2-bedroom rentals', 2], ['3-bedroom rentals', 1], ['4+ bedroom rentals', 1]]
                      : typeCounts.map(([t, c]) => [`${t}s for sale`, c])
                    ).map(([lbl, c]) => <span key={lbl} className="gold-link text-gold cursor-pointer">{lbl} ({c})</span>)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <AgentsStrip />
          <RecentlyViewed />
        </>
      )}
    </div>
  )
}
