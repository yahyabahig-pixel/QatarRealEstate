import { Link } from 'react-router-dom'
import { compactPrice } from './ui'
import { IconArea, IconBed, IconPin } from './icons'

const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260"%3E%3Crect fill="%23e5e5e5" width="400" height="260"/%3E%3C/svg%3E'

// The compact card used only in the split map view. It is deliberately NOT PropertyCard:
// the map endpoint returns one thin row per pin (no bathrooms, no amenities, no gallery),
// and a card that renders empty fields would look broken rather than compact.
export default function MapListingCard({ item, purpose, active = false, onHover }) {
  return (
    <Link
      to={'/property/' + purpose + '/' + item.id}
      data-pid={item.id}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      className={'qre-mapcard' + (active ? ' is-active' : '')}
    >
      <div className="relative">
        <img src={item.thumbUrl || PLACEHOLDER} alt={item.title}
             className="w-full h-36 object-cover" loading="lazy" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          {item.isExclusive && <span className="qre-badge qre-badge-gold">Exclusive</span>}
          {item.isOffPlan && <span className="qre-badge qre-badge-ink">Off-Plan</span>}
        </div>
      </div>

      <div className="p-3.5 flex flex-col gap-1">
        <div className="font-bold text-[15px] text-ink tracking-tight">
          {item.price == null
            ? 'Price on request'
            : compactPrice(item.price) + ' ' + (item.currency || 'QAR') + (purpose === 'rent' ? ' /mo' : '')}
        </div>
        <h3 className="font-medium text-sm leading-snug line-clamp-2 text-neutral-700">{item.title}</h3>
        {item.area && (
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            <IconPin className="w-3 h-3 shrink-0" /> {item.area}
          </p>
        )}
        <div className="flex items-center gap-3.5 text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          <span className="flex items-center gap-1"><IconBed className="w-3.5 h-3.5" /> {item.beds === 0 ? 'Studio' : item.beds}</span>
          <span className="flex items-center gap-1"><IconArea className="w-3.5 h-3.5" /> {(item.sizeM2 || 0).toLocaleString()} m²</span>
        </div>
      </div>
    </Link>
  )
}
