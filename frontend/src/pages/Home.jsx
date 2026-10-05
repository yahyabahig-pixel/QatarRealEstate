import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import PropertyCard from '../components/PropertyCard'
import { SectionHeading, Star } from '../components/ui'
import { IconArrowRight, IconSearch } from '../components/icons'

// ---------------------------------------------------------------------------------------
// HERO PHOTOGRAPHY
// The West Bay skyline across Doha Bay — the one view that reads as Qatar instantly.
// Served larger and at a higher quality than a card image because it fills the viewport.
//
// The photo is not relied on to match the brand: the two overlays below do that. An indigo
// (#2B2D42) gradient unifies the whole frame and guarantees white text stays legible on any
// crop, and a soft red bloom in the lower third ties the image to the primary accent. Swap
// HERO for any of the ALT_HEROES and the composition still lands in palette.
// ---------------------------------------------------------------------------------------
const heroUrl = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2400&q=85`

const HERO = heroUrl('1646207795621-733fe1646f9b')   // Qatar flag, National Museum of Qatar, Doha
// Fallbacks, all Qatar, so a fallback can never substitute another city for the hero.
const ALT_HEROES = [
  heroUrl('1577717903315-1691ae25ab3f'),             // Doha / West Bay skyline
  heroUrl('1507904139316-3c7422a97a49'),             // Doha skyline at blue hour
  heroUrl('1662050196100-6f8afc83d585'),             // Doha skyline across the bay
]

// The requested "blur 70%". CSS blur takes a length, not a percentage, so it is expressed here
// as a single tunable constant: 70% of a 20px ceiling. Turn it down towards 0px to sharpen the
// photograph, or up for a softer backdrop — nothing else needs touching.
const HERO_BLUR = '14px'

// All four photographs, in order. They were already here as error fallbacks and never shown;
// they are the rotation now, and a photograph that fails to load simply drops out of it.
const HERO_SLIDES = [HERO, ...ALT_HEROES]
const SLIDE_MS = 7000     // how long each photograph holds
const FADE_MS = 2000      // how long the crossfade between two of them takes

// ---------------------------------------------------------------------------------------
// The moving backdrop. Two things give it life: a slow crossfade between the four Qatar
// photographs, and a continuous drift (see .qre-hero-slide in index.css) so the frame is
// never completely still.
//
// Three things it is careful about:
//   • WEIGHT — these are 2400px photographs. Only the first is requested up front, with
//     fetchPriority high, because it is the page's largest contentful paint. The rest are
//     added once it has settled — loaded OR failed — so they cost nothing before the page
//     is usable, and a dead first URL still lets the others through.
//   • MOTION — someone who asks their system for reduced motion gets a still frame. The
//     CSS rule flattens the drift, and the timer below never starts, because a crossfade
//     with no transition is a hard cut, which is worse than no movement at all.
//   • FAILURE — a photograph that will not load is removed from the rotation instead of
//     showing an empty frame when its turn comes round.
// ---------------------------------------------------------------------------------------
function HeroBackdrop({ alt }) {
  const [index, setIndex] = useState(0)
  // "Settled", not "loaded": the first photograph FAILING has to release the others too,
  // or one dead URL takes the whole backdrop down with it — three good photographs left
  // unmounted behind a flag that only a successful load could ever set.
  const [settled, setSettled] = useState(false)
  const [broken, setBroken] = useState(() => new Set())
  const reduced = useRef(false)

  const dropSlide = (src) => setBroken((b) => (b.has(src) ? b : new Set(b).add(src)))

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    reduced.current = !!mq?.matches
    if (!settled || reduced.current) return

    const live = HERO_SLIDES.filter((src) => !broken.has(src))
    if (live.length < 2) return            // nothing to cross-fade to

    const id = setInterval(() => {
      setIndex((i) => {
        for (let step = 1; step <= HERO_SLIDES.length; step++) {
          const next = (i + step) % HERO_SLIDES.length
          if (!broken.has(HERO_SLIDES[next])) return next
        }
        return i
      })
    }, SLIDE_MS)
    return () => clearInterval(id)
  }, [settled, broken])

  // Which photograph is actually on screen. Derived rather than stored: if the one the
  // timer is pointing at turns out to be broken, the first working one shows instead. An
  // earlier version patched the index from inside the error handler and could point it at
  // a photograph that was ALSO broken, leaving the frame empty with good photos unused.
  const active = broken.has(HERO_SLIDES[index])
    ? HERO_SLIDES.findIndex((src) => !broken.has(src))
    : index

  return (
    <div className="absolute inset-0 overflow-hidden">
      {HERO_SLIDES.map((src, i) => {
        // The first photograph is always mounted; the rest wait until it has settled.
        if (i > 0 && !settled) return null
        if (broken.has(src)) return null
        return (
          <img
            key={src}
            src={src}
            alt={i === 0 ? alt : ''}
            aria-hidden={i === 0 ? undefined : true}
            fetchPriority={i === 0 ? 'high' : 'low'}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={i === 0 ? () => setSettled(true) : undefined}
            onError={() => { if (i === 0) setSettled(true); dropSlide(src) }}
            style={{ filter: `blur(${HERO_BLUR})`, transitionDuration: `${FADE_MS}ms` }}
            className={`qre-hero-slide absolute inset-0 w-full h-full object-cover transition-opacity ease-in-out ${
              i === active ? 'opacity-100' : 'opacity-0'}`}
          />
        )
      })}
    </div>
  )
}

export default function Home() {
  const { properties, developments, areas, agents, areaCount, propertyTypes } = useData()
  const { t, typeLabel } = useI18n()
  const navigate = useNavigate()
  const [tab, setTab] = useState('rent')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [price, setPrice] = useState('')

  const featured = properties.filter(p => p.exclusive && p.status === 'available').slice(0, 8)
  const trendingAreas = areas.slice(0, 4)
  const topAgents = agents.filter(a => a.active).slice(0, 4)

  const stats = [
    [properties.length.toLocaleString() + '+', t('home.stats.listings')],
    [areas.length, t('home.stats.districts')],
    [developments.length, t('home.stats.developments')],
    [agents.filter(a => a.active).length, t('home.stats.consultants')],
  ]

  const search = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type) params.set('type', type)
    if (price) params.set('maxPrice', price)
    navigate(`/${tab}?${params}`)
  }

  return (
    <>
      {/* HERO */}
      <section className="relative h-screen min-h-[680px] flex items-center justify-center overflow-hidden">
        <HeroBackdrop alt="The West Bay skyline across Doha Bay, Qatar" />
        {/* indigo unifier — carries the brand dark and keeps white type legible on any crop */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/55 to-ink/90" />
        {/* logo-red cast — a quiet full-bleed tint that pulls the backdrop toward the
            brand red of the logo (stronger at the base, breathing at the top) */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-primary/5 to-primary/25 pointer-events-none" />
        {/* red blooms — tie the photograph to the primary accent without tinting faces */}
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[56rem] h-80 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -end-24 w-[30rem] h-[30rem] rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="relative text-center text-white px-4 w-full max-w-3xl">
          <div className="eyebrow !text-white/90 mb-4">{t('home.heroEyebrow')}</div>
          <h1 className="h-serif text-4xl md:text-6xl leading-[1.08] mb-4">
            {t('home.heroTitle1')}<br />{t('home.heroTitle2')}
          </h1>
          <p className="text-white/70 text-sm md:text-base mb-8 max-w-xl mx-auto">
            {t('home.heroSubtitle')}
          </p>

          <div className="bg-white text-neutral-900 shadow-2xl shadow-ink/40 rounded-2xl overflow-hidden text-start">
            <div className="flex gap-1 p-2 pb-0">
              {['rent', 'buy'].map(tab_ => (
                <button key={tab_} onClick={() => setTab(tab_)} aria-pressed={tab === tab_}
                  className={`flex-1 py-2.5 text-sm font-semibold capitalize rounded-xl transition-colors ${tab === tab_ ? 'bg-ink text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}`}>
                  {tab_ === 'rent' ? t('common.forRent') : t('common.forSale')}
                </button>
              ))}
            </div>
            <form onSubmit={search} className="p-4 grid md:grid-cols-[1fr_auto_auto_auto] gap-3">
              {/* Area DROPDOWN (was a free-text box): visitors pick from the areas that
                  actually exist in the catalogue — no typos, no guessing. The selected
                  name rides the same ?q= param the listings page already filters by. */}
              <select value={q} onChange={e => setQ(e.target.value)} className="field">
                <option value="">{t('home.allAreas')}</option>
                {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
              <select value={type} onChange={e => setType(e.target.value)} className="field md:w-44">
                <option value="">{t('home.propertyType')}</option>
                {propertyTypes.map(pt => <option key={pt.id} value={pt.name}>{typeLabel(pt.name)}</option>)}
              </select>
              <select value={price} onChange={e => setPrice(e.target.value)} className="field md:w-40">
                <option value="">{t('home.maxPrice')}</option>
                {(tab === 'rent' ? [5000, 10000, 20000, 50000] : [1000000, 3000000, 6000000, 15000000]).map(v =>
                  <option key={v} value={v}>{v.toLocaleString()} QAR</option>)}
              </select>
              <button className="btn-primary"><IconSearch className="w-4 h-4" /> {t('home.search')}</button>
            </form>
          </div>

        </div>

        {/* STATISTICS — a white band along the hero's lower edge. It sits INSIDE the hero
            on purpose: the first screen is meant to read as two surfaces — the dark one
            carrying the headline and the search panel, and this white one closing it. */}
        <div className="absolute bottom-0 inset-x-0 hidden md:block bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-4 divide-x divide-neutral-200">
              {stats.map(([v, k]) => (
                <div key={k} className="py-8 text-center">
                  <div className="h-serif text-3xl text-ink">{v}</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-mist mt-1">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* Everything from here down is ONE white surface. The sections used to sit on four
          different backgrounds in a row — a dark band, then the page's grey, then grey
          again, then white — which made the page under the search panel look unsettled. */}
      <div className="bg-white">

      {/* DEVELOPMENTS SLIDER */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading eyebrow={t('home.devEyebrow')} title={t('home.devTitle')}
            subtitle={t('home.devSubtitle')} link="/developments" linkLabel={t('home.devLink')} />
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 snap-x">
            {developments.map(d => (
              <Link key={d.id} to={`/development/${d.slug}`} className="relative shrink-0 w-80 h-96 overflow-hidden rounded-2xl group snap-start">
                <img src={d.coverImage} alt={d.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/25 to-transparent" />
                <div className="absolute bottom-0 p-5">
                  <div className="text-white/80 text-xs uppercase tracking-wider mb-1">{t('home.availableFrom', { year: d.deliveryYear })}</div>
                  <h3 className="h-serif text-2xl">{d.name}</h3>
                  <p className="text-sm text-neutral-300">{d.area}</p>
                  <span className="inline-flex items-center gap-1.5 mt-3 text-primary text-xs font-semibold uppercase tracking-wider opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                    {t('home.exploreProject')} <IconArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <SectionHeading eyebrow={t('home.featuredEyebrow')} title={t('home.featuredTitle')}
          subtitle={t('home.featuredSubtitle')} link="/buy" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-fade">
          {featured.map(p => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* TRENDING AREAS */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <SectionHeading eyebrow={t('home.areasEyebrow')} title={t('home.areasTitle')}
          subtitle={t('home.areasSubtitle')} link="/areas" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-fade">
          {trendingAreas.map(a => (
            <Link key={a.id} to={`/areas/${a.slug}`} className="relative h-80 overflow-hidden rounded-2xl group lift">
              <img src={a.photo} alt={a.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent" />
              <div className="absolute bottom-0 p-5 text-white">
                <h3 className="h-serif text-xl">{a.name}</h3>
                <p className="text-sm text-neutral-300">{areaCount(a.name)} {t('common.properties')}</p>
                <span className="inline-block mt-2 text-primary text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">{t('home.exploreArea')}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* AGENTS */}
      {topAgents.length > 0 && (
        <section className="border-t border-neutral-200 py-20">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHeading eyebrow={t('home.agentsEyebrow')} title={t('home.agentsTitle')}
              subtitle={t('home.agentsSubtitle')} link="/find-agent" linkLabel={t('home.meetTeam')} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-fade">
              {topAgents.map(a => (
                <Link key={a.id} to={`/find-agent/${a.slug}`} className="card lift overflow-hidden group">
                  <div className="overflow-hidden">
                    <img src={a.photo} alt={a.name} loading="lazy" className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-[15px] text-ink truncate">{a.name}</h3>
                      {a.rating > 0 && <span className="text-primary text-xs font-semibold flex items-center gap-1 shrink-0"><Star /> {a.rating.toFixed(1)}</span>}
                    </div>
                    <p className="text-sm text-mist truncate">{a.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      </div>
    </>
  )
}
