import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { isRoomless } from '../lib/propertyDisplay'
import { compactPrice, displayCurrency, useFavourite } from './ui'
import { IconHeart, IconPin } from './icons'

const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="250"%3E%3Crect fill="%23e5e5e5" width="400" height="250"/%3E%3C/svg%3E'

// The compact card used only in the split map view — a small browsing tile, two-up in the
// list pane, so the map stays the dominant element. It is deliberately NOT PropertyCard:
// the map endpoint returns one thin row per pin (no gallery, no amenities), and a card
// that renders empty fields would look broken rather than compact.
//
// Fixed 16:10 image ratio + single-line clamps = every card in a row lands at the same
// height without any JS measuring.
export default function MapListingCard({ item, purpose, active = false, onHover }) {
  const { t, typeLabel } = useI18n()
  const [fav, toggleFav] = useFavourite(item.id)

  // A plot of LAND has no bedrooms, and "0 bedrooms" was being rendered as "Studio" — so
  // every land listing advertised itself as a studio apartment. Property types that have no
  // rooms simply say nothing about rooms.
  const roomless = isRoomless(item.type)
  const specs = [
    roomless
      ? null
      : item.beds === 0 ? t('common.studio') : (item.beds === 1 ? t('common.bed') : t('common.beds', { n: item.beds })),
    item.bathrooms > 0 ? (item.bathrooms === 1 ? t('common.bath') : t('common.baths', { n: item.bathrooms })) : null,
    item.sizeM2 > 0 ? `${Number(item.sizeM2).toLocaleString()} ${t('property.sqm')}` : null,
  ].filter(Boolean)

  return (
    <Link
      to={'/property/' + purpose + '/' + item.id}
      data-pid={item.id}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      className={'qre-mapcard' + (active ? ' is-active' : '')}
    >
      <div className="qre-mapcard-media relative aspect-[16/10] overflow-hidden">
        <img src={item.thumbUrl || PLACEHOLDER} alt={item.title}
             className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute top-2 start-2 flex gap-1.5">
          {item.isExclusive && <span className="qre-badge qre-badge-brand !static">{t('common.exclusive')}</span>}
          {item.isOffPlan && <span className="qre-badge qre-badge-ink !static">{t('common.offPlan')}</span>}
        </div>
        <button
          onClick={toggleFav}
          aria-label={fav ? t('property.removeFav') : t('property.saveFav')}
          aria-pressed={fav}
          className={`absolute top-2 end-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur transition-all duration-200 active:scale-90 ${fav ? 'bg-white text-error' : 'bg-black/30 text-white hover:bg-white hover:text-ink hover:scale-105'}`}
        >
          <IconHeart className={`w-3.5 h-3.5 ${fav ? 'animate-heart-pop' : ''}`} filled={fav} />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-0.5">
        {item.type && (
          <span className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--muted)' }}>
            {typeLabel(item.type)}
          </span>
        )}
        <h3 className="font-semibold text-[13px] leading-snug truncate text-neutral-800">{item.title}</h3>
        {item.area && (
          <p className="text-xs flex items-center gap-1 truncate" style={{ color: 'var(--muted)' }}>
            <IconPin className="w-3 h-3 shrink-0" /> <span className="truncate">{item.area}</span>
          </p>
        )}
        <div className="font-bold text-[15px] text-ink tracking-tight mt-1">
          {/* The API now sends NO price for a "price on request" listing, and the flag says
              which kind of missing this is. This card used to print the figure the map
              endpoint sent regardless — which is how two listings marked "on request"
              showed "QAR 9.8M" and "QAR 6.8M" in the default view of /buy. */}
          {item.priceOnRequest || item.price == null
            ? t('common.priceOnRequest')
            : displayCurrency(item.currency || 'QAR') + ' ' + compactPrice(item.price) + (purpose === 'rent' ? t('common.perMonth') : '')}
        </div>
        {specs.length > 0 && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{specs.join(' · ')}</p>
        )}
      </div>
    </Link>
  )
}
