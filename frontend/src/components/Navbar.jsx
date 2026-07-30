import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { brandParts } from '../config/company'
import { IconChevronDown, IconMenu, IconUser, IconX } from './icons'

const MENUS = [
  { label: 'Rent', to: '/rent', items: ['Apartments for Rent', 'Villas for Rent', 'Offices for Rent', 'Studios for Rent'] },
  { label: 'Buy', to: '/buy', items: ['Apartments for Sale', 'Villas for Sale', 'Lands for Sale', 'Offices for Sale', 'Penthouses for Sale'] },
  { label: 'Developments', to: '/developments', items: ['All Developments', 'The Pearl', 'Lusail', 'Qetaifan Island'] },
  { label: 'Agents', to: '/find-agent', items: ['Find an Agent', 'Careers'] },
  { label: 'Resources', to: '/about-us', items: ['About Us', 'Contact Us', 'List Your Property', 'Off-Market Opportunities'] },
]
const itemLink = (label) => {
  const map = {
    'Find an Agent': '/find-agent', Careers: '/careers', 'About Us': '/about-us',
    'Contact Us': '/contact-us', 'List Your Property': '/list-property',
    'Off-Market Opportunities': '/off-market-opportunities', 'All Developments': '/developments',
    // District entries under Developments. These used to fall through to the unfiltered
    // list, so all three behaved identically to "All Developments". DevelopmentsIndex now
    // reads ?area= and resolves it against its own chip labels.
    'The Pearl': '/developments?area=The+Pearl',
    Lusail: '/developments?area=Lusail',
    'Qetaifan Island': '/developments?area=Qetaifan',
  }
  if (map[label]) return map[label]
  // "Apartments for Rent", "Villas for Sale", ... -> the right listings route. A ?type=
  // filter is deliberately NOT added: the live search DTO carries no PropertyType, so it
  // would return an empty page. See the note at the top of Footer.jsx.
  if (label.includes('Rent')) return '/rent'
  if (label.includes('Sale')) return '/buy'
  return '/developments'
}

export default function Navbar({ overHero = false }) {
  const { settings } = useData()
  const [brandFirst, brandRest] = brandParts(settings.siteName)
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
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${solid ? 'bg-ink/95 backdrop-blur-md shadow-lg shadow-black/10' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16 text-white">
        <Link to="/" className="h-serif text-lg tracking-tight">
          {brandFirst} <span className="text-primary">{brandRest}</span>
        </Link>

        {/* desktop menu */}
        <nav className="hidden lg:flex items-center gap-1 text-sm">
          {MENUS.map(m => (
            <div key={m.label} className="relative group">
              <NavLink to={m.to}
                className={({ isActive }) => `inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-white/85 hover:text-white hover:bg-white/8'}`}>
                {m.label}
                <IconChevronDown className="w-3 h-3 opacity-60 transition-transform group-hover:rotate-180" />
              </NavLink>
              <div className="absolute left-1/2 -translate-x-1/2 top-full hidden group-hover:block pt-2">
                <div className="bg-ink/98 backdrop-blur border border-white/10 rounded-xl shadow-2xl shadow-black/30 p-5 min-w-[240px]">
                  <ul className="space-y-1">
                    {m.items.map(x => <li key={x}><Link to={itemLink(x)} className="block rounded-md px-2 py-1.5 -mx-2 text-white/75 hover:text-primary hover:bg-white/5 whitespace-nowrap transition-colors">{x}</Link></li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3 text-sm">
          <Link to="/admin" aria-label="Account" className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:text-primary hover:bg-white/8 transition-colors">
            <IconUser className="w-[18px] h-[18px]" />
          </Link>
          <span className="text-white/40 text-xs font-medium">EN</span>
          <select className="bg-transparent border border-white/20 rounded-lg px-2 py-1 text-xs font-medium hover:border-white/40 transition-colors" defaultValue="QAR" aria-label="Currency">
            <option className="text-black">QAR</option><option className="text-black">USD</option><option className="text-black">EUR</option>
          </select>
          <Link to="/list-property" className="btn-primary !py-2 !px-4 text-[13px]">List Property</Link>
        </div>

        {/* hamburger */}
        <button className="lg:hidden w-10 h-10 -mr-2 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMobileOpen(o => !o)} aria-label="Menu" aria-expanded={mobileOpen}>
          {mobileOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
        </button>
      </div>

      {/* mobile drawer with accordions */}
      {mobileOpen && (
        <div className="lg:hidden bg-ink text-white border-t border-white/10 max-h-[80vh] overflow-y-auto">
          {MENUS.map(m => (
            <div key={m.label} className="border-b border-white/8">
              <button onClick={() => setOpenAccordion(a => a === m.label ? null : m.label)}
                className="w-full flex justify-between items-center px-5 py-4 text-sm font-semibold" aria-expanded={openAccordion === m.label}>
                {m.label}
                <IconChevronDown className={`w-4 h-4 text-primary transition-transform ${openAccordion === m.label ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion === m.label && (
                <ul className="px-5 pb-4 space-y-1 text-sm text-white/70">
                  {m.items.map(x => (
                    <li key={x}><Link to={itemLink(x)} onClick={() => setMobileOpen(false)} className="block py-1.5 hover:text-primary transition-colors">{x}</Link></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div className="px-5 py-4">
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="btn-outline !border-white/20 !bg-transparent !text-white w-full">
              <IconUser className="w-4 h-4" /> Account
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
