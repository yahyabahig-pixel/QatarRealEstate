import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useToast } from './Toast'
import { PARTNER_NAMES } from '../data/mockData'
import PropertyCard from './PropertyCard'
import { SectionHeading, WhatsAppIcon } from './ui'
import { IconMail, IconTelegram, IconX } from './icons'

export function LogoMarquee({ dark = false }) {
  const logos = [...PARTNER_NAMES, ...PARTNER_NAMES]
  return (
    <div className="overflow-hidden py-10">
      <div className="marquee-track flex gap-16 w-max">
        {logos.map((name, i) => (
          <span key={i} className={`font-bold tracking-tight text-xl whitespace-nowrap opacity-35 hover:opacity-70 transition-opacity ${dark ? 'text-white' : 'text-neutral-700'}`}>
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
  const [sending, setSending] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const cls = dark ? 'field-dark' : 'field'

  const submit = async (e) => {
    e.preventDefault()
    if (sending) return
    setSending(true)
    try {
      // Success is announced ONLY after the backend confirmed. On failure the form keeps
      // every value the visitor typed — they fix and retry, never re-type.
      await addInquiry({ ...f, propertyId, agentId, source })
      toast('Inquiry sent — our team will reach out shortly.')
      setF({ name: '', phone: '', email: '', message: '' })
    } catch (err) {
      toast(err?.problem?.title || 'Your inquiry could not be sent — please try again.', 'error')
    } finally { setSending(false) }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <input required placeholder="Full name" className={cls} value={f.name} onChange={set('name')} />
      <div className={compact ? 'space-y-3' : 'grid md:grid-cols-2 gap-3'}>
        <input required placeholder="Phone" className={cls} value={f.phone} onChange={set('phone')} />
        <input required type="email" placeholder="Email" className={cls} value={f.email} onChange={set('email')} />
      </div>
      <textarea required placeholder="Message" rows="3" className={cls} value={f.message} onChange={set('message')} />
      <button className="btn-primary w-full" disabled={sending}>{sending ? 'Sending…' : 'Submit Inquiry'}</button>
    </form>
  )
}

export function RecentlyViewed() {
  const { recentlyViewed, properties } = useData()
  const items = recentlyViewed.map(id => properties.find(p => p.id === id)).filter(Boolean)
  if (items.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
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
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="card flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-7">
          <div className="flex -space-x-3">
            {agents.filter(a => a.active).slice(0, 6).map(a => (
              <img key={a.id} src={a.photo} alt={a.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
            ))}
          </div>
          <p className="text-lg font-bold tracking-tight text-ink text-center">Can't find the right property?</p>
          <Link to="/find-agent" className="btn-primary">Find your agent</Link>
        </div>
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
        <div className="bg-ink text-white shadow-2xl shadow-black/25 border border-white/10 rounded-xl p-2 text-sm w-48">
          <a href={`https://wa.me/${settings.whatsapp}`} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-white/8 hover:text-primary transition-colors"><WhatsAppIcon /> WhatsApp</a>
          <a href="#" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-white/8 hover:text-primary transition-colors"><IconTelegram /> Telegram</a>
          <a href={`mailto:${settings.email}`} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-white/8 hover:text-primary transition-colors"><IconMail /> Email</a>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="btn-primary !rounded-full !px-5 shadow-xl shadow-primary/25">
        {open ? <><IconX className="w-4 h-4" /> Close</> : "Let's talk"}
      </button>
    </div>
  )
}
