import { Link } from 'react-router-dom'
import { compactPrice, useFavourite } from './ui'
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
  const [fav, toggleFav] = useFavourite(item.id)

  const specs = [
    item.beds === 0 ? 'Studio' : `${item.beds} Bed${item.beds === 1 ? '' : 's'}`,
    item.bathrooms > 0 ? `${item.bathrooms} Bath${item.bathrooms === 1 ? '' : 's'}` : null,
    item.sizeM2 > 0 ? `${Number(item.sizeM2).toLocaleString()} m²` : null,
  ].filter(Boolean)

  return (
    <Link
      to={'/property/' + purpose + '/' + item.id}
      data-pid={item.id}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      className={'qre-mapcard' + (active ? ' is-active' : '')}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={item.thumbUrl || PLACEHOLDER} alt={item.title}
             className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          {item.isExclusive && <span className="qre-badge qre-badge-brand !static">Exclusive</span>}
          {item.isOffPlan && <span className="qre-badge qre-badge-ink !static">Off-Plan</span>}
        </div>
        <button
          onClick={toggleFav}
          aria-label={fav ? 'Remove from favourites' : 'Save to favourites'}
          aria-pressed={fav}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur transition-colors ${fav ? 'bg-white text-error' : 'bg-black/30 text-white hover:bg-white hover:text-ink'}`}
        >
          <IconHeart className="w-3.5 h-3.5" filled={fav} />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-0.5">
        {item.type && (
          <span className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--muted)' }}>
            {item.type}
          </span>
        )}
        <h3 className="font-semibold text-[13px] leading-snug truncate text-neutral-800">{item.title}</h3>
        {item.area && (
          <p className="text-xs flex items-center gap-1 truncate" style={{ color: 'var(--muted)' }}>
            <IconPin className="w-3 h-3 shrink-0" /> <span className="truncate">{item.area}</span>
          </p>
        )}
        <div className="font-bold text-[15px] text-ink tracking-tight mt-1">
          {item.price == null
            ? 'Price on request'
            : (item.currency || 'QAR') + ' ' + compactPrice(item.price) + (purpose === 'rent' ? ' /mo' : '')}
        </div>
        {specs.length > 0 && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{specs.join(' · ')}</p>
        )}
      </div>
    </Link>
  )
}
