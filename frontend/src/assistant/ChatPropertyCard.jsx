import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { fmtPrice, WhatsAppIcon } from '../components/ui'
import { IconArea, IconBath, IconBed, IconPin } from '../components/icons'

// ---------------------------------------------------------------------------------------
// Compact property card for INSIDE the chat column. Everything on it is real listing
// data (same objects the site's PropertyCard renders); nothing is generated. Fields the
// thin live-search DTO doesn't carry (beds on land, size 0…) simply don't render —
// data-driven, never invented.
// ---------------------------------------------------------------------------------------
export default function ChatPropertyCard({ p }) {
  const { settings } = useData()
  const { t } = useI18n()
  const to = `/property/${p.purpose}/${p.id}`
  const waText = encodeURIComponent(`${t('assistant.waIntro')} ${p.title} (${p.referenceNo || p.id})`)
  const wa = `https://wa.me/${settings.whatsapp}?text=${waText}`

  return (
    <div className="qre-bubble-in flex gap-2.5 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
      <Link to={to} className="relative w-[86px] h-[76px] shrink-0 rounded-lg overflow-hidden bg-neutral-100">
        {p.images?.[0]
          ? <img src={p.images[0]} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
          : <span className="w-full h-full flex items-center justify-center text-neutral-300"><IconPin className="w-5 h-5" /></span>}
        <span className="absolute bottom-1 start-1 bg-white/95 text-ink text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full">
          {p.purpose === 'rent' ? t('common.forRent') : t('common.forSale')}
        </span>
      </Link>

      <div className="min-w-0 flex-1 flex flex-col">
        <Link to={to} className="text-[12.5px] font-semibold text-ink leading-snug line-clamp-1 hover:text-primary transition-colors">
          {p.exclusive && <span className="text-primary me-1" aria-hidden>★</span>}{p.title}
        </Link>
        <div className="text-primary font-bold text-[13px] mt-0.5">{fmtPrice(p)}</div>

        <div className="mt-0.5 flex items-center gap-2.5 text-[10.5px] text-neutral-500">
          {(p.bedrooms ?? 0) > 0 && <span className="flex items-center gap-1"><IconBed className="w-3 h-3" />{p.bedrooms}</span>}
          {(p.bathrooms ?? 0) > 0 && <span className="flex items-center gap-1"><IconBath className="w-3 h-3" />{p.bathrooms}</span>}
          {(p.sizeSqm ?? 0) > 0 && <span className="flex items-center gap-1"><IconArea className="w-3 h-3" />{p.sizeSqm} {t('property.sqm')}</span>}
          {(p.city || p.area) && <span className="flex items-center gap-1 min-w-0"><IconPin className="w-3 h-3 shrink-0" /><span className="truncate">{p.area || p.city}</span></span>}
        </div>

        <div className="mt-auto pt-1 flex items-center gap-1.5">
          <Link to={to} className="text-[11px] font-semibold text-ink border border-neutral-300 rounded-full px-2.5 py-[3px] hover:border-primary hover:text-primary transition-colors">
            {t('assistant.details')}
          </Link>
          <a href={wa} target="_blank" rel="noreferrer" aria-label={t('common.whatsapp')}
            className="w-6 h-6 rounded-full bg-[#25D366]/10 text-[#128C4A] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors">
            <WhatsAppIcon className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
