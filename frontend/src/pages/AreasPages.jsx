import { Link, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { usePropertySearch } from '../lib/usePropertySearch'
import { useI18n } from '../i18n/I18nContext'
import PropertyCard from '../components/PropertyCard'
import { SectionHeading, EmptyState } from '../components/ui'

export function AreasIndex() {
  const { areas, areaCount } = useData()
  const { t } = useI18n()
  return (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
      <div className="eyebrow mb-2">{t('areas.eyebrow')}</div>
      <h1 className="h-serif text-4xl mb-8">{t('areas.title')}</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map(a => (
          <Link key={a.id} to={`/areas/${a.slug}`} className="group relative h-72 overflow-hidden rounded-xl lift">
            <img src={a.photo} alt={a.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-0 p-5 text-white">
              <h3 className="h-serif text-2xl">{a.name}</h3>
              <p className="text-sm text-neutral-300">{areaCount(a.name)} {t('common.properties')}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AreaDetail() {
  const { slug } = useParams()
  const { areas, properties, loading: storeLoading } = useData()
  const { t } = useI18n()
  const a = areas.find(x => x.slug === slug)

  // The listings come from the SERVER, filtered by this area's id. They used to be filtered
  // in the browser by `p.area === a.name` against a list whose rows all carried area: '' —
  // so this page showed "0 TOTAL PROPERTIES" while the header above it said six.
  const { items: all } = usePropertySearch(
    { areaId: a?.id },
    {
      enabled: !!a?.id,
      mockFallback: properties.filter(p => p.area === a?.name && p.status === 'available'),
    })

  // Distinguish "still loading" from "genuinely none": the page used to render its
  // not-found state during the first paint, before the areas had arrived.
  if (!a) {
    return storeLoading
      ? <div className="pt-32 text-center pb-20 text-neutral-500">{t('common.loading')}</div>
      : <div className="pt-32 text-center pb-20"><h1 className="h-serif text-3xl">{t('areas.notFound')}</h1></div>
  }

  const forRent = all.filter(p => p.purpose === 'rent')
  const forSale = all.filter(p => p.purpose === 'buy')

  return (
    <div>
      <section className="relative h-[55vh] min-h-[380px] flex items-end">
        <img src={a.photo} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 pb-12 text-white w-full">
          <div className="eyebrow mb-2">{t('areas.guideEyebrow')}</div>
          <h1 className="h-serif text-4xl md:text-5xl">{a.name}</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <p className="max-w-3xl text-lg text-neutral-700 leading-relaxed mb-10">{a.intro}</p>
        <div className="grid sm:grid-cols-3 gap-4 max-w-xl mb-14">
          {[[t('areas.totalProperties'), all.length], [t('areas.forRentCount'), forRent.length], [t('areas.forSaleCount'), forSale.length]].map(([k, v]) => (
            <div key={k} className="card p-5 text-center">
              <div className="h-serif text-3xl text-primary">{v}</div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">{k}</div>
            </div>
          ))}
        </div>
        <SectionHeading eyebrow={a.name} title={t('areas.inArea', { name: a.name })} />
        {all.length === 0 ? <EmptyState message={t('areas.emptyArea')} /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">{all.map(p => <PropertyCard key={p.id} p={p} />)}</div>
        )}
        {/* Each of these used to drop onto an unfiltered /rent or /buy, losing the area the
            visitor was already looking at. They now carry it through as ?q=. */}
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {[
            [t('areas.aptRentIn', { name: a.name }), `/rent?q=${encodeURIComponent(a.name)}`],
            [t('areas.aptSaleIn', { name: a.name }), `/buy?q=${encodeURIComponent(a.name)}`],
            [t('areas.villasIn', { name: a.name }), `/buy?q=${encodeURIComponent(a.name)}`],
            [t('areas.penthousesIn', { name: a.name }), `/rent?q=${encodeURIComponent(a.name)}`],
          ].map(([label, to]) => (
            <Link key={label} to={to} className="brand-link text-primary">{label}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
