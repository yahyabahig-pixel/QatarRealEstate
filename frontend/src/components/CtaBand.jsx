import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { whatsAppHref } from '../lib/contact'
import { WhatsAppIcon } from './ui'

// `light` is for the home page, where the whole page below the search panel is one white
// surface — a dark band there would close it off halfway down. Everywhere else the page
// above it ends in white and this band is what finishes it, so it stays dark.
export default function CtaBand({ light = false }) {
  const { settings } = useData()
  const { t } = useI18n()
  const wa = whatsAppHref(settings.whatsapp)
  const muted = light ? 'text-mist' : 'text-neutral-400'
  const eyebrow = light ? '!text-mist' : '!text-white/70'
  return (
    <section className={`qre-cta-band py-16 relative overflow-hidden ${light
      ? 'bg-white text-ink border-t border-neutral-200'
      : 'bg-gradient-to-br from-ink via-coal to-ink text-white'}`}>
      {/* soft brand glow behind the heading — barely there on white, where the same
          strength would read as a pink smudge rather than a glow */}
      <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-48 rounded-full blur-3xl pointer-events-none ${light ? 'bg-primary/5' : 'bg-primary/15'}`} />
      <div className="max-w-7xl mx-auto px-4 relative">
        <h2 className={`h-serif text-3xl md:text-4xl text-center mb-3 ${light ? 'text-ink' : ''}`}>{t('cta.title')}</h2>
        <p className={`text-center ${muted} text-sm mb-12 max-w-lg mx-auto`}>{t('cta.subtitle')}</p>
        <div className="grid md:grid-cols-2 gap-10 text-center max-w-3xl mx-auto">
          {wa && (
            <div>
              <div className={`eyebrow ${eyebrow} mb-4`}>{t('cta.talk')}</div>
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
            <div className={`eyebrow ${eyebrow} mb-4`}>{t('cta.newsletter')}</div>
            <p className={`${muted} text-sm mb-4 max-w-xs mx-auto`}>{t('cta.newsletterBody')}</p>
            <Link to="/contact-us" className="btn-primary !py-2.5 inline-flex">{t('cta.newsletterCta')}</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
