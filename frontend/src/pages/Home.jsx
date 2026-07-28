import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../store/DataContext'
import PropertyCard from '../components/PropertyCard'
import { SectionHeading } from '../components/ui'
import { LogoMarquee } from '../components/misc'
import { PROPERTY_TYPES } from '../data/mockData'

const HERO = 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?auto=format&fit=crop&w=2000&q=80'
const PILLS = ['Apartments in Porto Arabia', 'Rentals in West Bay', 'Villas in Al Waab', 'Off-plan in Lusail', 'Land in Qetaifan Island']

export default function Home() {
  const { properties, developments, areas, areaCount } = useData()
  const navigate = useNavigate()
  const [tab, setTab] = useState('rent')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [price, setPrice] = useState('')

  const featured = properties.filter(p => p.exclusive && p.status === 'available').slice(0, 8)
  const trendingAreas = areas.slice(0, 4)

  const search = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type) params.set('type', type)
    if (price) params.set('maxPrice', price)
    navigate(`/${tab === 'commercial' ? 'buy' : tab}?${params}`)
  }

  return (
    <>
      {/* HERO */}
      <section className="relative h-screen min-h-[620px] flex items-center justify-center">
        <img src={HERO} alt="Doha skyline" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative text-center text-white px-4 w-full max-w-3xl">
          <div className="eyebrow mb-4">Doha · Lusail · The Pearl</div>
          <h1 className="h-serif text-4xl md:text-6xl leading-tight mb-8">Qatar's Most Exclusive<br />Real Estate Portal</h1>

          <div className="bg-white text-neutral-900 shadow-2xl shadow-black/20 rounded-2xl overflow-hidden text-left">
            <div className="flex border-b border-neutral-200">
              {['rent', 'buy', 'commercial'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-ink text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>
                  {t}
                </button>
              ))}
            </div>
            <form onSubmit={search} className="p-4 grid md:grid-cols-[1fr_auto_auto_auto] gap-3">
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Location, area, or keyword…" className="field" />
              <select value={type} onChange={e => setType(e.target.value)} className="field md:w-44">
                <option value="">Property type</option>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select value={price} onChange={e => setPrice(e.target.value)} className="field md:w-40">
                <option value="">Max price</option>
                {(tab === 'rent' ? [5000, 10000, 20000, 50000] : [1000000, 3000000, 6000000, 15000000]).map(v =>
                  <option key={v} value={v}>{v.toLocaleString()} QAR</option>)}
              </select>
              <button className="btn-gold">Search</button>
            </form>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {PILLS.map(p => (
              <Link key={p} to={p.includes('Rental') ? '/rent' : '/buy'}
                className="border border-white/25 bg-white/5 backdrop-blur rounded-full px-4 py-1.5 text-xs font-medium hover:border-gold hover:text-gold transition-colors">{p}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* DEVELOPMENTS SLIDER */}
      <section className="bg-ink text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading dark eyebrow="Off-plan & new launches" title="Unlock High-Value Investment Opportunities" link="/developments" linkLabel="All developments" />
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 snap-x">
            {developments.map(d => (
              <Link key={d.id} to={`/development/${d.slug}`} className="relative shrink-0 w-80 h-96 overflow-hidden rounded-xl group snap-start">
                <img src={d.coverImage} alt={d.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-0 p-5">
                  <div className="text-gold text-xs uppercase tracking-wider mb-1">Available from {d.deliveryYear}</div>
                  <h3 className="h-serif text-2xl">{d.name}</h3>
                  <p className="text-sm text-neutral-300">{d.area}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <SectionHeading eyebrow="Hand-picked" title="Featured Properties" link="/buy" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map(p => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* PARTNERS */}
      <section className="border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center eyebrow pt-10">Trusted by Leading Partners & Developers</p>
          <LogoMarquee />
        </div>
      </section>

      {/* TRENDING AREAS */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <SectionHeading eyebrow="Where Qatar is moving" title="Explore Qatar's Trending Areas" link="/areas" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingAreas.map(a => (
            <Link key={a.id} to={`/areas/${a.slug}`} className="relative h-80 overflow-hidden rounded-xl group lift">
              <img src={a.photo} alt={a.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 p-5 text-white">
                <h3 className="h-serif text-xl">{a.name}</h3>
                <p className="text-sm text-neutral-300">{areaCount(a.name)} properties</p>
                <span className="inline-block mt-2 text-gold text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Explore Area →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
