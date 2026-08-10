import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { IconChevronDown, IconHeart, IconMenu, IconUser, IconX } from './icons'

// Menu structure is keyed, not labelled: the visible text comes from the i18n
// dictionaries (nav.* / nav.items.*), while routing stays keyed off stable ids.
const MENUS = [
  { key: 'rent', to: '/rent', items: ['apartmentsForRent', 'villasForRent', 'officesForRent', 'studiosForRent'] },
  { key: 'buy', to: '/buy', items: ['apartmentsForSale', 'villasForSale', 'landsForSale', 'officesForSale', 'penthousesForSale'] },
  { key: 'developments', to: '/developments', items: ['allDevelopments', 'thePearl', 'lusail', 'qetaifanIsland'] },
  { key: 'agents', to: '/find-agent', items: ['findAnAgent', 'careers'] },
  { key: 'resources', to: '/about-us', items: ['aboutUs', 'contactUs', 'listYourProperty', 'offMarket'] },
]
const ITEM_LINKS = {
  findAnAgent: '/find-agent', careers: '/careers', aboutUs: '/about-us',
  contactUs: '/contact-us', listYourProperty: '/list-property',
  offMarket: '/off-market-opportunities', allDevelopments: '/developments',
  // District entries under Developments. DevelopmentsIndex reads ?area= and resolves it
  // against its own chip labels (the values stay English — they match backend data).
  thePearl: '/developments?area=The+Pearl',
  lusail: '/developments?area=Lusail',
  qetaifanIsland: '/developments?area=Qetaifan',
}
const itemLink = (key) => {
  if (ITEM_LINKS[key]) return ITEM_LINKS[key]
  // "apartmentsForRent", "villasForSale", ... -> the right listings route. A ?type=
  // filter is deliberately NOT added: the live search DTO carries no PropertyType, so it
  // would return an empty page. See the note at the top of Footer.jsx.
  if (key.endsWith('ForRent')) return '/rent'
  if (key.endsWith('ForSale')) return '/buy'
  return '/developments'
}

export default function Navbar({ overHero = false }) {
  const { settings } = useData()
  const { t, lang, toggleLang } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openAccordion, setOpenAccordion] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = scrolled || !overHero || mobileOpen

  // One control, two states: shows the language you would SWITCH TO (common.language
  // resolves to "العربية" in English and "English" in Arabic).
  const LangSwitch = ({ className = '' }) => (
    <button onClick={toggleLang} aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className={`border border-white/20 rounded-lg px-2.5 py-1 text-xs font-semibold text-white/85 hover:text-white hover:border-white/50 transition-colors ${className}`}>
      {t('common.language')}
    </button>
  )

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${solid ? 'bg-ink/95 backdrop-blur-md shadow-lg shadow-black/10' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16 text-white">
        {/* Company logo (knockout variant for the dark bar — public/brand/logo-nav.png).
            The full name lives in the alt text, so accessibility and SEO keep the brand. */}
        <Link to="/" className="flex items-center shrink-0">
          <img src="/brand/logo-nav.png" alt={settings.siteName} className="h-11 w-auto" />
        </Link>

        {/* desktop menu */}
        <nav className="hidden lg:flex items-center gap-1 text-sm">
          {MENUS.map(m => (
            <div key={m.key} className="relative group">
              <NavLink to={m.to}
                className={({ isActive }) => `inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-white/85 hover:text-white hover:bg-white/8'}`}>
                {t(`nav.${m.key}`)}
                <IconChevronDown className="w-3 h-3 opacity-60 transition-transform group-hover:rotate-180" />
              </NavLink>
              <div className="absolute left-1/2 -translate-x-1/2 top-full hidden group-hover:block pt-2">
                <div className="bg-ink/98 backdrop-blur border border-white/10 rounded-xl shadow-2xl shadow-black/30 p-5 min-w-[240px]">
                  <ul className="space-y-1">
                    {m.items.map(x => <li key={x}><Link to={itemLink(x)} className="block rounded-md px-2 py-1.5 -mx-2 text-white/75 hover:text-primary hover:bg-white/5 whitespace-nowrap transition-colors">{t(`nav.items.${x}`)}</Link></li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3 text-sm">
          <Link to="/favourites" aria-label={t('nav.favourites')} title={t('nav.favourites')} className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:text-primary hover:bg-white/8 transition-colors">
            <IconHeart className="w-[18px] h-[18px]" />
          </Link>
          <Link to="/admin" aria-label={t('nav.account')} className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:text-primary hover:bg-white/8 transition-colors">
            <IconUser className="w-[18px] h-[18px]" />
          </Link>
          <LangSwitch />
          <select className="bg-transparent border border-white/20 rounded-lg px-2 py-1 text-xs font-medium hover:border-white/40 transition-colors" defaultValue="QAR" aria-label={t('nav.currency')}>
            <option className="text-black">QAR</option><option className="text-black">USD</option><option className="text-black">EUR</option>
          </select>
          <Link to="/list-property" className="btn-primary !py-2 !px-4 text-[13px]">{t('nav.listProperty')}</Link>
        </div>

        {/* hamburger */}
        <div className="lg:hidden flex items-center gap-2">
          <LangSwitch />
          <button className="w-10 h-10 -me-2 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMobileOpen(o => !o)} aria-label={t('nav.menu')} aria-expanded={mobileOpen}>
            {mobileOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* mobile drawer with accordions */}
      {mobileOpen && (
        <div className="lg:hidden bg-ink text-white border-t border-white/10 max-h-[80vh] overflow-y-auto">
          {MENUS.map(m => (
            <div key={m.key} className="border-b border-white/8">
              <button onClick={() => setOpenAccordion(a => a === m.key ? null : m.key)}
                className="w-full flex justify-between items-center px-5 py-4 text-sm font-semibold" aria-expanded={openAccordion === m.key}>
                {t(`nav.${m.key}`)}
                <IconChevronDown className={`w-4 h-4 text-primary transition-transform ${openAccordion === m.key ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion === m.key && (
                <ul className="px-5 pb-4 space-y-1 text-sm text-white/70">
                  {m.items.map(x => (
                    <li key={x}><Link to={itemLink(x)} onClick={() => setMobileOpen(false)} className="block py-1.5 hover:text-primary transition-colors">{t(`nav.items.${x}`)}</Link></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div className="px-5 py-4 space-y-2">
            <Link to="/favourites" onClick={() => setMobileOpen(false)} className="btn-outline !border-white/20 !bg-transparent !text-white w-full">
              <IconHeart className="w-4 h-4" /> {t('nav.favourites')}
            </Link>
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="btn-outline !border-white/20 !bg-transparent !text-white w-full">
              <IconUser className="w-4 h-4" /> {t('nav.account')}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
