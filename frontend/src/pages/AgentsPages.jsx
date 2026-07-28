import { Link, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import PropertyCard from '../components/PropertyCard'
import { SectionHeading, Star, WhatsAppIcon } from '../components/ui'
import { IconMail, IconPhone } from '../components/icons'
import { InquiryForm } from '../components/misc'

export function AgentsIndex() {
  const { agents } = useData()
  return (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
      <div className="eyebrow mb-2">Our people</div>
      <h1 className="h-serif text-4xl mb-10">Work with Qatar's greatest real estate agents</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {agents.filter(a => a.active).map(a => (
          <div key={a.id} className="card lift overflow-hidden group">
            <Link to={`/find-agent/${a.slug}`} className="block overflow-hidden">
              <img src={a.photo} alt={a.name} className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" />
            </Link>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="h-serif text-lg">{a.name}</h3>
                <span className="text-gold text-sm flex items-center gap-1"><Star />{a.rating > 0 ? `${a.rating.toFixed(1)} /5` : ''}</span>
              </div>
              <p className="text-sm text-neutral-500">{a.title}</p>
              <p className="text-xs text-neutral-400 mb-3">Doha, Qatar</p>
              <Link to={`/find-agent/${a.slug}`} className="gold-link text-gold text-sm">Start working with {a.name.split(' ')[0]}</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AgentProfile() {
  const { slug } = useParams()
  const { agents, properties } = useData()
  const a = agents.find(x => x.slug === slug)
  if (!a) return <div className="pt-32 text-center pb-20"><h1 className="h-serif text-3xl">Agent not found</h1></div>

  const listings = properties.filter(p => p.agentId === a.id && p.status === 'available')

  return (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
      <div className="grid md:grid-cols-[300px_1fr] gap-10 mb-14">
        <img src={a.photo} alt={a.name} className="w-full h-80 object-cover rounded-xl" />
        <div>
          <h1 className="h-serif text-4xl mb-1">{a.name}</h1>
          <p className="text-neutral-500 mb-2">{a.title}</p>
          {a.rating > 0 && <div className="text-gold flex items-center gap-1 mb-4"><Star /> {a.rating.toFixed(1)} /5 · verified reviews</div>}
          <p className="text-neutral-700 leading-relaxed max-w-xl mb-6">{a.bio}</p>
          <div className="flex flex-wrap gap-3">
            <a href={`tel:${a.phone}`} className="btn-dark"><IconPhone className="w-4 h-4" /> Call</a>
            <a href={`https://wa.me/${a.whatsapp}`} target="_blank" rel="noreferrer" className="bg-[#25d366] hover:bg-[#1fb958] text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"><WhatsAppIcon /> WhatsApp</a>
            <a href={`mailto:${a.email}`} className="btn-outline"><IconMail className="w-4 h-4" /> Email</a>
          </div>
        </div>
      </div>

      <SectionHeading eyebrow="Portfolio" title={`Listings by ${a.name.split(' ')[0]}`} />
      {listings.length === 0
        ? <p className="text-neutral-500 mb-10">No live listings right now — inquire below for off-market options.</p>
        : <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">{listings.map(p => <PropertyCard key={p.id} p={p} />)}</div>}

      <div className="max-w-lg">
        <h2 className="h-serif text-2xl mb-4">Message {a.name.split(' ')[0]}</h2>
        <InquiryForm agentId={a.id} source="Agent contact" />
      </div>
    </div>
  )
}
