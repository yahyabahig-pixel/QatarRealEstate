import { useState } from 'react'
import { useData } from '../store/DataContext'
import { useToast } from './Toast'
import { WhatsAppIcon } from './ui'

export default function CtaBand() {
  const { settings } = useData()
  const toast = useToast()
  const [email, setEmail] = useState('')
  return (
    <section className="bg-coal text-white py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="h-serif text-3xl md:text-4xl text-center mb-12">Stay Ahead of Qatar's Real Estate Market</h2>
        <div className="grid md:grid-cols-3 gap-10 text-center">
          <div>
            <div className="eyebrow mb-4">Download our Mobile App</div>
            <div className="flex justify-center gap-3">
              {['App Store', 'Google Play'].map(store => (
                <a key={store} href="#" className="border border-neutral-600 px-4 py-2.5 text-sm flex items-center gap-2 hover:border-gold hover:text-gold transition-colors">
                  <span className="text-lg">{store === 'App Store' ? '' : '▶'}</span>
                  <span className="text-left leading-tight"><span className="block text-[10px] text-neutral-400">Get it on</span>{store}</span>
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="eyebrow mb-4">Join our WhatsApp Channel</div>
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-2.5 text-sm transition-colors">
              <WhatsAppIcon /> Join the Channel
            </a>
          </div>
          <div>
            <div className="eyebrow mb-4">Market Newsletter</div>
            <form className="flex max-w-xs mx-auto" onSubmit={e => { e.preventDefault(); toast('Subscribed — welcome aboard!'); setEmail('') }}>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="Your email"
                className="flex-1 bg-ink border border-neutral-700 px-3 py-2.5 text-sm outline-none focus:border-gold" />
              <button className="btn-gold !py-2.5">Subscribe</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
