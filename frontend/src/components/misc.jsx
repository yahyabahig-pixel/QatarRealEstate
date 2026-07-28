import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useToast } from './Toast'
import { PARTNER_NAMES } from '../data/mockData'
import PropertyCard from './PropertyCard'
import { SectionHeading, WhatsAppIcon } from './ui'

export function LogoMarquee({ dark = false }) {
  const logos = [...PARTNER_NAMES, ...PARTNER_NAMES]
  return (
    <div className="overflow-hidden py-10">
      <div className="marquee-track flex gap-16 w-max">
        {logos.map((name, i) => (
          <span key={i} className={`h-serif text-xl whitespace-nowrap opacity-40 grayscale hover:opacity-80 transition-opacity ${dark ? 'text-white' : 'text-neutral-700'}`}>
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

export function InquiryForm({ propertyId = null, agentId = null, source = 'Contact form', dark = false, compact = false }) {
  const { addInquiry } = useData()
  const toast = useToast()
  const [f, setF] = useState({ name: '', phone: '', email: '', message: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const cls = dark ? 'field-dark' : 'field'
  return (
    <form className="space-y-3" onSubmit={e => {
      e.preventDefault()
      addInquiry({ ...f, propertyId, agentId, source })
      toast('Inquiry sent — our team will reach out shortly.')
      setF({ name: '', phone: '', email: '', message: '' })
    }}>
      <input required placeholder="Full name" className={cls} value={f.name} onChange={set('name')} />
      <div className={compact ? 'space-y-3' : 'grid md:grid-cols-2 gap-3'}>
        <input required placeholder="Phone" className={cls} value={f.phone} onChange={set('phone')} />
        <input required type="email" placeholder="Email" className={cls} value={f.email} onChange={set('email')} />
      </div>
      <textarea required placeholder="Message" rows="3" className={cls} value={f.message} onChange={set('message')} />
      <button className="btn-gold w-full">Submit Inquiry</button>
    </form>
  )
}

export function RecentlyViewed() {
  const { recentlyViewed, properties } = useData()
  const items = recentlyViewed.map(id => properties.find(p => p.id === id)).filter(Boolean)
  if (items.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <SectionHeading eyebrow="Keep exploring" title="Recently Viewed Properties" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.slice(0, 4).map(p => <PropertyCard key={p.id} p={p} />)}
      </div>
    </section>
  )
}

export function AgentsStrip() {
  const { agents } = useData()
  return (
    <section className="bg-neutral-50 py-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex -space-x-3">
          {agents.filter(a => a.active).slice(0, 6).map(a => (
            <img key={a.id} src={a.photo} alt={a.name} className="w-12 h-12 rounded-full object-cover border-2 border-white" />
          ))}
        </div>
        <p className="text-lg h-serif text-center">Can't find the right property?</p>
        <Link to="/find-agent" className="btn-gold">Find your agent</Link>
      </div>
    </section>
  )
}

export function FloatingContact() {
  const { settings } = useData()
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2">
      {open && (
        <div className="bg-ink text-white shadow-2xl border border-neutral-800 p-3 space-y-2 text-sm w-44">
          <a href={`https://wa.me/${settings.whatsapp}`} className="flex items-center gap-2 hover:text-gold"><WhatsAppIcon /> WhatsApp</a>
          <a href="#" className="flex items-center gap-2 hover:text-gold">✈ Telegram</a>
          <a href={`mailto:${settings.email}`} className="flex items-center gap-2 hover:text-gold">✉ Email</a>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="btn-gold rounded-full !px-5 shadow-xl">
        {open ? 'Close' : "Let's talk"}
      </button>
    </div>
  )
}
