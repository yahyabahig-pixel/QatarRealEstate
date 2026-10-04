import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import PropertyCard from '../components/PropertyCard'
import { SectionHeading, EmptyState } from '../components/ui'
import { InquiryForm } from '../components/misc'
import PropertyLocation from '../components/PropertyLocation'
import { fallbackQatarCoord } from '../lib/geo'

export function DevelopmentsIndex() {
  const { developments, loading } = useData()
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const areasList = [...new Set(developments.map(d => d.area))]

  // The chip label is the full location string the API returns ("The Pearl, Doha"), while a
  // link can only reasonably carry the district ("The Pearl"). So resolve ?area= to the first
  // chip that CONTAINS it, case-insensitively, rather than demanding an exact match — that
  // keeps the deep link working in both mock mode and live mode, where the label differs.
  const requested = params.get('area') || ''
  const areaFilter = requested
    ? (areasList.find(a => a.toLowerCase().includes(requested.toLowerCase())) || requested)
    : ''

  // Filter state lives in the URL so the view is shareable, survives a refresh, and the
  // browser Back button steps through filters as a user would expect.
  const selectArea = (a) => {
    const next = new URLSearchParams(params)
    if (!a || a === areaFilter) next.delete('area')
    else next.set('area', a)
    setParams(next, { replace: true })
  }

  const items = areaFilter ? developments.filter(d => d.area === areaFilter) : developments
  // Same distinction as the detail page: an empty array during the first fetch is not
  // "there are no projects".
  const stillLoading = loading && developments.length === 0

  return (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
      <div className="eyebrow mb-2">{t('developments.eyebrow')}</div>
      <h1 className="h-serif text-4xl mb-8">{t('developments.title')}</h1>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-8">
        <button onClick={() => selectArea('')} className={`chip ${!areaFilter ? 'chip-active' : ''}`}>{t('developments.allAreas')}</button>
        {areasList.map(a => (
          <button key={a} onClick={() => selectArea(a)}
            className={`chip ${areaFilter === a ? 'chip-active' : ''}`}>{a}</button>
        ))}
      </div>
      {stillLoading
        ? <div className="text-center py-16 text-neutral-500">{t('common.loading')}</div>
        : items.length === 0 ? <EmptyState message={t('developments.empty')} /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(d => (
            <Link key={d.id} to={`/development/${d.slug}`} className="group relative h-96 overflow-hidden rounded-xl lift">
              <img src={d.coverImage} alt={d.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-5 text-white">
                {/* Neutral, not brand red. This is a quiet metadata line on a dark photo
                    scrim: warm white at 75% reads premium and stays legible, where red
                    shouted and competed with the project name right beneath it. Red stays
                    reserved for actions and the "Explore project" hover cue. */}
                <div className="text-white/75 text-xs uppercase tracking-wider mb-1">{t('home.availableFrom', { year: d.deliveryYear })}</div>
                <h3 className="h-serif text-2xl">{d.name}</h3>
                <p className="text-sm text-neutral-300">{d.area} · {t('developments.by', { developer: d.developer })}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function DevelopmentDetail() {
  const { slug } = useParams()
  const { developments, properties, loading } = useData()
  const { t } = useI18n()
  const d = developments.find(x => x.slug === slug)
  // "Not found" and "not loaded yet" are different answers. The store fetches its slices
  // after the first paint, so this page used to flash "Project not found" on every visit —
  // and a visitor who arrived on a slow connection saw nothing else.
  if (!d) {
    return loading
      ? <div className="pt-32 text-center pb-20 text-neutral-500">{t('common.loading')}</div>
      : <div className="pt-32 text-center pb-20"><h1 className="h-serif text-3xl">{t('developments.notFound')}</h1></div>
  }

  // d.area is now a Location-derived label ("The Pearl, Doha"); property areas are
  // catalog names ("The Pearl"), so match by containment rather than strict equality.
  const units = properties.filter(p => p.offPlan && p.status === 'available' && p.area &&
    (p.area === d.area || d.area.includes(p.area)))

  return (
    <div>
      <section className="relative h-[60vh] min-h-[420px] flex items-end">
        <img src={d.coverImage} alt={d.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 pb-12 text-white w-full">
          <div className="text-white/75 text-xs uppercase tracking-[0.25em] mb-2">{t('developments.delivery', { year: d.deliveryYear, area: d.area })}</div>
          <h1 className="h-serif text-4xl md:text-5xl">{d.name}</h1>
          <p className="text-neutral-300 mt-1">{t('developments.by', { developer: d.developer })}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-14 grid lg:grid-cols-[1fr_340px] gap-10">
        <div>
          <p className="text-neutral-700 leading-relaxed text-lg mb-10">{d.description}</p>
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[[t('developments.units'), d.unitsCount], [t('developments.paymentPlan'), d.paymentPlan], [t('developments.startingPrice'), d.startingPrice ? `${d.startingPrice.toLocaleString()} QAR` : '—']].map(([k, v]) => (
              <div key={k} className="card p-5 text-center">
                <div className="eyebrow !text-[10px] mb-1">{k}</div>
                <div className="h-serif text-xl">{v}</div>
              </div>
            ))}
          </div>
          {/* Location — same map block the property pages use; real coordinates when
              saved, deterministic in-Qatar fallback (labelled approximate) otherwise. */}
          {(() => {
            const hasReal = d.lat != null && d.lng != null
            const fb = hasReal ? null : fallbackQatarCoord(d.id)
            return (
              <div className="mb-2">
                <PropertyLocation
                  lat={hasReal ? d.lat : fb.lat}
                  lng={hasReal ? d.lng : fb.lng}
                  approx={!hasReal}
                  title={d.name}
                  areaLabel={[d.street || d.locState, d.city].filter(Boolean).join(', ') || d.area}
                />
              </div>
            )
          })()}

          <SectionHeading eyebrow={t('developments.inventory')} title={t('developments.availableUnits')} />
          {units.length === 0
            ? <EmptyState message={t('developments.unitsEmpty')} />
            : <div className="grid md:grid-cols-2 gap-6">{units.map(p => <PropertyCard key={p.id} p={p} />)}</div>}
        </div>
        <aside className="lg:sticky lg:top-24 h-fit card p-6">
          <h3 className="h-serif text-xl mb-4">{t('developments.register')}</h3>
          <InquiryForm compact source={`Development: ${d.name}`} />
        </aside>
      </div>
    </div>
  )
}
