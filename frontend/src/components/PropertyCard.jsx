import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { whatsAppHref } from '../lib/contact'
import { isRoomless } from '../lib/propertyDisplay'
import { useI18n } from '../i18n/I18nContext'
import { fmtPrice, useFavourite, WhatsAppIcon } from './ui'
import { IconArea, IconBath, IconBed, IconCamera, IconChevronLeft, IconChevronRight, IconHeart, IconPin } from './icons'

// The card used everywhere: grid mode (default) and wide list mode (listings page).
// `blurPrice` supports the off-market page.
export default function PropertyCard({ p, wide = false, blurPrice = false }) {
  const { settings, agents } = useData()
  const { t, typeLabel } = useI18n()
  const [idx, setIdx] = useState(0)
  const [fav, toggleFav] = useFavourite(p.id)
  const to = `/property/${p.purpose}/${p.id}`
  const next = (e) => { e.preventDefault(); setIdx(i => (i + 1) % p.images.length) }
  const prev = (e) => { e.preventDefault(); setIdx(i => (i - 1 + p.images.length) % p.images.length) }
  // Shared with MapListingCard: the two cards must agree about the same listing.
  // 'Land' alone missed shops, offices and warehouses, which also store 0 rooms and
  // were therefore advertised as "Studio".
  const isLand = isRoomless(p.type)

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
      <div className="absolute top-3 start-3 flex flex-wrap gap-1.5 pe-12 transition-transform duration-300 group-hover:-translate-y-0.5">
        {p.purpose && (
          <span className="bg-white/95 backdrop-blur text-ink text-[10px] uppercase tracking-wider px-2.5 py-1 font-bold rounded-full shadow-sm">
            {p.purpose === 'rent' ? t('common.forRent') : t('common.forSale')}
          </span>
        )}
        {p.exclusive && <span className="bg-primary text-white text-[10px] uppercase tracking-wider px-2.5 py-1 font-bold rounded-full shadow-sm">{t('common.exclusive')}</span>}
        {p.offPlan && <span className="bg-ink/90 backdrop-blur text-white text-[10px] uppercase tracking-wider px-2.5 py-1 font-bold rounded-full shadow-sm">{t('common.offPlan')}</span>}
        {p.status !== 'available' && <span className="bg-error text-white text-[10px] uppercase tracking-wider px-2.5 py-1 font-bold rounded-full shadow-sm">{p.status}</span>}
      </div>
      <button onClick={toggleFav} aria-label={fav ? t('property.removeFav') : t('property.saveFav')} aria-pressed={fav}
        className={`absolute top-3 end-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur transition-all duration-200 active:scale-90 ${fav ? 'bg-white text-primary scale-110' : 'bg-ink/30 text-white hover:bg-white hover:text-primary hover:scale-105'}`}>
        <IconHeart className={`w-4 h-4 ${fav ? 'animate-heart-pop' : ''}`} filled={fav} />
      </button>
      <span className="absolute bottom-3 end-3 text-white text-[11px] px-2 py-0.5 rounded-full bg-ink/40 backdrop-blur flex items-center gap-1.5">
        <IconCamera className="w-3.5 h-3.5" /> {p.images.length}
      </span>
      {p.images.length > 1 && (
        <>
          <button onClick={prev} aria-label={t('property.prevPhoto')} className="absolute start-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink w-8 h-8 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity"><IconChevronLeft className="w-4 h-4 rtl:-scale-x-100" /></button>
          <button onClick={next} aria-label={t('property.nextPhoto')} className="absolute end-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink w-8 h-8 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity"><IconChevronRight className="w-4 h-4 rtl:-scale-x-100" /></button>
        </>
      )}
    </div>
  )

  return (
    <article className={`card lift overflow-hidden group ${wide ? 'md:flex' : ''} ${p.exclusive ? 'ring-1 ring-primary/20' : ''}`}>
      {Carousel}
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <div className={`font-bold text-xl text-ink tracking-tight ${blurPrice ? 'blur-sm select-none' : ''}`}>
          {blurPrice ? t('property.contactForPrice') : fmtPrice(p)}
        </div>
        <Link to={to}><h3 className="font-semibold text-[15px] leading-snug text-neutral-800 group-hover:text-primary transition-colors line-clamp-2">{p.title}</h3></Link>
        <p className="text-sm text-mist flex items-center gap-1.5">
          <IconPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
          {[p.district, p.area].filter(Boolean).join(', ') || p.city}
        </p>
        <div className="flex items-center gap-4 text-[13px] text-neutral-600 border-t border-neutral-100 pt-3 mt-auto">
          {p.type && <span className="font-medium text-mist">{typeLabel(p.type)}</span>}
          {!isLand && <span title={t('property.bedrooms')} className="flex items-center gap-1.5"><IconBed className="w-4 h-4 text-neutral-400" />{p.bedrooms === 0 ? t('common.studio') : p.bedrooms}</span>}
          {!isLand && <span title={t('property.bathrooms')} className="flex items-center gap-1.5"><IconBath className="w-4 h-4 text-neutral-400" />{p.bathrooms}</span>}
          <span title={t('property.unitSize')} className="flex items-center gap-1.5"><IconArea className="w-4 h-4 text-neutral-400" />{p.sizeSqm.toLocaleString()} {t('property.sqm')}{isLand ? ` ${t('common.plot')}` : ''}</span>
        </div>
        {agent && (
          <div className="flex items-center gap-2.5 border-t border-neutral-100 pt-3">
            <img src={agent.photo} alt={agent.name} loading="lazy" className="w-8 h-8 rounded-full object-cover bg-neutral-100 ring-2 ring-white shadow-sm" />
            <div className="min-w-0 leading-tight">
              <div className="text-[13px] font-medium text-neutral-800 truncate">{agent.name}</div>
              <div className="text-[11px] text-mist truncate">{agent.title || t('property.consultant')}</div>
            </div>
          </div>
        )}
        {blurPrice && <p className="text-xs text-mist">{t('property.offMarketNote')} <Link to="/contact-us" className="text-primary font-medium">{t('property.offMarketContact')}</Link> {t('property.offMarketDetails')}</p>}
        <div className="flex gap-2 pt-1.5">
          <Link to={to} className="btn-dark flex-1 !py-2">{t('common.viewDetails')}</Link>
          <a href={whatsAppHref(settings.whatsapp, t('property.waCardMessage', { ref: p.referenceNo }))} target="_blank" rel="noreferrer"
            className="bg-[#25d366] hover:bg-[#1fb958] text-white w-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-[#25d366]/25" aria-label={t('common.whatsapp')}>
            <WhatsAppIcon />
          </a>
        </div>
      </div>
    </article>
  )
}
