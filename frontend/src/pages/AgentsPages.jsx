import { Link, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { usePropertySearch } from '../lib/usePropertySearch'
import { telHref, whatsAppHref, mailHref } from '../lib/contact'
import { useI18n } from '../i18n/I18nContext'
import PropertyCard from '../components/PropertyCard'
import { SectionHeading, Star, WhatsAppIcon } from '../components/ui'
import { IconMail, IconPhone } from '../components/icons'
import { InquiryForm } from '../components/misc'

export function AgentsIndex() {
  const { agents } = useData()
  const { t } = useI18n()
  return (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
      <div className="eyebrow mb-2">{t('agents.eyebrow')}</div>
      <h1 className="h-serif text-4xl mb-10">{t('agents.title')}</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {agents.filter(a => a.active).map(a => (
          <div key={a.id} className="card lift overflow-hidden group">
            <Link to={`/find-agent/${a.slug}`} className="block overflow-hidden">
              <img src={a.photo} alt={a.name} className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" />
            </Link>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="h-serif text-lg">{a.name}</h3>
                <span className="text-primary text-sm flex items-center gap-1"><Star />{a.rating > 0 ? `${a.rating.toFixed(1)} /5` : ''}</span>
              </div>
              <p className="text-sm text-neutral-500">{a.title}</p>
              <p className="text-xs text-neutral-400 mb-3">{t('agents.location')}</p>
              <Link to={`/find-agent/${a.slug}`} className="brand-link text-primary text-sm">{t('agents.startWorking', { name: a.name.split(' ')[0] })}</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AgentProfile() {
  const { slug } = useParams()
  const { agents, properties, loading: storeLoading } = useData()
  const { t } = useI18n()
  const a = agents.find(x => x.slug === slug)

  // Server-side, by agent id. The old client-side filter compared against `p.agentId`, which
  // the search DTO did not carry — every card claimed to have no agent, so every consultant's
  // profile read "no live listings".
  const { items: listings } = usePropertySearch(
    { agentId: a?.id },
    {
      enabled: !!a?.id,
      mockFallback: properties.filter(p => p.agentId === a?.id && p.status === 'available'),
    })

  if (!a) {
    return storeLoading
      ? <div className="pt-32 text-center pb-20 text-neutral-500">{t('common.loading')}</div>
      : <div className="pt-32 text-center pb-20"><h1 className="h-serif text-3xl">{t('agents.notFound')}</h1></div>
  }

  return (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
      <div className="grid md:grid-cols-[300px_1fr] gap-10 mb-14">
        <img src={a.photo} alt={a.name} className="w-full h-80 object-cover rounded-xl" />
        <div>
          <h1 className="h-serif text-4xl mb-1">{a.name}</h1>
          <p className="text-neutral-500 mb-2">{a.title}</p>
          {a.rating > 0 && <div className="text-primary flex items-center gap-1 mb-4"><Star /> {a.rating.toFixed(1)} /5 · {t('property.verifiedReviews')}</div>}
          <p className="text-neutral-700 leading-relaxed max-w-xl mb-6">{a.bio}</p>
          {/* One button per channel the consultant ACTUALLY has. These three used to
              interpolate the raw field into the href, so an agent saved without a WhatsApp
              number still got a live green button pointing at "wa.me/null" — and the dial
              link passed the number through unchanged, spaces and all. */}
          <div className="flex flex-wrap gap-3">
            {telHref(a.phone) && (
              <a href={telHref(a.phone)} className="btn-dark"><IconPhone className="w-4 h-4" /> {t('common.call')}</a>
            )}
            {whatsAppHref(a.whatsapp || a.phone) && (
              <a href={whatsAppHref(a.whatsapp || a.phone)} target="_blank" rel="noreferrer" className="bg-[#25d366] hover:bg-[#1fb958] text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"><WhatsAppIcon /> {t('common.whatsapp')}</a>
            )}
            {mailHref(a.email) && (
              <a href={mailHref(a.email)} className="btn-outline"><IconMail className="w-4 h-4" /> {t('common.email')}</a>
            )}
          </div>
        </div>
      </div>

      <SectionHeading eyebrow={t('agents.portfolio')} title={t('agents.listingsBy', { name: a.name.split(' ')[0] })} />
      {listings.length === 0
        ? <p className="text-neutral-500 mb-10">{t('agents.noListings')}</p>
        : <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">{listings.map(p => <PropertyCard key={p.id} p={p} />)}</div>}

      <div className="max-w-lg">
        <h2 className="h-serif text-2xl mb-4">{t('agents.message', { name: a.name.split(' ')[0] })}</h2>
        <InquiryForm agentId={a.id} source="Agent contact" />
      </div>
    </div>
  )
}
