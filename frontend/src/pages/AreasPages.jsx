import { Link, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import PropertyCard from '../components/PropertyCard'
import { SectionHeading, EmptyState } from '../components/ui'

export function AreasIndex() {
  const { areas, areaCount } = useData()
  return (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
      <div className="eyebrow mb-2">Neighbourhood guides</div>
      <h1 className="h-serif text-4xl mb-8">Explore Qatar's Areas</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map(a => (
          <Link key={a.id} to={`/areas/${a.slug}`} className="group relative h-72 overflow-hidden lift">
            <img src={a.photo} alt={a.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-0 p-5 text-white">
              <h3 className="h-serif text-2xl">{a.name}</h3>
              <p className="text-sm text-neutral-300">{areaCount(a.name)} properties</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AreaDetail() {
  const { slug } = useParams()
  const { areas, properties } = useData()
  const a = areas.find(x => x.slug === slug)
  if (!a) return <div className="pt-32 text-center pb-20"><h1 className="h-serif text-3xl">Area not found</h1></div>

  const all = properties.filter(p => p.area === a.name && p.status === 'available')
  const forRent = all.filter(p => p.purpose === 'rent')
  const forSale = all.filter(p => p.purpose === 'buy')

  return (
    <div>
      <section className="relative h-[55vh] min-h-[380px] flex items-end">
        <img src={a.photo} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 pb-12 text-white w-full">
          <div className="eyebrow mb-2">Area guide</div>
          <h1 className="h-serif text-4xl md:text-5xl">{a.name}</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <p className="max-w-3xl text-lg text-neutral-700 leading-relaxed mb-10">{a.intro}</p>
        <div className="grid sm:grid-cols-3 gap-4 max-w-xl mb-14">
          {[['Total properties', all.length], ['For rent', forRent.length], ['For sale', forSale.length]].map(([k, v]) => (
            <div key={k} className="border border-neutral-200 p-5 text-center">
              <div className="h-serif text-3xl text-gold">{v}</div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">{k}</div>
            </div>
          ))}
        </div>
        <SectionHeading eyebrow={a.name} title={`Properties in ${a.name}`} />
        {all.length === 0 ? <EmptyState message="No live listings in this area right now." /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">{all.map(p => <PropertyCard key={p.id} p={p} />)}</div>
        )}
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {[`Apartments for rent in ${a.name}`, `Apartments for sale in ${a.name}`, `Villas in ${a.name}`, `Penthouses in ${a.name}`].map(l => (
            <Link key={l} to={l.includes('rent') ? '/rent' : '/buy'} className="gold-link text-gold">{l}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
