import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { IconAward } from './icons'

// ---------------------------------------------------------------------------------------
// SEO footer columns.
//
// Every entry is a REAL search, not a label. `to` is built from the existing /rent and
// /buy routes plus the query parameters Listings.jsx already reads from the URL
// (see the `f` object there: q, type, beds, baths, minPrice, maxPrice, minSize, maxSize).
//
// WHY ONLY `q` AND NOT `type`
//   The backend's search DTO (PropertyListItem in PropertySearchCriteria.cs) returns no
//   PropertyType and no Area — by design, one SQL row per card. mapPropertyListItem
//   therefore sets `type: ''` and `area: ''` on every live card, so a `?type=Villa` link
//   matches nothing at all once the API is connected. `q` is matched against
//   `title + area + district + city`, and the titles carry the district name, so an
//   area-scoped `q` is the one filter that returns the right listings in BOTH mock mode
//   and live mode. Adding `type` back here would need PropertyType on the list DTO,
//   which is a backend change.
//
// I18N NOTE: the visible labels translate (footer.seo.*), but the `q` VALUES stay
// English — they are matched against listing titles stored in English in the database.
// ---------------------------------------------------------------------------------------
const search = (purpose, q) => `/${purpose}?q=${encodeURIComponent(q)}`

const SEO_COLUMNS = [
  {
    titleKey: 'footer.seo.rentPearl',
    links: [
      ['footer.seo.rentPearlApts', search('rent', 'The Pearl')],
      ['footer.seo.rentPortoApts', search('rent', 'Porto Arabia')],
      ['footer.seo.rentVivaStudios', search('rent', 'Viva Bahriya')],
      ['footer.seo.rentPearlPenthouses', search('rent', 'Pearl')],
    ],
  },
  {
    titleKey: 'footer.seo.buyLusail',
    links: [
      ['footer.seo.buyMarinaApts', search('buy', 'Lusail Marina')],
      ['footer.seo.buyFoxApts', search('buy', 'Fox Hills')],
      ['footer.seo.buyQetaifanLand', search('buy', 'Qetaifan')],
      ['footer.seo.buyFoxTownhouses', search('buy', 'Fox Hills')],
    ],
  },
  {
    titleKey: 'footer.seo.rentWestBay',
    links: [
      ['footer.seo.rentWestBayApts', search('rent', 'West Bay')],
      ['footer.seo.rentWestBayOffices', search('rent', 'West Bay')],
      ['footer.seo.rentWestBayFurnished', search('rent', 'West Bay')],
      ['footer.seo.rentWestBayPenthouses', search('rent', 'West Bay')],
    ],
  },
  {
    titleKey: 'footer.seo.buyVillas',
    links: [
      ['footer.seo.buyAlWaabVillas', search('buy', 'Al Waab')],
      ['footer.seo.buyLagoonVillas', search('buy', 'West Bay Lagoon')],
      ['footer.seo.buySimaismaVillas', search('buy', 'Simaisma')],
      ['footer.seo.buyRayyanVillas', search('buy', 'Al Rayyan')],
    ],
  },
]

// Navigation columns. Every target is a route registered in App.jsx — no placeholders.
const NAV_COLUMNS = [
  {
    titleKey: 'footer.discover',
    links: [
      ['footer.forRent', '/rent'],
      ['footer.forSale', '/buy'],
      ['footer.newDevelopments', '/developments'],
      ['footer.areas', '/areas'],
      ['footer.offMarket', '/off-market-opportunities'],
    ],
  },
  {
    titleKey: 'footer.company',
    links: [
      ['footer.aboutUs', '/about-us'],
      ['footer.findAgent', '/find-agent'],
      ['footer.careers', '/careers'],
      ['footer.contact', '/contact-us'],
    ],
  },
  {
    titleKey: 'footer.resources',
    links: [
      ['footer.listYourProperty', '/list-property'],
      ['footer.newDevelopments', '/developments'],
      ['footer.areaGuides', '/areas'],
      ['footer.careers', '/careers'],
    ],
  },
]

// A social handle counts as configured only when it is an absolute URL. company.js ships
// these as '#', which is a placeholder, not a destination — so nothing is rendered until
// real profile URLs are filled in. Better an absent row than a link that goes nowhere.
const isRealUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v.trim())

export default function Footer() {
  const { settings } = useData()
  const { t, isRTL } = useI18n()

  const socials = [
    ['Instagram', settings.instagram],
    ['LinkedIn', settings.linkedin],
    ['YouTube', settings.youtube],
    ['X', settings.x],
  ].filter(([, url]) => isRealUrl(url))

  return (
    <footer className="bg-ink text-neutral-300">
      {/* SEO links — each one runs a real filtered search on /rent or /buy */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 border-b border-white/8 text-sm">
        {SEO_COLUMNS.map(col => (
          <div key={col.titleKey}>
            <h4 className="text-white font-medium mb-3">{t(col.titleKey)}</h4>
            <ul className="space-y-2">
              {col.links.map(([labelKey, to], i) => (
                <li key={labelKey + i}><Link to={to} className="hover:text-primary text-neutral-400 transition-colors">{t(labelKey)}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* main footer */}
      <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          {/* Full logo lockup (with the Arabic line) — knockout variant for the dark footer. */}
          <img src="/brand/logo-footer.png" alt={settings.siteName} className="h-28 w-auto mb-4" />
          <p className="text-sm text-neutral-400 leading-relaxed mb-4">{settings.footerAbout}</p>
          {/* Arabic licence line. dir/lang let the browser shape and align the script correctly
              regardless of the page's direction; in the Arabic UI it simply flows in place. */}
          {settings.footerAboutAr && (
            <p dir="rtl" lang="ar" className={`text-sm text-neutral-400 leading-relaxed mb-4 ${isRTL ? '' : 'text-right'}`}>{settings.footerAboutAr}</p>
          )}
          <div className="inline-flex items-center gap-2 border border-primary/40 rounded-full px-3.5 py-1.5 text-xs text-primary"><IconAward className="w-3.5 h-3.5" /> {t('footer.award')}</div>
        </div>
        {NAV_COLUMNS.map(col => (
          <div key={col.titleKey}>
            <h4 className="text-white font-semibold text-sm mb-4">{t(col.titleKey)}</h4>
            <ul className="space-y-2 text-sm">
              {col.links.map(([labelKey, to], i) => <li key={labelKey + i}><Link to={to} className="hover:text-primary text-neutral-400 brand-link">{t(labelKey)}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* socials + bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          {socials.length > 0 && (
            <div className="flex gap-4 text-neutral-400">
              {socials.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noreferrer noopener" className="hover:text-primary transition-colors">{name}</a>
              ))}
            </div>
          )}
          <div className="text-center md:text-start">
            <div>© {new Date().getFullYear()} {settings.siteName}. {t('footer.rights')}</div>
            {settings.taxNumber && <div className="mt-1">{t('footer.taxNumber', { n: settings.taxNumber })}</div>}
          </div>
          {/* Privacy / Terms / Cookies deliberately absent: no such routes exist in App.jsx,
              and a link to nowhere is worse than no link. Add the routes, then add them here. */}
          <a href={`mailto:${settings.email}`} className="hover:text-primary transition-colors">{settings.email}</a>
        </div>
      </div>
    </footer>
  )
}
