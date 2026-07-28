import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { fmtPrice, WhatsAppIcon } from './ui'

// The card used everywhere: grid mode (default) and wide list mode (listings page).
// `blurPrice` supports the off-market page.
export default function PropertyCard({ p, wide = false, blurPrice = false }) {
  const { settings } = useData()
  const [idx, setIdx] = useState(0)
  const to = `/property/${p.purpose}/${p.id}`
  const next = (e) => { e.preventDefault(); setIdx(i => (i + 1) % p.images.length) }
  const prev = (e) => { e.preventDefault(); setIdx(i => (i - 1 + p.images.length) % p.images.length) }
  const isLand = p.type === 'Land'

  const Carousel = (
    <div className={`relative overflow-hidden group ${wide ? 'md:w-[38%] shrink-0' : ''}`}>
      <Link to={to}>
        <img src={p.images[idx]} alt={p.title}
          className={`object-cover w-full transition-transform duration-500 group-hover:scale-105 ${wide ? 'h-56 md:h-full' : 'h-56'}`} />
      </Link>
      <div className="absolute top-3 left-3 flex gap-2">
        {p.exclusive && <span className="bg-gold text-black text-[10px] uppercase tracking-wider px-2 py-1 font-semibold">Exclusive</span>}
        {p.offPlan && <span className="bg-ink/90 text-white text-[10px] uppercase tracking-wider px-2 py-1">Off-Plan</span>}
        {p.status !== 'available' && <span className="bg-red-700 text-white text-[10px] uppercase tracking-wider px-2 py-1">{p.status}</span>}
      </div>
      <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M4 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1.6l-1-1.5A1 1 0 0 0 12.6 3H7.4a1 1 0 0 0-.8.5L5.6 5H4zm6 9a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>
        {p.images.length}
      </span>
      {p.images.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">‹</button>
          <button onClick={next} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">›</button>
        </>
      )}
    </div>
  )

  return (
    <article className={`bg-white border border-neutral-200 lift overflow-hidden ${wide ? 'md:flex' : ''}`}>
      {Carousel}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <Link to={to}><h3 className="h-serif text-lg leading-snug hover:text-gold transition-colors">{p.title}</h3></Link>
        <p className="text-sm text-neutral-500">{p.district}, {p.area}</p>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          {!isLand && <span title="Bedrooms">🛏 {p.bedrooms === 0 ? 'Studio' : p.bedrooms}</span>}
          {!isLand && <span title="Bathrooms">🛁 {p.bathrooms}</span>}
          <span title="Size">⬛ {p.sizeSqm.toLocaleString()} m²{isLand ? ' plot' : ''}</span>
        </div>
        <div className={`text-gold font-semibold text-lg mt-auto ${blurPrice ? 'blur-sm select-none' : ''}`}>
          {blurPrice ? 'Contact us for price' : fmtPrice(p)}
        </div>
        {blurPrice && <p className="text-xs text-neutral-500 -mt-1">Off-market — <Link to="/contact-us" className="text-gold">contact us</Link> for details</p>}
        <div className="flex gap-2 pt-2">
          <Link to={to} className="btn-dark flex-1 !py-2">Details</Link>
          <a href={`https://wa.me/${settings.whatsapp}?text=I'm interested in ${p.referenceNo}`} target="_blank" rel="noreferrer"
            className="bg-green-600 hover:bg-green-700 text-white px-3 flex items-center justify-center transition-colors" aria-label="WhatsApp">
            <WhatsAppIcon />
          </a>
        </div>
      </div>
    </article>
  )
}
