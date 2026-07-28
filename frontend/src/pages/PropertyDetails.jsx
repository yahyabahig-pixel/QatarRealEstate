import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import PropertyCard from '../components/PropertyCard'
import { Breadcrumb, SectionHeading, fmtPrice, WhatsAppIcon, Star } from '../components/ui'
import { InquiryForm, RecentlyViewed } from '../components/misc'
import { MOCK_MODE } from '../api/client'
import { publicApi } from '../api/realEstateApi'

export default function PropertyDetails() {
  const { id } = useParams()
  const { properties, agents, areas, areaCount, trackView } = useData()
  const [lightbox, setLightbox] = useState(null)
  const [showAllAmenities, setShowAllAmenities] = useState(false)
  const [showInquiry, setShowInquiry] = useState(false)

  // LIVE MODE: the list slice only holds thin search cards (no description, media set,
  // or amenities — the backend keeps the list query to one SQL row per card), so this
  // page fetches the full record from GET /api/properties/{id}. MOCK MODE: the seed
  // objects are already complete, so the store lookup is enough.
  const [fetched, setFetched] = useState(null)
  const [related, setRelated] = useState([])
  const [loadState, setLoadState] = useState(MOCK_MODE ? 'done' : 'loading')

  const p = MOCK_MODE ? properties.find(x => x.id === id) : fetched

  useEffect(() => {
    window.scrollTo(0, 0)
    if (MOCK_MODE) return
    let on = true
    setFetched(null); setRelated([]); setLoadState('loading')
    publicApi.propertyDetails(id)
      .then(d => { if (on) { setFetched(d); setLoadState('done') } })
      .catch(() => { if (on) setLoadState('error') })
    publicApi.relatedProperties(id).then(r => { if (on) setRelated(r) }).catch(() => {})
    return () => { on = false }
  }, [id])

  useEffect(() => { if (p) trackView(p.id) }, [p?.id])

  const agent = agents.find(a => a.id === p?.agentId)
  const areaObj = areas.find(a => a.name === p?.area)
  const similar = useMemo(() => MOCK_MODE
    ? properties.filter(x => x.id !== id && x.area === p?.area && x.status === 'available').slice(0, 4)
    : related,
    [properties, id, p?.area, related])

  if (!MOCK_MODE && loadState === 'loading') return (
    <div className="pt-32 pb-20 text-center text-neutral-400">Loading listing…</div>
  )

  if (!p) return (
    <div className="pt-32 pb-20 text-center">
      <h1 className="h-serif text-3xl mb-4">Listing not found</h1>
      <Link to="/buy" className="btn-gold">Browse properties</Link>
    </div>
  )

  const allAmenities = p.amenities || []
  const amenities = showAllAmenities ? allAmenities : allAmenities.slice(0, 6)
  const images = p.images?.length ? p.images : ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="500"%3E%3Crect fill="%23e5e5e5" width="800" height="500"/%3E%3C/svg%3E']
  const info = [
    ['Reference No.', p.referenceNo], ['Type', p.type || '—'], ['Purpose', p.purpose === 'rent' ? 'For Rent' : 'For Sale'],
    ['Added on', p.addedOn || '—'], ['Bedrooms', p.type === 'Land' ? '—' : (p.bedrooms === 0 ? 'Studio' : p.bedrooms)],
    ['Bathrooms', p.type === 'Land' ? '—' : p.bathrooms], ['Unit Size', `${(p.sizeSqm || 0).toLocaleString()} sqm`],
    ['Furnishing', p.furnishing || '—'], ['Parking', p.parking ?? '—'], ['Balcony', p.balcony ? 'Yes' : 'No'],
  ]

  return (
    <div className="pt-20">
      {/* GALLERY */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="relative grid md:grid-cols-[2fr_1fr] gap-2">
          <img src={images[0]} alt={p.title} onClick={() => setLightbox(0)}
            className="w-full h-[420px] object-cover cursor-pointer" />
          <div className="hidden md:grid grid-rows-2 gap-2">
            {images.slice(1, 3).map((img, i) => (
              <img key={i} src={img} alt="" onClick={() => setLightbox(i + 1)} className="w-full h-full max-h-[206px] object-cover cursor-pointer" />
            ))}
          </div>
          <button onClick={() => setLightbox(0)} className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 text-sm hover:bg-black">
            🖼 Gallery ({images.length})
          </button>
          <div className="absolute top-4 right-4 flex gap-2">
            <button className="bg-white/90 w-9 h-9 flex items-center justify-center hover:text-gold" title="Share">↗</button>
            <button className="bg-white/90 w-9 h-9 flex items-center justify-center hover:text-gold" title="Bookmark">♡</button>
          </div>
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button className="absolute top-6 right-6 text-white text-2xl" aria-label="Close">✕</button>
          <button onClick={e => { e.stopPropagation(); setLightbox(i => (i - 1 + images.length) % images.length) }}
            className="absolute left-6 text-white text-4xl">‹</button>
          <img src={images[lightbox]} alt="" className="max-h-[85vh] max-w-[85vw] object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={e => { e.stopPropagation(); setLightbox(i => (i + 1) % images.length) }}
            className="absolute right-6 text-white text-4xl">›</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_360px] gap-10">
        <div>
          <Breadcrumb items={[
            { label: 'Home', to: '/' }, { label: p.purpose === 'rent' ? 'Rent' : 'Buy', to: `/${p.purpose}` },
            ...(p.area ? [{ label: p.area, to: areaObj ? `/areas/${areaObj.slug}` : undefined }] : []),
            { label: p.referenceNo },
          ]} />
          <h1 className="h-serif text-3xl md:text-4xl mt-3 mb-6">{p.title}</h1>

          {/* PROPERTY INFORMATION */}
          <h2 className="eyebrow mb-3">Property Information</h2>
          <div className="grid sm:grid-cols-2 border border-neutral-200 text-sm mb-10">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 odd:bg-neutral-50 border-b border-neutral-100">
                <span className="text-neutral-500">{k}</span><span className="font-medium">{v}</span>
              </div>
            ))}
          </div>

          {/* DESCRIPTION */}
          <h2 className="eyebrow mb-3">Description</h2>
          <div className="prose-sm text-neutral-700 leading-relaxed whitespace-pre-line mb-10">
            {(p.description || '').split('\n').map((line, i) =>
              line.endsWith(':') ? <p key={i} className="font-semibold text-ink mt-4">{line}</p> : <p key={i}>{line}</p>)}
          </div>

          {/* AMENITIES */}
          {allAmenities.length > 0 && (
            <>
              <h2 className="eyebrow mb-3">Amenities & Services</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {amenities.map(a => (
                  <span key={a} className="border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm">✦ {a}</span>
                ))}
              </div>
              {allAmenities.length > 6 && (
                <button onClick={() => setShowAllAmenities(s => !s)} className="text-gold text-sm gold-link mb-10">
                  {showAllAmenities ? 'Show less' : `Show all ${allAmenities.length}`}
                </button>
              )}
            </>
          )}

          {/* LOCATION */}
          <h2 className="eyebrow mb-3 mt-6">Location</h2>
          <div className="border border-neutral-200 h-56 bg-neutral-100 flex items-center justify-center relative mb-4">
            <span className="text-neutral-400">🗺 Map placeholder — {[p.district, p.area || p.city].filter(Boolean).join(', ')}</span>
            <button className="absolute bottom-3 right-3 btn-dark !py-1.5 text-xs">View on Map</button>
          </div>
          {areaObj && (
            <Link to={`/areas/${areaObj.slug}`} className="flex items-center gap-4 border border-neutral-200 p-3 lift mb-10">
              <img src={areaObj.photo} alt={areaObj.name} className="w-24 h-16 object-cover" />
              <div>
                <div className="eyebrow !text-[10px]">Discover the area</div>
                <div className="h-serif text-lg">{areaObj.name}</div>
                <div className="text-xs text-neutral-500">{areaCount(areaObj.name)} properties</div>
              </div>
            </Link>
          )}
        </div>

        {/* STICKY SIDEBAR */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          <div className="border border-neutral-200 p-5">
            <div className="text-2xl font-semibold text-gold mb-4">{fmtPrice(p)}</div>
            {agent && (
              <div className="flex items-center gap-3 border-t border-neutral-100 pt-4 mb-4">
                <img src={agent.photo} alt={agent.name} className="w-14 h-14 rounded-full object-cover" />
                <div>
                  <Link to={`/find-agent/${agent.slug}`} className="font-medium hover:text-gold">{agent.name}</Link>
                  <div className="text-xs text-neutral-500">{agent.title}</div>
                  {agent.rating > 0 && <div className="text-xs text-gold flex items-center gap-1"><Star /> {agent.rating.toFixed(1)} · verified reviews</div>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${agent?.phone || ''}`} className="btn-dark !py-2">📞 Call</a>
              <a href={`https://wa.me/${agent?.whatsapp || ''}?text=Regarding ${p.referenceNo}`} target="_blank" rel="noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 text-sm py-2 transition-colors">
                <WhatsAppIcon /> WhatsApp
              </a>
            </div>
            <button onClick={() => setShowInquiry(s => !s)} className="btn-gold w-full mt-2">Submit Inquiry</button>
            {showInquiry && <div className="mt-4"><InquiryForm compact propertyId={p.id} agentId={agent?.id} source="Property inquiry" /></div>}
          </div>
        </aside>
      </div>

      {/* mobile fixed bottom bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink text-white flex items-center justify-between px-4 py-3">
        <span className="text-gold font-semibold text-sm">{fmtPrice(p)}</span>
        <div className="flex gap-2">
          <a href={`tel:${agent?.phone || ''}`} className="btn-gold !py-1.5 text-xs">Call</a>
          <a href={`https://wa.me/${agent?.whatsapp || ''}`} className="bg-green-600 px-3 py-1.5 text-xs flex items-center">WhatsApp</a>
        </div>
      </div>

      {/* SIMILAR */}
      {similar.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <SectionHeading eyebrow={p.area || 'More like this'} title="Similar Properties" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {similar.map(sp => <PropertyCard key={sp.id} p={sp} />)}
          </div>
        </section>
      )}

      <RecentlyViewed />
    </div>
  )
}
