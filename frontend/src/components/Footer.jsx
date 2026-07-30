import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { brandParts } from '../config/company'
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
// ---------------------------------------------------------------------------------------
const search = (purpose, q) => `/${purpose}?q=${encodeURIComponent(q)}`

const SEO_COLUMNS = [
  {
    title: 'Rent in The Pearl',
    links: [
      ['Apartments for rent in The Pearl', search('rent', 'The Pearl')],
      ['Apartments for rent in Porto Arabia', search('rent', 'Porto Arabia')],
      ['Studios for rent in Viva Bahriya', search('rent', 'Viva Bahriya')],
      ['Penthouses for rent in The Pearl', search('rent', 'Pearl')],
    ],
  },
  {
    title: 'Buy in Lusail',
    links: [
      ['Apartments for sale in Lusail Marina', search('buy', 'Lusail Marina')],
      ['Apartments for sale in Fox Hills', search('buy', 'Fox Hills')],
      ['Land for sale in Qetaifan Island', search('buy', 'Qetaifan')],
      ['Townhouses for sale in Fox Hills', search('buy', 'Fox Hills')],
    ],
  },
  {
    title: 'Rent in West Bay',
    links: [
      ['Apartments for rent in West Bay', search('rent', 'West Bay')],
      ['Offices for rent in West Bay', search('rent', 'West Bay')],
      ['Furnished rentals in West Bay', search('rent', 'West Bay')],
      ['Penthouses for rent in West Bay', search('rent', 'West Bay')],
    ],
  },
  {
    title: 'Buy Villas',
    links: [
      ['Villas for sale in Al Waab', search('buy', 'Al Waab')],
      ['Villas for sale in West Bay Lagoon', search('buy', 'West Bay Lagoon')],
      ['Beachfront villas in Simaisma', search('buy', 'Simaisma')],
      ['Compound villas in Al Rayyan', search('buy', 'Al Rayyan')],
    ],
  },
]

// Navigation columns. Every target is a route registered in App.jsx — no placeholders.
const NAV_COLUMNS = [
  {
    title: 'Discover',
    links: [
      ['For Rent', '/rent'],
      ['For Sale', '/buy'],
      ['New Developments', '/developments'],
      ['Areas', '/areas'],
      ['Off-Market', '/off-market-opportunities'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About Us', '/about-us'],
      ['Find an Agent', '/find-agent'],
      ['Careers', '/careers'],
      ['Contact', '/contact-us'],
    ],
  },
  {
    title: 'Resources',
    links: [
      ['List Your Property', '/list-property'],
      ['New Developments', '/developments'],
      ['Area Guides', '/areas'],
      ['Careers', '/careers'],
    ],
  },
]

// A social handle counts as configured only when it is an absolute URL. company.js ships
// these as '#', which is a placeholder, not a destination — so nothing is rendered until
// real profile URLs are filled in. Better an absent row than a link that goes nowhere.
const isRealUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v.trim())

export default function Footer() {
  const { settings } = useData()
  const [brandFirst, brandRest] = brandParts(settings.siteName)

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
          <div key={col.title}>
            <h4 className="text-white font-medium mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map(([label, to]) => (
                <li key={label}><Link to={to} className="hover:text-primary text-neutral-400 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* main footer */}
      <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="h-serif text-xl text-white mb-4">{brandFirst} <span className="text-primary">{brandRest}</span></div>
          <p className="text-sm text-neutral-400 leading-relaxed mb-4">{settings.footerAbout}</p>
          {/* Arabic licence line. dir/lang let the browser shape and align the script correctly
              regardless of the page's left-to-right direction. */}
          {settings.footerAboutAr && (
            <p dir="rtl" lang="ar" className="text-sm text-neutral-400 leading-relaxed mb-4 text-right">{settings.footerAboutAr}</p>
          )}
          <div className="inline-flex items-center gap-2 border border-primary/40 rounded-full px-3.5 py-1.5 text-xs text-primary"><IconAward className="w-3.5 h-3.5" /> Qatar Luxury Brokerage of the Year</div>
        </div>
        {NAV_COLUMNS.map(col => (
          <div key={col.title}>
            <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
            <ul className="space-y-2 text-sm">
              {col.links.map(([label, to]) => <li key={label}><Link to={to} className="hover:text-primary text-neutral-400 brand-link">{label}</Link></li>)}
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
          <div className="text-center md:text-left">
            <div>© {new Date().getFullYear()} {settings.siteName}. All rights reserved.</div>
            {settings.taxNumber && <div className="mt-1">Tax Number: {settings.taxNumber}</div>}
          </div>
          {/* Privacy / Terms / Cookies deliberately absent: no such routes exist in App.jsx,
              and a link to nowhere is worse than no link. Add the routes, then add them here. */}
          <a href={`mailto:${settings.email}`} className="hover:text-primary transition-colors">{settings.email}</a>
        </div>
      </div>
    </footer>
  )
}
