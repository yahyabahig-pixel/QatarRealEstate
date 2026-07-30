import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../store/DataContext'
import PropertyCard from '../components/PropertyCard'
import { SectionHeading, Star } from '../components/ui'
import { LogoMarquee } from '../components/misc'
import { IconArrowRight, IconSearch } from '../components/icons'

// ---------------------------------------------------------------------------------------
// HERO PHOTOGRAPHY
// The West Bay skyline across Doha Bay — the one view that reads as Qatar instantly.
// Served larger and at a higher quality than a card image because it fills the viewport.
//
// The photo is not relied on to match the brand: the two overlays below do that. An indigo
// (#2B2D42) gradient unifies the whole frame and guarantees white text stays legible on any
// crop, and a soft red bloom in the lower third ties the image to the primary accent. Swap
// HERO for any of the ALT_HEROES and the composition still lands in palette.
// ---------------------------------------------------------------------------------------
const heroUrl = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2400&q=85`

const HERO = heroUrl('1646207795621-733fe1646f9b')   // Qatar flag, National Museum of Qatar, Doha
// Fallbacks, all Qatar, so a fallback can never substitute another city for the hero.
const ALT_HEROES = [
  heroUrl('1577717903315-1691ae25ab3f'),             // Doha / West Bay skyline
  heroUrl('1507904139316-3c7422a97a49'),             // Doha skyline at blue hour
  heroUrl('1662050196100-6f8afc83d585'),             // Doha skyline across the bay
]

// The requested "blur 70%". CSS blur takes a length, not a percentage, so it is expressed here
// as a single tunable constant: 70% of a 20px ceiling. Turn it down towards 0px to sharpen the
// photograph, or up for a softer backdrop — nothing else needs touching.
const HERO_BLUR = '14px'

// [label, destination]. Previously a single `p.includes('Rental')` test sent four of these
// five to an unfiltered /buy, so "Villas in Al Waab" and "Land in Qetaifan Island" led to
// the same undifferentiated page. `q` is matched against title + area + district + city by
// Listings.jsx, and works in mock and live mode alike.
const PILLS = [
  ['Apartments in Porto Arabia', '/buy?q=Porto+Arabia'],
  ['Rentals in West Bay', '/rent?q=West+Bay'],
  ['Villas in Al Waab', '/buy?q=Al+Waab'],
  ['Off-plan in Lusail', '/buy?q=Lusail'],
  ['Land in Qetaifan Island', '/buy?q=Qetaifan'],
]

export default function Home() {
  const { properties, developments, areas, agents, areaCount, propertyTypes } = useData()
  const navigate = useNavigate()
  const [tab, setTab] = useState('rent')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [price, setPrice] = useState('')

  const featured = properties.filter(p => p.exclusive && p.status === 'available').slice(0, 8)
  const trendingAreas = areas.slice(0, 4)
  const topAgents = agents.filter(a => a.active).slice(0, 4)

  const stats = [
    [properties.length.toLocaleString() + '+', 'Curated listings'],
    [areas.length, 'Prime districts'],
    [developments.length, 'New developments'],
    [agents.filter(a => a.active).length, 'Expert consultants'],
  ]

  const search = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type) params.set('type', type)
    if (price) params.set('maxPrice', price)
    navigate(`/${tab}?${params}`)
  }

  return (
    <>
      {/* HERO */}
      <section className="relative h-screen min-h-[680px] flex items-center justify-center overflow-hidden">
        <img
          src={HERO}
          alt="The West Bay skyline across Doha Bay, Qatar"
          fetchPriority="high"
          /* If the primary crop ever stops resolving, fall through the alternates rather than
             leaving a bare indigo panel. Each onError advances one step and then stops. */
          onError={(e) => {
            const i = Number(e.currentTarget.dataset.fallback || 0)
            if (i < ALT_HEROES.length) {
              e.currentTarget.dataset.fallback = String(i + 1)
              e.currentTarget.src = ALT_HEROES[i]
            }
          }}
          /* scale-115 (not 105) because a blur samples past the element's edges and would
             otherwise feather them into the background — the overscan hides that entirely. */
          style={{ filter: `blur(${HERO_BLUR})` }}
          className="absolute inset-0 w-full h-full object-cover scale-115"
        />
        {/* indigo unifier — carries the brand dark and keeps white type legible on any crop */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/55 to-ink/90" />
        {/* red bloom — ties the photograph to the primary accent without tinting faces or sky */}
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[52rem] h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative text-center text-white px-4 w-full max-w-3xl">
          <div className="eyebrow !text-white/90 mb-4">Doha · Lusail · The Pearl</div>
          <h1 className="h-serif text-4xl md:text-6xl leading-[1.08] mb-4">
            Qatar's Most Exclusive<br />Real Estate Portal
          </h1>
          <p className="text-white/70 text-sm md:text-base mb-8 max-w-xl mx-auto">
            Buy and rent apartments, villas, penthouses and offices across Qatar's finest addresses.
          </p>

          <div className="bg-white text-neutral-900 shadow-2xl shadow-ink/40 rounded-2xl overflow-hidden text-left">
            <div className="flex gap-1 p-2 pb-0">
              {['rent', 'buy'].map(t => (
                <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}
                  className={`flex-1 py-2.5 text-sm font-semibold capitalize rounded-xl transition-colors ${tab === t ? 'bg-ink text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}`}>
                  {t === 'rent' ? 'For Rent' : 'For Sale'}
                </button>
              ))}
            </div>
            <form onSubmit={search} className="p-4 grid md:grid-cols-[1fr_auto_auto_auto] gap-3">
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Location, area, or keyword…" className="field" />
              <select value={type} onChange={e => setType(e.target.value)} className="field md:w-44">
                <option value="">Property type</option>
                {propertyTypes.map(t => <option key={t.id}>{t.name}</option>)}
              </select>
              <select value={price} onChange={e => setPrice(e.target.value)} className="field md:w-40">
                <option value="">Max price</option>
                {(tab === 'rent' ? [5000, 10000, 20000, 50000] : [1000000, 3000000, 6000000, 15000000]).map(v =>
                  <option key={v} value={v}>{v.toLocaleString()} QAR</option>)}
              </select>
              <button className="btn-primary"><IconSearch className="w-4 h-4" /> Search</button>
            </form>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {PILLS.map(([label, to]) => (
              <Link key={label} to={to}
                className="border border-white/25 bg-white/5 backdrop-blur rounded-full px-4 py-1.5 text-xs font-medium hover:border-white hover:bg-white/15 transition-colors">{label}</Link>
            ))}
          </div>
        </div>

        {/* STATISTICS — anchored to the hero's bottom edge */}
        <div className="absolute bottom-0 inset-x-0 hidden md:block">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 text-white">
              {stats.map(([v, k]) => (
                <div key={k} className="py-6 text-center">
                  <div className="h-serif text-3xl">{v}</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/60 mt-1">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DEVELOPMENTS SLIDER */}
      <section className="bg-ink text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading dark eyebrow="Off-plan & new launches" title="Unlock High-Value Investment Opportunities"
            subtitle="Escrow-backed projects from Qatar's most trusted developers." link="/developments" linkLabel="All developments" />
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 snap-x">
            {developments.map(d => (
              <Link key={d.id} to={`/development/${d.slug}`} className="relative shrink-0 w-80 h-96 overflow-hidden rounded-2xl group snap-start">
                <img src={d.coverImage} alt={d.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/25 to-transparent" />
                <div className="absolute bottom-0 p-5">
                  <div className="text-white/80 text-xs uppercase tracking-wider mb-1">Available from {d.deliveryYear}</div>
                  <h3 className="h-serif text-2xl">{d.name}</h3>
                  <p className="text-sm text-neutral-300">{d.area}</p>
                  <span className="inline-flex items-center gap-1.5 mt-3 text-primary text-xs font-semibold uppercase tracking-wider opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                    Explore project <IconArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <SectionHeading eyebrow="Hand-picked" title="Featured Properties"
          subtitle="An exclusive selection of Qatar's most remarkable homes, verified and listed by our senior consultants." link="/buy" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map(p => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* PARTNERS */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center eyebrow pt-10">Trusted by Leading Partners & Developers</p>
          <LogoMarquee />
        </div>
      </section>

      {/* TRENDING AREAS */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <SectionHeading eyebrow="Where Qatar is moving" title="Explore Qatar's Trending Areas"
          subtitle="Neighbourhood guides for the districts shaping the market." link="/areas" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingAreas.map(a => (
            <Link key={a.id} to={`/areas/${a.slug}`} className="relative h-80 overflow-hidden rounded-2xl group lift">
              <img src={a.photo} alt={a.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent" />
              <div className="absolute bottom-0 p-5 text-white">
                <h3 className="h-serif text-xl">{a.name}</h3>
                <p className="text-sm text-neutral-300">{areaCount(a.name)} properties</p>
                <span className="inline-block mt-2 text-primary text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Explore Area →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* AGENTS */}
      {topAgents.length > 0 && (
        <section className="bg-white border-t border-neutral-200 py-20">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHeading eyebrow="Our people" title="Guided by Qatar's Finest Agents"
              subtitle="Senior consultants who know every tower, compound and marina berth in their district." link="/find-agent" linkLabel="Meet the team" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topAgents.map(a => (
                <Link key={a.id} to={`/find-agent/${a.slug}`} className="card lift overflow-hidden group">
                  <div className="overflow-hidden">
                    <img src={a.photo} alt={a.name} loading="lazy" className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-[15px] text-ink truncate">{a.name}</h3>
                      {a.rating > 0 && <span className="text-primary text-xs font-semibold flex items-center gap-1 shrink-0"><Star /> {a.rating.toFixed(1)}</span>}
                    </div>
                    <p className="text-sm text-mist truncate">{a.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
