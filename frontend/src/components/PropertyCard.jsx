import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { fmtPrice, useFavourite, WhatsAppIcon } from './ui'
import { IconArea, IconBath, IconBed, IconCamera, IconChevronLeft, IconChevronRight, IconHeart, IconPin } from './icons'

// The card used everywhere: grid mode (default) and wide list mode (listings page).
// `blurPrice` supports the off-market page.
export default function PropertyCard({ p, wide = false, blurPrice = false }) {
  const { settings, agents } = useData()
  const [idx, setIdx] = useState(0)
  const [fav, toggleFav] = useFavourite(p.id)
  const to = `/property/${p.purpose}/${p.id}`
  const next = (e) => { e.preventDefault(); setIdx(i => (i + 1) % p.images.length) }
  const prev = (e) => { e.preventDefault(); setIdx(i => (i - 1 + p.images.length) % p.images.length) }
  const isLand = p.type === 'Land'

  // Agent strip renders only when the record is resolvable — live search cards
  // are thin DTOs, so the row simply doesn't appear there. Never a broken avatar.
  const agent = p.agent || agents.find(a => a.id === p.agentId) || null

  const Carousel = (
    <div className={`relative overflow-hidden group/img ${wide ? 'md:w-[38%] shrink-0' : 'aspect-[4/3]'}`}>
      <Link to={to} className="block h-full">
        <img src={p.images[idx]} alt={p.title} loading="lazy"
          className={`object-cover w-full transition-transform duration-700 ease-out group-hover/img:scale-[1.06] ${wide ? 'h-56 md:h-full' : 'h-full'}`} />
      </Link>
      {/* subtle bottom scrim keeps the photo count legible on bright photos */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/50 to-transparent pointer-events-none" />
      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pr-12">
        {p.purpose && (
          <span className="bg-white/95 backdrop-blur text-ink text-[10px] uppercase tracking-wider px-2.5 py-1 font-bold rounded-full shadow-sm">
            {p.purpose === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
        )}
        {p.exclusive && <span className="bg-primary text-white text-[10px] uppercase tracking-wider px-2.5 py-1 font-bold rounded-full shadow-sm">Exclusive</span>}
        {p.offPlan && <span className="bg-ink/90 backdrop-blur text-white text-[10px] uppercase tracking-wider px-2.5 py-1 font-bold rounded-full shadow-sm">Off-Plan</span>}
        {p.status !== 'available' && <span className="bg-error text-white text-[10px] uppercase tracking-wider px-2.5 py-1 font-bold rounded-full shadow-sm">{p.status}</span>}
      </div>
      <button onClick={toggleFav} aria-label={fav ? 'Remove from favourites' : 'Save to favourites'} aria-pressed={fav}
        className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur transition-all duration-200 ${fav ? 'bg-white text-primary scale-110' : 'bg-ink/30 text-white hover:bg-white hover:text-primary'}`}>
        <IconHeart className="w-4 h-4" filled={fav} />
      </button>
      <span className="absolute bottom-3 right-3 text-white text-[11px] px-2 py-0.5 rounded-full bg-ink/40 backdrop-blur flex items-center gap-1.5">
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
    <article className={`card lift overflow-hidden group ${wide ? 'md:flex' : ''} ${p.exclusive ? 'ring-1 ring-primary/20' : ''}`}>
      {Carousel}
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <div className={`font-bold text-xl text-ink tracking-tight ${blurPrice ? 'blur-sm select-none' : ''}`}>
          {blurPrice ? 'Contact us for price' : fmtPrice(p)}
        </div>
        <Link to={to}><h3 className="font-semibold text-[15px] leading-snug text-neutral-800 group-hover:text-primary transition-colors line-clamp-2">{p.title}</h3></Link>
        <p className="text-sm text-mist flex items-center gap-1.5">
          <IconPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
          {[p.district, p.area].filter(Boolean).join(', ') || p.city}
        </p>
        <div className="flex items-center gap-4 text-[13px] text-neutral-600 border-t border-neutral-100 pt-3 mt-auto">
          {p.type && <span className="font-medium text-mist">{p.type}</span>}
          {!isLand && <span title="Bedrooms" className="flex items-center gap-1.5"><IconBed className="w-4 h-4 text-neutral-400" />{p.bedrooms === 0 ? 'Studio' : p.bedrooms}</span>}
          {!isLand && <span title="Bathrooms" className="flex items-center gap-1.5"><IconBath className="w-4 h-4 text-neutral-400" />{p.bathrooms}</span>}
          <span title="Size" className="flex items-center gap-1.5"><IconArea className="w-4 h-4 text-neutral-400" />{p.sizeSqm.toLocaleString()} m²{isLand ? ' plot' : ''}</span>
        </div>
        {agent && (
          <div className="flex items-center gap-2.5 border-t border-neutral-100 pt-3">
            <img src={agent.photo} alt={agent.name} loading="lazy" className="w-8 h-8 rounded-full object-cover bg-neutral-100 ring-2 ring-white shadow-sm" />
            <div className="min-w-0 leading-tight">
              <div className="text-[13px] font-medium text-neutral-800 truncate">{agent.name}</div>
              <div className="text-[11px] text-mist truncate">{agent.title || 'Property Consultant'}</div>
            </div>
          </div>
        )}
        {blurPrice && <p className="text-xs text-mist">Off-market — <Link to="/contact-us" className="text-primary font-medium">contact us</Link> for details</p>}
        <div className="flex gap-2 pt-1.5">
          <Link to={to} className="btn-dark flex-1 !py-2">View Details</Link>
          <a href={`https://wa.me/${settings.whatsapp}?text=I'm interested in ${p.referenceNo}`} target="_blank" rel="noreferrer"
            className="bg-[#25d366] hover:bg-[#1fb958] text-white w-10 rounded-lg flex items-center justify-center transition-colors" aria-label="WhatsApp">
            <WhatsAppIcon />
          </a>
        </div>
      </div>
    </article>
  )
}
