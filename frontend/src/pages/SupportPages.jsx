import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { telHref, whatsAppHref, mailHref } from '../lib/contact'
import { useToast } from '../components/Toast'
import { InquiryForm, LogoMarquee } from '../components/misc'
import { WhatsAppIcon } from '../components/ui'
import { IconCheck, IconMail, IconMap, IconPhone } from '../components/icons'
import LocationPicker from '../components/LocationPicker'
import { PROPERTY_TYPES } from '../data/mockData'

const OFFICE = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80'

export function AboutUs() {
  const { settings } = useData()
  const { t } = useI18n()
  return (
    <div>
      <section className="relative h-[50vh] min-h-[360px] flex items-end">
        <img src={OFFICE} alt="Our office" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 pb-12 text-white w-full">
          <div className="eyebrow mb-2">{t('support.aboutEyebrow')}</div>
          <h1 className="h-serif text-4xl md:text-5xl">{t('support.aboutTitle')}</h1>
        </div>
      </section>
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-6 text-neutral-700 leading-relaxed">
        <p>{t('support.aboutP1', { name: settings.siteName })}</p>
        <p>{t('support.aboutP2')}</p>
        <div className="grid sm:grid-cols-3 gap-4 !mt-10">
          {[[t('support.trust'), t('support.trustDesc')], [t('support.speed'), t('support.speedDesc')], [t('support.discretion'), t('support.discretionDesc')]].map(([k, d]) => (
            <div key={k} className="card p-5 text-center">
              <div className="h-serif text-xl text-primary mb-1">{k}</div>
              <div className="text-xs text-neutral-500">{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-y border-neutral-200"><div className="max-w-7xl mx-auto px-4"><LogoMarquee /></div></div>
      <div className="text-center py-16">
        <h2 className="h-serif text-3xl mb-4">{t('support.meetPeople')}</h2>
        <Link to="/find-agent" className="btn-primary">{t('support.meetTeam')}</Link>
      </div>
    </div>
  )
}

export function ContactUs() {
  const { settings } = useData()
  const { t } = useI18n()
  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4">
      <div className="eyebrow mb-2">{t('support.contactEyebrow')}</div>
      <h1 className="h-serif text-4xl mb-10">{t('support.contactTitle')}</h1>
      <div className="grid lg:grid-cols-2 gap-10">
        <div>
          <InquiryForm source="Contact page" />
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="h-serif text-xl mb-2">{t('support.headOffice')}</h3>
            <p className="text-neutral-600 text-sm">{t('support.addressLine1')}<br />{t('support.addressLine2')}</p>
          </div>
          <div className="card h-52 bg-neutral-100 flex items-center justify-center gap-2 text-neutral-400"><IconMap className="w-5 h-5" /> {t('support.mapPlaceholder')}</div>
          <div className="flex flex-wrap gap-3">
            {/* One button per channel that is actually configured — never a dead link. */}
            {telHref(settings.phone) && (
              <a href={telHref(settings.phone)} className="btn-dark"><IconPhone className="w-4 h-4" /> {settings.phone}</a>
            )}
            {whatsAppHref(settings.whatsapp) && (
              <a href={whatsAppHref(settings.whatsapp)} target="_blank" rel="noreferrer" className="bg-[#25d366] hover:bg-[#1fb958] text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"><WhatsAppIcon /> {t('common.whatsapp')}</a>
            )}
            {mailHref(settings.email) && (
              <a href={mailHref(settings.email)} className="btn-outline"><IconMail className="w-4 h-4" /> {settings.email}</a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ListProperty() {
  const { addInquiry } = useData()
  const { t, typeLabel } = useI18n()
  const toast = useToast()
  const [f, setF] = useState({
    name: '', phone: '', email: '', type: 'Apartment', purpose: 'buy', message: '',
    city: '', street: '', locCountry: 'Qatar', locState: '', locDescription: '', x: '', y: '',
  })
  const [sending, setSending] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  // Same picker→form adapter the admin forms use — one location dialect everywhere.
  const applyLocation = (patch) => setF(prev => ({ ...prev,
    ...(patch.x !== undefined ? { x: patch.x, y: patch.y } : {}),
    ...(patch.country !== undefined ? { locCountry: patch.country } : {}),
    ...(patch.city !== undefined ? { city: patch.city } : {}),
    ...(patch.street !== undefined ? { street: patch.street } : {}),
    ...(patch.state !== undefined ? { locState: patch.state } : {}),
    ...(patch.description !== undefined ? { locDescription: patch.description } : {}),
  }))

  const submit = async (e) => {
    e.preventDefault()
    if (sending) return
    if (!f.x || !f.y) { toast(t('support.selectLocation'), 'error'); return }
    setSending(true)
    try {
      // Live mode POSTs to /api/leads/listing-request; success only after the backend
      // confirms. On failure everything the owner typed stays in place.
      await addInquiry({
        listingRequest: true,
        name: f.name, phone: f.phone, email: f.email,
        type: f.type, purpose: f.purpose, message: f.message,
        city: f.city, street: f.street, locCountry: f.locCountry,
        locState: f.locState, locDescription: f.locDescription, x: f.x, y: f.y,
        source: 'List your property',
      })
      toast(t('support.listingReceived'))
      setF({ name: '', phone: '', email: '', type: 'Apartment', purpose: 'buy', message: '',
             city: '', street: '', locCountry: 'Qatar', locState: '', locDescription: '', x: '', y: '' })
    } catch (err) {
      toast(err?.problem?.title || t('support.listingFailed'), 'error')
    } finally { setSending(false) }
  }

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4">
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <div className="eyebrow mb-2">{t('support.listEyebrow')}</div>
          <h1 className="h-serif text-4xl mb-6">{t('support.listTitle')}</h1>
          <ul className="space-y-4 text-neutral-700">
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>{t('support.benefit1Title')}</b>{t('support.benefit1Body')}</span></li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>{t('support.benefit2Title')}</b>{t('support.benefit2Body')}</span></li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>{t('support.benefit3Title')}</b>{t('support.benefit3Body')}</span></li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>{t('support.benefit4Title')}</b>{t('support.benefit4Body')}</span></li>
            <li className="flex gap-3"><span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5"><IconCheck className="w-3 h-3" /></span><span><b>{t('support.benefit5Title')}</b>{t('support.benefit5Body')}</span></li>
          </ul>
        </div>
        <form className="card p-6 space-y-3" onSubmit={submit}>
          <h2 className="h-serif text-xl">{t('support.tellUs')}</h2>
          <input required placeholder={t('forms.fullName')} className="field" value={f.name} onChange={set('name')} />
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder={t('forms.phone')} className="field" value={f.phone} onChange={set('phone')} />
            <input required type="email" placeholder={t('forms.email')} className="field" value={f.email} onChange={set('email')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="field" value={f.type} onChange={set('type')}>{PROPERTY_TYPES.map(pt => <option key={pt} value={pt}>{typeLabel(pt)}</option>)}</select>
            <select className="field" value={f.purpose} onChange={set('purpose')}>
              <option value="buy">{t('common.forSale')}</option><option value="rent">{t('common.forRent')}</option>
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-1.5">{t('support.locationHint')}</p>
            <LocationPicker variant="light"
              value={{ x: f.x, y: f.y, country: f.locCountry, city: f.city, street: f.street, state: f.locState, description: f.locDescription }}
              onChange={applyLocation}
            />
          </div>
          <textarea placeholder={t('support.anythingElse')} rows="3" className="field" value={f.message} onChange={set('message')} />
          <button className="btn-primary w-full" disabled={sending}>{sending ? t('common.sending') : t('support.requestValuation')}</button>
        </form>
      </div>
    </div>
  )
}

export function NotFound() {
  const { t } = useI18n()
  return (
    <div className="min-h-[70vh] bg-ink text-white flex flex-col items-center justify-center text-center px-4 pt-16">
      <div className="h-serif text-8xl text-primary mb-4">404</div>
      <h1 className="h-serif text-3xl mb-3">{t('support.notFoundTitle')}</h1>
      <p className="text-neutral-400 mb-8">{t('support.notFoundBody')}</p>
      <Link to="/" className="btn-primary">{t('support.backHome')}</Link>
    </div>
  )
}
