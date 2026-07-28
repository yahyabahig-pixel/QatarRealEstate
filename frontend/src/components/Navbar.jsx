import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useData } from '../store/DataContext'

const MENUS = [
  { label: 'Rent', to: '/rent', items: ['Apartments for Rent', 'Villas for Rent', 'Offices for Rent', 'Studios for Rent'] },
  { label: 'Buy', to: '/buy', items: ['Apartments for Sale', 'Villas for Sale', 'Lands for Sale', 'Offices for Sale', 'Penthouses for Sale'] },
  {
    label: 'Commercial', to: '/buy', twoCol: true,
    rent: ['Commercial Villa', 'Retail Shop', 'Warehouse', 'Restaurant', 'Labor Camp'],
    buy: ['Whole Building', 'Land Plot', 'Factory', 'Hotel', 'Office'],
  },
  { label: 'Developments', to: '/developments', items: ['All Developments', 'The Pearl', 'Lusail', 'Qetaifan Island'] },
  { label: 'Agents', to: '/find-agent', items: ['Find an Agent', 'Careers'] },
  { label: 'Resources', to: '/learn', items: ['Learning Hub', 'About Us', 'Contact Us', 'List Your Property', 'Off-Market Opportunities'] },
]
const itemLink = (label) => {
  const map = {
    'Find an Agent': '/find-agent', Careers: '/careers', 'Learning Hub': '/learn', 'About Us': '/about-us',
    'Contact Us': '/contact-us', 'List Your Property': '/list-property',
    'Off-Market Opportunities': '/off-market-opportunities', 'All Developments': '/developments',
  }
  if (map[label]) return map[label]
  if (label.includes('Rent')) return '/rent'
  if (label.includes('Sale')) return '/buy'
  return '/developments'
}

export default function Navbar({ overHero = false }) {
  const { settings } = useData()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openAccordion, setOpenAccordion] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = scrolled || !overHero || mobileOpen

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${solid ? 'bg-ink/95 backdrop-blur shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16 text-white">
        <Link to="/" className="h-serif text-xl tracking-wide">
          {settings.siteName.split(' ')[0]} <span className="text-gold">{settings.siteName.split(' ').slice(1).join(' ')}</span>
        </Link>

        {/* desktop menu */}
        <nav className="hidden lg:flex items-center gap-6 text-sm">
          {MENUS.map(m => (
            <div key={m.label} className="relative group">
              <NavLink to={m.to} className="gold-link py-5 inline-block uppercase tracking-wider text-[13px]">{m.label}</NavLink>
              <div className="absolute left-1/2 -translate-x-1/2 top-full hidden group-hover:block pt-0">
                <div className="bg-ink border border-neutral-800 shadow-2xl p-5 min-w-[240px]">
                  {m.twoCol ? (
                    <div className="grid grid-cols-2 gap-6">
                      {['rent', 'buy'].map(col => (
                        <div key={col}>
                          <div className="eyebrow mb-3">{col === 'rent' ? 'For Rent' : 'For Buy'}</div>
                          <ul className="space-y-2">
                            {m[col].map(x => <li key={x}><Link to={col === 'rent' ? '/rent' : '/buy'} className="hover:text-gold whitespace-nowrap">{x}</Link></li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {m.items.map(x => <li key={x}><Link to={itemLink(x)} className="hover:text-gold whitespace-nowrap">{x}</Link></li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4 text-sm">
          <Link to="/admin" aria-label="Account" className="hover:text-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.5 20.1a8.25 8.25 0 0 1 15 0"/></svg>
          </Link>
          <span className="text-neutral-400">EN</span>
          <select className="bg-transparent border border-neutral-600 rounded px-1 py-0.5 text-xs" defaultValue="QAR" aria-label="Currency">
            <option className="text-black">QAR</option><option className="text-black">USD</option><option className="text-black">EUR</option>
          </select>
        </div>

        {/* hamburger */}
        <button className="lg:hidden" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
            {mobileOpen ? <path d="M6 6l12 12M18 6L6 18"/> : <path d="M3 6h18M3 12h18M3 18h18"/>}
          </svg>
        </button>
      </div>

      {/* mobile drawer with accordions */}
      {mobileOpen && (
        <div className="lg:hidden bg-ink text-white border-t border-neutral-800 max-h-[80vh] overflow-y-auto">
          {MENUS.map(m => (
            <div key={m.label} className="border-b border-neutral-800">
              <button onClick={() => setOpenAccordion(a => a === m.label ? null : m.label)}
                className="w-full flex justify-between items-center px-5 py-4 uppercase tracking-wider text-sm">
                {m.label}<span className="text-gold">{openAccordion === m.label ? '−' : '+'}</span>
              </button>
              {openAccordion === m.label && (
                <ul className="px-5 pb-4 space-y-2 text-sm text-neutral-300">
                  {(m.items || [...m.rent, ...m.buy]).map(x => (
                    <li key={x}><Link to={itemLink(x)} onClick={() => setMobileOpen(false)} className="hover:text-gold">{x}</Link></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  )
}
