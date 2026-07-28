import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useData } from '../store/DataContext'
import { useToast } from '../components/Toast'
import { InquiryForm, LogoMarquee } from '../components/misc'
import { WhatsAppIcon } from '../components/ui'
import { IconCheck, IconMail, IconMap, IconPhone } from '../components/icons'
import { PROPERTY_TYPES } from '../data/mockData'

const OFFICE = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80'

export function AboutUs() {
  const { settings } = useData()
  return (
    <div>
      <section className="relative h-[50vh] min-h-[360px] flex items-end">
        <img src={OFFICE} alt="Our office" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 pb-12 text-white w-full">
          <div className="eyebrow mb-2">About us</div>
          <h1 className="h-serif text-4xl md:text-5xl">The reference for Qatar's finest homes</h1>
        </div>
      </section>
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-6 text-neutral-700 leading-relaxed">
        <p>{settings.siteName} began with a simple observation: Qatar's property market deserved the same standard of service as its architecture. What started as a three-person office in West Bay is today the portal of record for the country's premium districts.</p>
        <p>We verify before we list, we answer before you ask twice, and we treat every transaction — a studio lease or a beachfront estate — as a future reference.</p>
        <div className="grid sm:grid-cols-3 gap-4 !mt-10">
          {[['Trust', 'Verified listings, transparent data'], ['Speed', 'Response inside one business hour'], ['Discretion', 'Off-market handled quietly']].map(([t, d]) => (
            <div key={t} className="card p-5 text-center">
              <div className="h-serif text-xl text-gold mb-1">{t}</div>
              <div className="text-xs text-neutral-500">{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-y border-neutral-200"><div className="max-w-7xl mx-auto px-4"><LogoMarquee /></div></div>
      <div className="text-center py-16">
        <h2 className="h-serif text-3xl mb-4">Meet the people behind the portfolio</h2>
        <Link to="/find-agent" className="btn-gold">Meet the Team</Link>
      </div>
    </div>
  )
}

export function ContactUs() {
  const { settings } = useData()
  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4">
      <div className="eyebrow mb-2">Contact</div>
      <h1 className="h-serif text-4xl mb-10">We're at your service</h1>
      <div className="grid lg:grid-cols-2 gap-10">
        <div>
          <InquiryForm source="Contact page" />
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="h-serif text-xl mb-2">Head Office</h3>
            <p className="text-neutral-600 text-sm">Tornado Tower, Floor 22<br />West Bay, Doha, Qatar</p>
          </div>
          <div className="card h-52 bg-neutral-100 flex items-center justify-center gap-2 text-neutral-400"><IconMap className="w-5 h-5" /> Map placeholder</div>
          <div className="flex flex-wrap gap-3">
            <a href={`tel:${settings.phone}`} className="btn-dark"><IconPhone className="w-4 h-4" /> {settings.phone}</a>
            <a href={`https://wa.me/${settings.whatsapp}`} className="bg-[#25d366] hover:bg-[#1fb958] text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"><WhatsAppIcon /> WhatsApp</a>
            <a href={`mailto:${settings.email}`} className="btn-outline"><IconMail className="w-4 h-4" /> {settings.email}</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ListProperty() {
  const { addInquiry } = useData()
  const toast = useToast()
  const [f, setF] = useState({ name: '', phone: '', email: '', type: 'Apartment', purpose: 'buy', location: '', message: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4">
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <div className="eyebrow mb-2">Owners & landlords</div>
          <h1 className="h-serif text-4xl mb-6">List your property with us</h1>
          <ul className="space-y-4 text-neutral-700">
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>Qualified buyers, not clicks</b> — inquiries are screened before they reach you.</span></li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>Professional media included</b> — photography, floor plans and video at our cost.</span></li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>Priced from evidence</b> — valuations built on closed transactions, not hopes.</span></li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>One point of contact</b> — a named consultant owns your listing end to end.</span></li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>Off-market on request</b> — sell quietly to our private client list.</span></li>
          </ul>
        </div>
        <form className="card p-6 space-y-3" onSubmit={e => {
          e.preventDefault()
          addInquiry({ name: f.name, phone: f.phone, email: f.email, message: `[${f.purpose}] ${f.type} in ${f.location}: ${f.message}`, source: 'List your property' })
          toast('Received — a consultant will call you today.')
          setF({ name: '', phone: '', email: '', type: 'Apartment', purpose: 'buy', location: '', message: '' })
        }}>
          <h2 className="h-serif text-xl">Tell us about your property</h2>
          <input required placeholder="Full name" className="field" value={f.name} onChange={set('name')} />
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Phone" className="field" value={f.phone} onChange={set('phone')} />
            <input required type="email" placeholder="Email" className="field" value={f.email} onChange={set('email')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="field" value={f.type} onChange={set('type')}>{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            <select className="field" value={f.purpose} onChange={set('purpose')}>
              <option value="buy">For Sale</option><option value="rent">For Rent</option>
            </select>
          </div>
          <input required placeholder="Location (area / district)" className="field" value={f.location} onChange={set('location')} />
          <textarea placeholder="Anything else we should know?" rows="3" className="field" value={f.message} onChange={set('message')} />
          <button className="btn-gold w-full">Request a Valuation</button>
        </form>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="min-h-[70vh] bg-ink text-white flex flex-col items-center justify-center text-center px-4 pt-16">
      <div className="h-serif text-8xl text-gold mb-4">404</div>
      <h1 className="h-serif text-3xl mb-3">This address doesn't exist</h1>
      <p className="text-neutral-400 mb-8">The page you're looking for has moved, sold, or never listed.</p>
      <Link to="/" className="btn-gold">Back to the homepage</Link>
    </div>
  )
}
