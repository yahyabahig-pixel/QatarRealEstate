import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { mailHref } from '../lib/contact'
import { IconAward } from './icons'

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
    <footer className="qre-site-footer bg-ink text-neutral-300">
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
          {/* Rendered only when a real address is configured. It used to print
              "hello@almadenah.example" — a reserved TLD that can never receive mail — as
              the company's public contact address on every page. */}
          {mailHref(settings.email) && (
            <a href={mailHref(settings.email)} className="hover:text-primary transition-colors">{settings.email}</a>
          )}
        </div>
      </div>
    </footer>
  )
}
