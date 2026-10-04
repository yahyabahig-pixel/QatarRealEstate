import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { whatsAppHref } from '../lib/contact'
import { WhatsAppIcon } from './ui'

export default function CtaBand() {
  const { settings } = useData()
  const { t } = useI18n()
  const wa = whatsAppHref(settings.whatsapp)
  return (
    <section className="qre-cta-band bg-gradient-to-br from-ink via-coal to-ink text-white py-16 relative overflow-hidden">
      {/* soft brand glow behind the heading */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 relative">
        <h2 className="h-serif text-3xl md:text-4xl text-center mb-3">{t('cta.title')}</h2>
        <p className="text-center text-neutral-400 text-sm mb-12 max-w-lg mx-auto">{t('cta.subtitle')}</p>
        <div className="grid md:grid-cols-2 gap-10 text-center max-w-3xl mx-auto">
          {wa && (
            <div>
              <div className="eyebrow !text-white/70 mb-4">{t('cta.talk')}</div>
              <a href={wa} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#25d366] hover:bg-[#1fb958] rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors">
                <WhatsAppIcon /> {t('cta.whatsapp')}
              </a>
            </div>
          )}
          <div>
            {/* This was an email box that showed "Subscribed — welcome aboard!" and then
                threw the address away: there is no newsletter list, no endpoint and no
                stored subscriber anywhere in the project. Telling a visitor they had
                signed up for something that does not exist was the bug. The contact form
                it now points at DOES reach the business — it creates a real lead that
                shows up in the admin panel. Wire a mailing provider in later and this
                block is the one place to change. */}
            <div className="eyebrow !text-white/70 mb-4">{t('cta.newsletter')}</div>
            <p className="text-neutral-400 text-sm mb-4 max-w-xs mx-auto">{t('cta.newsletterBody')}</p>
            <Link to="/contact-us" className="btn-primary !py-2.5 inline-flex">{t('cta.newsletterCta')}</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
