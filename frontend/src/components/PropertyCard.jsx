import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { fmtPrice, useFavourite, WhatsAppIcon } from './ui'
import { IconArea, IconBath, IconBed, IconCamera, IconChevronLeft, IconChevronRight, IconHeart, IconPin } from './icons'

// The card used everywhere: grid mode (default) and wide list mode (listings page).
// `blurPrice` supports the off-market page.
export default function PropertyCard({ p, wide = false, blurPrice = false }) {
  const { settings } = useData()
  const [idx, setIdx] = useState(0)
  const [fav, toggleFav] = useFavourite(p.id)
  const to = `/property/${p.purpose}/${p.id}`
  const next = (e) => { e.preventDefault(); setIdx(i => (i + 1) % p.images.length) }
  const prev = (e) => { e.preventDefault(); setIdx(i => (i - 1 + p.images.length) % p.images.length) }
  const isLand = p.type === 'Land'

  const Carousel = (
    <div className={`relative overflow-hidden group/img ${wide ? 'md:w-[38%] shrink-0' : 'aspect-[4/3]'}`}>
      <Link to={to} className="block h-full">
        <img src={p.images[idx]} alt={p.title} loading="lazy"
          className={`object-cover w-full transition-transform duration-500 group-hover/img:scale-[1.04] ${wide ? 'h-56 md:h-full' : 'h-full'}`} />
      </Link>
      {/* subtle bottom scrim keeps the photo count legible on bright photos */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
      <div className="absolute top-3 left-3 flex gap-1.5">
        {p.purpose && (
          <span className="bg-white/95 text-ink text-[10px] uppercase tracking-wider px-2 py-1 font-bold rounded-full">
            {p.purpose === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
        )}
        {p.exclusive && <span className="bg-gold text-white text-[10px] uppercase tracking-wider px-2 py-1 font-bold rounded-full">Exclusive</span>}
        {p.offPlan && <span className="bg-ink/90 text-white text-[10px] uppercase tracking-wider px-2 py-1 font-bold rounded-full">Off-Plan</span>}
        {p.status !== 'available' && <span className="bg-error text-white text-[10px] uppercase tracking-wider px-2 py-1 font-bold rounded-full">{p.status}</span>}
      </div>
      <button onClick={toggleFav} aria-label={fav ? 'Remove from favourites' : 'Save to favourites'} aria-pressed={fav}
        className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur transition-colors ${fav ? 'bg-white text-error' : 'bg-black/30 text-white hover:bg-white hover:text-ink'}`}>
        <IconHeart className="w-4 h-4" filled={fav} />
      </button>
      <span className="absolute bottom-3 right-3 text-white text-[11px] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur flex items-center gap-1.5">
        <IconCamera className="w-3.5 h-3.5" /> {p.images.length}
      </span>
      {p.images.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink w-8 h-8 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity"><IconChevronLeft className="w-4 h-4" /></button>
          <button onClick={next} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink w-8 h-8 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity"><IconChevronRight className="w-4 h-4" /></button>
        </>
      )}
    </div>
  )

  return (
    <article className={`card lift overflow-hidden group ${wide ? 'md:flex' : ''} ${p.exclusive ? 'ring-1 ring-gold/25' : ''}`}>
      {Carousel}
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <div className={`font-bold text-lg text-ink tracking-tight ${blurPrice ? 'blur-sm select-none' : ''}`}>
          {blurPrice ? 'Contact us for price' : fmtPrice(p)}
        </div>
        <Link to={to}><h3 className="font-semibold text-[15px] leading-snug text-neutral-800 group-hover:text-gold transition-colors line-clamp-2">{p.title}</h3></Link>
        <p className="text-sm text-neutral-500 flex items-center gap-1.5">
          <IconPin className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
          {[p.district, p.area].filter(Boolean).join(', ') || p.city}
        </p>
        <div className="flex items-center gap-4 text-[13px] text-neutral-600 border-t border-neutral-100 pt-3 mt-auto">
          {p.type && <span className="font-medium text-neutral-500">{p.type}</span>}
          {!isLand && <span title="Bedrooms" className="flex items-center gap-1.5"><IconBed className="w-4 h-4 text-neutral-400" />{p.bedrooms === 0 ? 'Studio' : p.bedrooms}</span>}
          {!isLand && <span title="Bathrooms" className="flex items-center gap-1.5"><IconBath className="w-4 h-4 text-neutral-400" />{p.bathrooms}</span>}
          <span title="Size" className="flex items-center gap-1.5"><IconArea className="w-4 h-4 text-neutral-400" />{p.sizeSqm.toLocaleString()} m²{isLand ? ' plot' : ''}</span>
        </div>
        {blurPrice && <p className="text-xs text-neutral-500">Off-market — <Link to="/contact-us" className="text-gold font-medium">contact us</Link> for details</p>}
        <div className="flex gap-2 pt-1.5">
          <Link to={to} className="btn-dark flex-1 !py-2">Details</Link>
          <a href={`https://wa.me/${settings.whatsapp}?text=I'm interested in ${p.referenceNo}`} target="_blank" rel="noreferrer"
            className="bg-[#25d366] hover:bg-[#1fb958] text-white w-10 rounded-lg flex items-center justify-center transition-colors" aria-label="WhatsApp">
            <WhatsAppIcon />
          </a>
        </div>
      </div>
    </article>
  )
}
