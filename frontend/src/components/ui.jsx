import { Link } from 'react-router-dom'

export const fmtPrice = (p) =>
  p.priceOnRequest ? 'Price on request'
    : `${p.price.toLocaleString('en-US')} ${p.currency}${p.purpose === 'rent' ? ' /mo' : ''}`

export function SectionHeading({ eyebrow, title, link, linkLabel, dark }) {
  return (
    <div className="flex items-end justify-between mb-8 gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h2 className={`h-serif text-3xl md:text-4xl ${dark ? 'text-white' : 'text-ink'}`}>{title}</h2>
      </div>
      {link && <Link to={link} className="gold-link text-gold text-sm uppercase tracking-wider whitespace-nowrap">{linkLabel || 'View all'}</Link>}
    </div>
  )
}

export function Breadcrumb({ items }) {
  return (
    <nav className="text-xs text-neutral-500 flex flex-wrap gap-1 items-center">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          {it.to ? <Link to={it.to} className="hover:text-gold">{it.label}</Link> : <span className="text-neutral-700">{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function EmptyState({ message, action }) {
  return (
    <div className="text-center py-16 border border-dashed border-neutral-300 rounded">
      <p className="text-neutral-500 mb-4">{message}</p>
      {action}
    </div>
  )
}

export const WhatsAppIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.58-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.82 9.82 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.9 7c0 5.44-4.45 9.87-9.9 9.87zm8.42-18.3A11.8 11.8 0 0 0 12.04 0C5.46 0 .1 5.35.1 11.92c0 2.1.55 4.15 1.6 5.95L0 24l6.29-1.65a11.93 11.93 0 0 0 5.75 1.47h.01c6.58 0 11.94-5.35 11.94-11.93 0-3.18-1.24-6.18-3.52-8.44z"/>
  </svg>
)

export const Star = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.29 3.95a1 1 0 0 0 .95.7h4.16c.97 0 1.37 1.24.59 1.81l-3.37 2.45a1 1 0 0 0-.36 1.12l1.28 3.95c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 0 0-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.95a1 1 0 0 0-.36-1.12L2.06 9.4c-.78-.57-.38-1.81.6-1.81H6.8a1 1 0 0 0 .95-.7l1.3-3.95z"/>
  </svg>
)
