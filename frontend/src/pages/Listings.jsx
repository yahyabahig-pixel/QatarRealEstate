import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import PropertyCard from '../components/PropertyCard'
import MapListingCard from '../components/MapListingCard'
import ListingsMap from '../components/ListingsMap'
import { Breadcrumb, EmptyState } from '../components/ui'
import { IconHeart, IconList, IconMap, IconSliders } from '../components/icons'
import { AgentsStrip, RecentlyViewed } from '../components/misc'
import { PROPERTY_TYPES, AMENITIES } from '../data/mockData'
import { MOCK_MODE } from '../api/client'
import { publicApi } from '../api/realEstateApi'

// FAQ copy lives in the dictionaries (listings.faq.q1/a1 … q8/a8).
const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7, 8]

// The /api/properties/map endpoint REQUIRES a viewport, but the very first fetch happens
// before the map exists and therefore before there are real bounds to send. Qatar's national
// bounding box is the honest answer to "everything" here.
const QATAR_BOUNDS = { minLat: 24.4, maxLat: 26.25, minLng: 50.65, maxLng: 51.75 }

export default function Listings({ purpose, offMarket = false }) {
  const { properties, propertyTypes, areas } = useData()
  const { t, typeLabel } = useI18n()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const perPage = 6

  // ---- split-view state ---------------------------------------------------
  const [showMap, setShowMap] = useState(!offMarket)   // booking-style: map-first on buy/rent
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
    return PROPERTY_TYPES.map(pt => [pt, counts[pt] || 0]).filter(([, c]) => c > 0)
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
    const hit = (propertyTypes || []).find(pt => pt.name === f.type)
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
        setMapError(err?.message || t('listings.mapLoadError'))
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
    const filtered = remoteItems.filter(it =>
      (!q || `${it.title} ${it.area}`.toLowerCase().includes(q)) &&
      (!f.beds || (it.beds ?? 0) >= +f.beds) &&
      (!f.minSize || (it.sizeM2 || 0) >= +f.minSize) &&
      (!f.maxSize || (it.sizeM2 || 0) <= +f.maxSize)
    )
    // Price sorting over the COMPLETE viewport result set (the map endpoint returns every
    // matching pin, not a page), so sorting client-side here is accurate. "Price on
    // request" (null) always sinks to the end. The map DTO carries no timestamp, so
    // "Newest first" keeps the endpoint's own order.
    if (sort === 'priceAsc') return [...filtered].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    if (sort === 'priceDesc') return [...filtered].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))
    return filtered
  }, [results, remoteItems, f.q, f.beds, f.minSize, f.maxSize, sort])

  const selectFromPin = (id) => {
    setActiveId(id)
    if (!id) return
    const node = listRef.current?.querySelector(`[data-pid="${id}"]`)
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  // Map mode is a screen-contained browsing view: the list scrolls inside its own pane
  // and the map must stay on screen. The global footer/CTA band below would let the page
  // scroll the map away, so they are hidden (via body attribute + CSS) while it is active.
  useEffect(() => {
    if (!showMap) return
    document.body.dataset.mapView = '1'
    return () => { delete document.body.dataset.mapView }
  }, [showMap])

  const togglePane = (next) => {
    setPane(next)
    // The map pane was display:none, so Mapbox measured a 0x0 canvas. It needs a resize()
    // once it is actually on screen or the tiles render as a grey box.
    if (next === 'map') setResizeTick(t => t + 1)
  }

  const pageItems = results.slice((page - 1) * perPage, page * perPage)
  const pages = Math.max(1, Math.ceil(results.length / perPage))
  const shownCount = showMap ? mapItems.length : results.length
  const title = offMarket
    ? t('listings.titleOffMarket', { n: results.length })
    : t(purpose === 'rent' ? 'listings.titleRentCount' : 'listings.titleSaleCount', { n: shownCount.toLocaleString() })

  return (
    <div className="pt-16">
      {/* top bar */}
      <div className="border-b border-neutral-200 bg-white sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 text-sm">
          {/* Off-market prices are blurred on the cards; a price pin would leak them. */}
          {!offMarket && (
            <button
              className={`btn-outline !py-1.5 ${showMap ? '!border-primary !text-primary' : ''}`}
              aria-pressed={showMap}
              onClick={() => { setShowMap(s => !s); setPane('list'); setActiveId(null) }}>
              {showMap ? <><IconList className="w-4 h-4" /> {t('listings.list')}</> : <><IconMap className="w-4 h-4" /> {t('listings.map')}</>}
            </button>
          )}
          <button className={`btn-outline !py-1.5 ${filtersOpen ? '!border-primary !text-primary' : ''}`} onClick={() => setFiltersOpen(o => !o)}><IconSliders className="w-4 h-4" /> {t('listings.filters')}</button>
          <button className="btn-outline !py-1.5 hidden md:inline-flex"><IconHeart className="w-4 h-4" /> {t('listings.saveSearch')}</button>
          <select value={sort} onChange={e => setSort(e.target.value)} className="ms-auto field !w-auto !py-1.5">
            <option value="newest">{t('listings.sortNewest')}</option>
            <option value="priceAsc">{t('listings.sortPriceAsc')}</option>
            <option value="priceDesc">{t('listings.sortPriceDesc')}</option>
          </select>
        </div>
      </div>

      {/* filters drawer — shared by both layouts */}
      {filtersOpen && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="card !rounded-2xl !bg-white p-5 grid md:grid-cols-4 gap-4 text-sm">
            {/* Area dropdown (was free text) — same real-areas list as the home search;
                the picked name rides the same ?q= URL param the results already filter by. */}
            <select className="field" value={f.q} onChange={e => setF('q', e.target.value)}>
              <option value="">{t('home.allAreas')}</option>
              {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <select className="field" value={f.beds} onChange={e => setF('beds', e.target.value)}>
              <option value="">{t('listings.bedroomsAny')}</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
            <select className="field" value={f.baths} onChange={e => setF('baths', e.target.value)}>
              <option value="">{t('listings.bathroomsAny')}</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
            <select className="field" value={f.furnishing} onChange={e => setF('furnishing', e.target.value)}>
              <option value="">{t('listings.furnishingAny')}</option>
              {/* values stay English (they match stored data); only the visible label localizes */}
              {[['Furnished', t('listings.furnished')], ['Semi-furnished', t('listings.semiFurnished')], ['Unfurnished', t('listings.unfurnished')], ['Fitted', t('listings.fitted')]].map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
            </select>
            <input placeholder={t('listings.minPrice')} type="number" className="field" value={f.minPrice} onChange={e => setF('minPrice', e.target.value)} />
            <input placeholder={t('listings.maxPrice')} type="number" className="field" value={f.maxPrice} onChange={e => setF('maxPrice', e.target.value)} />
            <input placeholder={t('listings.minSize')} type="number" className="field" value={f.minSize} onChange={e => setF('minSize', e.target.value)} />
            <input placeholder={t('listings.maxSize')} type="number" className="field" value={f.maxSize} onChange={e => setF('maxSize', e.target.value)} />
            <div className="md:col-span-4 flex flex-wrap gap-2 pt-1">
              {AMENITIES.slice(0, 12).map(a => (
                <label key={a} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${f.amenities.includes(a) ? 'bg-primary text-white border-primary' : 'border-neutral-300'}`}>
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
                  {k === 'list' ? <><IconList className="w-4 h-4" /> {t('listings.listCount', { n: mapItems.length })}</> : <><IconMap className="w-4 h-4" /> {t('listings.map')}</>}
                </button>
              ))}
            </div>
          </div>

          <div className="qre-split">
            <div ref={listRef} className={`qre-split-list ${pane === 'map' ? 'hidden lg:block' : ''}`}>
              <div className="p-4">
                {/* Compact results header: title + real backend count, no wasted height. */}
                <h1 className="h-serif text-lg leading-tight">
                  {t(purpose === 'rent' ? 'listings.titleRent' : 'listings.titleSale')}
                </h1>
                <p className="text-[13px] text-neutral-500 mt-0.5 mb-3.5">
                  {mapItems.length === 1 ? t('listings.foundOne') : t('listings.foundMany', { n: mapItems.length.toLocaleString() })}
                </p>
                {mapError && (
                  <p className="text-xs text-red-600 mb-3">{mapError} {t('listings.mapErrorSuffix')}</p>
                )}
                {mapLoading && <p className="text-xs text-neutral-500 mb-3">{t('listings.loadingListings')}</p>}
                {mapItems.length === 0 && !mapLoading
                  ? <EmptyState message={t('listings.mapEmpty')} />
                  : (
                    <div className="qre-grid stagger-fade">
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

            <div className={`h-full min-h-[360px] ${pane === 'list' ? 'hidden lg:block' : ''}`}>
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
            <Breadcrumb items={[{ label: t('common.home'), to: '/' }, { label: purpose === 'rent' ? t('common.rent') : t('common.buy'), to: `/${purpose}` }, { label: t('common.qatar') }]} />
            <h1 className="h-serif text-3xl md:text-4xl mt-3 mb-6">{title}</h1>

            {offMarket && (
              <p className="max-w-2xl text-neutral-600 mb-6 text-sm">
                {t('listings.offMarketIntro')}
              </p>
            )}

            {/* type chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-6">
              <button onClick={() => setF('type', '')}
                className={`chip ${!f.type ? 'chip-active' : ''}`}>
                {t('listings.viewAllChip')}
              </button>
              {typeCounts.map(([pt, c]) => (
                <button key={pt} onClick={() => setF('type', f.type === pt ? '' : pt)}
                  className={`chip ${f.type === pt ? 'chip-active' : ''}`}>
                  {typeLabel(pt)} ({c})
                </button>
              ))}
            </div>

            {/* results */}
            {pageItems.length === 0
              ? <EmptyState message={t('listings.emptyFiltered')} />
              : <div className="space-y-6 stagger-fade">{pageItems.map(p => <PropertyCard key={p.id} p={p} wide blurPrice={offMarket} />)}</div>}

            {/* pagination */}
            <div className="flex items-center justify-between mt-8 text-sm text-neutral-600">
              <span>{t('listings.showingResults', { from: results.length === 0 ? 0 : (page - 1) * perPage + 1, to: Math.min(page * perPage, results.length), n: results.length })}</span>
              <div className="flex gap-1">
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${page === i + 1 ? 'bg-ink text-white border-ink' : 'bg-white border-neutral-300 hover:border-primary hover:text-primary'}`}>{i + 1}</button>
                ))}
              </div>
            </div>

            {/* SEO content */}
            {!offMarket && (
              <div className="mt-16 max-w-3xl space-y-10 text-sm leading-relaxed text-neutral-700">
                <div>
                  <h2 className="h-serif text-2xl mb-3">{t(purpose === 'rent' ? 'listings.whyRent' : 'listings.whyBuy')}</h2>
                  <p>{t('listings.whyBody')}</p>
                  <ul className="list-disc ps-5 mt-3 space-y-1">
                    <li>{t('listings.whyPoint1')}</li>
                    <li>{t('listings.whyPoint2')}</li>
                    <li>{t('listings.whyPoint3')}</li>
                  </ul>
                </div>
                <div>
                  <h2 className="h-serif text-2xl mb-3">{t('listings.financing')}</h2>
                  <p>{t('listings.financingBody')}</p>
                </div>
                <div>
                  <h2 className="h-serif text-2xl mb-4">{t('listings.faqTitle')}</h2>
                  <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-2xl overflow-hidden bg-white">
                    {FAQ_KEYS.map(i => (
                      <details key={i} className="group p-4">
                        <summary className="cursor-pointer font-medium list-none flex justify-between items-center">{t(`listings.faq.q${i}`)}<span className="text-primary group-open:rotate-45 transition-transform">+</span></summary>
                        <p className="mt-2 text-neutral-600">{t(`listings.faq.a${i}`)}</p>
                      </details>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="h-serif text-2xl mb-3">{t(purpose === 'rent' ? 'listings.searchByBedrooms' : 'listings.searchByType')}</h2>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {/* These were <span>s: styled and cursor-pointer'd like links, but not
                        links at all, and the counts were hardcoded (1, 2, 2, 1, 1) rather
                        than measured. Now real <Link>s into this same route's own filters,
                        with counts derived from `pool`.

                        Bedroom labels read "N+" because Listings' beds filter is
                        `p.bedrooms >= beds` — a minimum, not an exact match. Studio cannot
                        use beds at all (beds=0 is truthy as a string, so the filter would
                        match everything), so it searches the title instead, which is where
                        "Studio" actually lives. */}
                    {(purpose === 'rent'
                      ? [
                          [t('listings.studioRentals'), '?q=Studio', pool.filter(p => p.bedrooms === 0).length],
                          [t('listings.nPlusBedroomRentals', { n: 1 }), '?beds=1', pool.filter(p => p.bedrooms >= 1).length],
                          [t('listings.nPlusBedroomRentals', { n: 2 }), '?beds=2', pool.filter(p => p.bedrooms >= 2).length],
                          [t('listings.nPlusBedroomRentals', { n: 3 }), '?beds=3', pool.filter(p => p.bedrooms >= 3).length],
                          [t('listings.nPlusBedroomRentals', { n: 4 }), '?beds=4', pool.filter(p => p.bedrooms >= 4).length],
                        ]
                      : typeCounts.map(([pt, c]) => [t('listings.typesForSale', { type: typeLabel(pt) }), `?type=${encodeURIComponent(pt)}`, c])
                    ).filter(([, , c]) => c > 0)
                     .map(([lbl, qs, c]) => (
                       <Link key={lbl} to={`/${purpose}${qs}`} className="brand-link text-primary">{lbl} ({c})</Link>
                     ))}
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
