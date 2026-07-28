import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { Star } from './ui'
import { IconAward } from './icons'

const SEO_COLUMNS = [
  { title: 'Rent in The Pearl', links: ['Apartments for rent in The Pearl', 'Apartments for rent in Porto Arabia', 'Studios for rent in Viva Bahriya', 'Penthouses for rent in The Pearl'] },
  { title: 'Buy in Lusail', links: ['Apartments for sale in Lusail Marina', 'Apartments for sale in Fox Hills', 'Land for sale in Qetaifan Island', 'Townhouses for sale in Fox Hills'] },
  { title: 'Rent in West Bay', links: ['Apartments for rent in West Bay', 'Offices for rent in West Bay', 'Furnished rentals in West Bay', 'Penthouses for rent in West Bay'] },
  { title: 'Buy Villas', links: ['Villas for sale in Al Waab', 'Villas for sale in West Bay Lagoon', 'Beachfront villas in Simaisma', 'Compound villas in Al Rayyan'] },
]

export default function Footer() {
  const { settings } = useData()
  return (
    <footer className="bg-ink text-neutral-300">
      {/* SEO links */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 border-b border-white/8 text-sm">
        {SEO_COLUMNS.map(col => (
          <div key={col.title}>
            <h4 className="text-white font-medium mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map(l => (
                <li key={l}><Link to={l.includes('rent') ? '/rent' : '/buy'} className="hover:text-gold text-neutral-400">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* main footer */}
      <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="h-serif text-xl text-white mb-4">{settings.siteName.split(' ')[0]} <span className="text-gold">{settings.siteName.split(' ').slice(1).join(' ')}</span></div>
          <p className="text-sm text-neutral-400 leading-relaxed mb-4">{settings.footerAbout}</p>
          <div className="inline-flex items-center gap-2 border border-gold/40 rounded-full px-3.5 py-1.5 text-xs text-gold mb-3"><IconAward className="w-3.5 h-3.5" /> Qatar Luxury Brokerage of the Year</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex text-gold">{[...Array(5)].map((_, i) => <Star key={i} />)}</span>
            <span className="text-white font-medium">{settings.googleRating}</span>
            <span className="text-neutral-500">({settings.googleReviews} Google reviews)</span>
          </div>
        </div>
        {[
          { title: 'Discover', links: [['For Rent', '/rent'], ['For Sale', '/buy'], ['New Developments', '/developments'], ['Areas', '/areas'], ['Off-Market', '/off-market-opportunities']] },
          { title: 'Company', links: [['About Us', '/about-us'], ['Find an Agent', '/find-agent'], ['Careers', '/careers'], ['Contact', '/contact-us']] },
          { title: 'Resources', links: [['List Your Property', '/list-property'], ['New Developments', '/developments'], ['Area Guides', '/areas'], ['Careers', '/careers']] },
        ].map(col => (
          <div key={col.title}>
            <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
            <ul className="space-y-2 text-sm">
              {col.links.map(([label, to]) => <li key={label}><Link to={to} className="hover:text-gold text-neutral-400 gold-link">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* socials + bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex gap-4 text-neutral-400">
            {['Instagram', 'LinkedIn', 'YouTube', 'X'].map(s => <a key={s} href="#" className="hover:text-gold">{s}</a>)}
          </div>
          <div>© {new Date().getFullYear()} {settings.siteName}. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gold">Privacy</a><a href="#" className="hover:text-gold">Terms</a><a href="#" className="hover:text-gold">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
