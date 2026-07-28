import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import PropertyCard from '../components/PropertyCard'
import { SectionHeading, EmptyState } from '../components/ui'
import { InquiryForm } from '../components/misc'

export function DevelopmentsIndex() {
  const { developments } = useData()
  const [areaFilter, setAreaFilter] = useState('')
  const areasList = [...new Set(developments.map(d => d.area))]
  const items = areaFilter ? developments.filter(d => d.area === areaFilter) : developments

  return (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
      <div className="eyebrow mb-2">Off-plan & new launches</div>
      <h1 className="h-serif text-4xl mb-8">New Developments in Qatar</h1>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-8">
        <button onClick={() => setAreaFilter('')} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${!areaFilter ? 'bg-ink text-gold border-ink' : 'border-neutral-300 hover:border-gold'}`}>All areas</button>
        {areasList.map(a => (
          <button key={a} onClick={() => setAreaFilter(a === areaFilter ? '' : a)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${areaFilter === a ? 'bg-ink text-gold border-ink' : 'border-neutral-300 hover:border-gold'}`}>{a}</button>
        ))}
      </div>
      {items.length === 0 ? <EmptyState message="No developments in this area yet." /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(d => (
            <Link key={d.id} to={`/development/${d.slug}`} className="group relative h-96 overflow-hidden lift">
              <img src={d.coverImage} alt={d.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-5 text-white">
                <div className="text-gold text-xs uppercase tracking-wider mb-1">Available from {d.deliveryYear}</div>
                <h3 className="h-serif text-2xl">{d.name}</h3>
                <p className="text-sm text-neutral-300">{d.area} · by {d.developer}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function DevelopmentDetail() {
  const { slug } = useParams()
  const { developments, properties } = useData()
  const d = developments.find(x => x.slug === slug)
  if (!d) return <div className="pt-32 text-center pb-20"><h1 className="h-serif text-3xl">Development not found</h1></div>

  const units = properties.filter(p => p.area === d.area && p.offPlan && p.status === 'available')

  return (
    <div>
      <section className="relative h-[60vh] min-h-[420px] flex items-end">
        <img src={d.coverImage} alt={d.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 pb-12 text-white w-full">
          <div className="text-gold text-xs uppercase tracking-[0.25em] mb-2">Delivery {d.deliveryYear} · {d.area}</div>
          <h1 className="h-serif text-4xl md:text-5xl">{d.name}</h1>
          <p className="text-neutral-300 mt-1">by {d.developer}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-14 grid lg:grid-cols-[1fr_340px] gap-10">
        <div>
          <p className="text-neutral-700 leading-relaxed text-lg mb-10">{d.description}</p>
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[['Units', d.unitsCount], ['Payment plan', d.paymentPlan], ['Starting price', d.startingPrice ? `${d.startingPrice.toLocaleString()} QAR` : '—']].map(([k, v]) => (
              <div key={k} className="border border-neutral-200 p-5 text-center">
                <div className="eyebrow !text-[10px] mb-1">{k}</div>
                <div className="h-serif text-xl">{v}</div>
              </div>
            ))}
          </div>
          <SectionHeading eyebrow="Inventory" title="Available Units" />
          {units.length === 0
            ? <EmptyState message="Units for this project are released in phases — register interest for the next release." />
            : <div className="grid md:grid-cols-2 gap-6">{units.map(p => <PropertyCard key={p.id} p={p} />)}</div>}
        </div>
        <aside className="lg:sticky lg:top-24 h-fit border border-neutral-200 p-5">
          <h3 className="h-serif text-xl mb-4">Register your interest</h3>
          <InquiryForm compact source={`Development: ${d.name}`} />
        </aside>
      </div>
    </div>
  )
}
