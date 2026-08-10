import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { PageTitle, StatusBadge } from './adminUi'
import { IconEye, IconHome, IconUsers, IconInbox, IconSparkle, IconBuilding, IconCrane, IconBriefcase, IconPin, IconAward } from '../components/icons'
import { MOCK_MODE } from '../api/client'
import { propertiesAdminApi } from '../api/realEstateApi'
import { WaveChart, StatTile, Donut, BarList, SERIES, BRAND, fmt } from './charts'

// ---------------------------------------------------------------------------------------
//  Admin dashboard.
//
//  DATA CONTRACT — UNCHANGED. Everything below is derived from endpoints that already
//  existed: /api/admin/properties (list), .../dashboard-statistics, .../most-viewed, plus
//  the public catalogue slices DataContext already holds. No new endpoint, no new field,
//  no statistic the API cannot answer. Where a number cannot be known — a trend with no
//  previous month, a view timeline the backend does not keep — the UI omits it rather
//  than inventing one.
// ---------------------------------------------------------------------------------------

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const zeroMonths = () => MONTHS_LONG.map((name, i) => ({
  month: i + 1, monthName: name, newProperties: 0, published: 0, sold: 0, rented: 0, archived: 0, newLeads: 0,
}))

// The mock seeds speak the UI's status vocabulary; the API speaks the domain's. One map
// lets every derivation below run identically in both modes.
const MOCK_STATUS = { available: 'Published', sold: 'Sold', rented: 'Rented', archived: 'Archived', draft: 'Draft', reserved: 'Published' }

// NOTE: the spread comes FIRST — SERIES entries carry their own lowercase `key` (the
// month-series field name) and would otherwise overwrite the API status name we index
// `byStatus` with, silently emptying the donut.
const STATUS_SLICES = [
  { ...SERIES.published, key: 'Published' },
  { ...SERIES.rented, key: 'Rented' },
  { ...SERIES.sold, key: 'Sold' },
  { ...SERIES.archived, key: 'Archived' },
  { key: 'Draft', label: 'Draft', labelKey: 'admin.status.Draft', color: '#6C7891' },
]

const TIMELINE_METRICS = [
  { key: 'newProperties', labelKey: 'admin.dashboard.newListings', color: BRAND },
  { key: 'newLeads', labelKey: 'admin.dashboard.leads', color: SERIES.rented.color },
]

const STATUS_SERIES = [SERIES.published, SERIES.rented, SERIES.sold, SERIES.archived]

const topBy = (rows, pick, take = 5) => {
  const counts = new Map()
  rows.forEach(r => {
    const k = (pick(r) || '').trim()
    if (k) counts.set(k, (counts.get(k) || 0) + 1)
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, take).map(([label, value]) => ({ label, value }))
}

// `min-w-0` on the section is load-bearing: a grid item defaults to min-width:auto, so the
// horizontal scroller and the truncating tables inside these cards would otherwise widen
// their grid track and give the whole page a horizontal scrollbar on narrow screens.
function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`panel-dark p-4 sm:p-5 flex flex-col min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="min-w-0">
          <h2 className="text-white text-[13px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[10.5px] text-neutral-500 mt-0.5 leading-snug">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  )
}

const Chip = ({ active, onClick, children, dot }) => (
  <button type="button" onClick={onClick} aria-pressed={active}
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors ${active ? 'border-primary bg-primary/12 text-white' : 'border-white/12 text-neutral-400 hover:border-white/30 hover:text-neutral-200'}`}>
    {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
    {children}
  </button>
)

const CatalogueGrid = ({ items, cols }) => (
  <div className={`grid gap-2.5 ${cols}`}>
    {items.map(([label, value, icon, to]) => (
      <Link key={label} to={to}
        className="rounded-lg border border-white/8 px-3 py-2.5 hover:border-primary/50 hover:bg-white/4 transition-colors">
        <div className="flex items-center gap-1.5 text-neutral-600 mb-1">{icon}</div>
        <div className="text-lg font-bold text-white leading-none tabular-nums">{fmt(value)}</div>
        <div className="text-[10px] text-neutral-500 mt-1 truncate">{label}</div>
      </Link>
    ))}
  </div>
)

export default function Dashboard() {
  const { properties, inquiries, agents, areas, developments, propertyTypes, features, jobs } = useData()
  const { t } = useI18n()

  const [analytics, setAnalytics] = useState(null)   // most-viewed { totalViews, items }
  const [liveStats, setLiveStats] = useState(null)   // monthly statistics for the year
  const [page, setPage] = useState(null)             // admin property page (rows + totalCount)
  const [year, setYear] = useState(new Date().getFullYear())
  const [metric, setMetric] = useState('newProperties')

  // Most-viewed + the admin property page. One fetch each; a failure keeps the last state
  // rather than blanking the dashboard.
  useEffect(() => {
    if (MOCK_MODE) return
    let on = true
    propertiesAdminApi.mostViewed(6).then(a => { if (on) setAnalytics(a) }).catch(() => {})
    propertiesAdminApi.list({ pageSize: 250 }).then(p => { if (on) setPage(p) }).catch(() => {})
    return () => { on = false }
  }, [])

  // Monthly statistics for the selected year (live: grouped in SQL by the timestamps that
  // actually describe each metric — CreatedAtUtc for new listings, the status history's
  // own timestamps for published/sold/rented/archived).
  useEffect(() => {
    if (MOCK_MODE) return
    let on = true
    propertiesAdminApi.dashboardStatistics(year).then(s => { if (on) setLiveStats(s) }).catch(() => {})
    return () => { on = false }
  }, [year])

  // MOCK: derived from the seeds' addedOn / status — demo-mode approximation only.
  const mockStats = useMemo(() => {
    if (!MOCK_MODE) return null
    const years = [...new Set(properties.map(p => Number((p.addedOn || '').slice(0, 4))).filter(Boolean))].sort((a, b) => b - a)
    const months = zeroMonths().map(m => {
      const prefix = `${year}-${String(m.month).padStart(2, '0')}`
      const inMonth = properties.filter(p => (p.addedOn || '').startsWith(prefix))
      return {
        ...m,
        newProperties: inMonth.length,
        published: inMonth.filter(p => p.status === 'available').length,
        sold: inMonth.filter(p => p.status === 'sold').length,
        rented: inMonth.filter(p => p.status === 'rented').length,
        archived: inMonth.filter(p => p.status === 'archived').length,
        newLeads: inquiries.filter(q => (q.date || '').startsWith(prefix)).length,
      }
    })
    return { year, availableYears: years.length ? years : [year], months }
  }, [properties, inquiries, year])

  const stats = MOCK_MODE ? mockStats : (liveStats ?? { year, availableYears: [year], months: zeroMonths() })
  const months = stats.months

  // ---- one normalised listing shape, so every derivation below runs in both modes ----
  const rows = useMemo(() => {
    if (MOCK_MODE) {
      return properties.map(p => ({
        status: MOCK_STATUS[p.status] || 'Published',
        kind: p.purpose === 'rent' ? 'Rent' : 'Sale',
        featured: !!p.exclusive, offPlan: !!p.offPlan, onRequest: !!p.priceOnRequest,
        type: p.type || '', city: p.city || '', area: p.area || '', agentName: '',
      }))
    }
    return (page?.items || []).map(p => ({
      status: p.status,
      kind: p.listingKind === 'Rent' ? 'Rent' : 'Sale',
      featured: !!p.isFeatured, offPlan: !!p.isOffPlan, onRequest: !!p.priceOnRequest,
      type: p.propertyType || '', city: p.city || '', area: p.area || '', agentName: p.agentName || '',
    }))
  }, [properties, page])

  const totalCount = MOCK_MODE ? properties.length : (page?.totalCount ?? page?.total ?? rows.length)
  const sampled = rows.length > 0 && totalCount > rows.length
  const sampleNote = sampled ? t('admin.dashboard.newestOf', { a: fmt(rows.length), b: fmt(totalCount) }) : null

  const byStatus = useMemo(() => {
    const c = {}
    rows.forEach(r => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [rows])

  const forSale = rows.filter(r => r.kind === 'Sale').length
  const forRent = rows.length - forSale
  const featured = rows.filter(r => r.featured).length
  const offPlan = rows.filter(r => r.offPlan).length
  const onRequest = rows.filter(r => r.onRequest).length

  const topTypes = useMemo(() => topBy(rows, r => r.type, 6), [rows])
  const topLocations = useMemo(() => topBy(rows, r => r.area || r.city, 6), [rows])
  const topAgents = useMemo(() => topBy(rows, r => r.agentName, 6), [rows])
  // Where enquiries come from — `typeLabel` in live mode, `source` in the mock seeds.
  const leadSources = useMemo(() => topBy(inquiries, q => q.typeLabel || q.source, 4), [inquiries])

  // Lead stages, counted from whatever statuses the data actually contains.
  const leadStages = useMemo(() => {
    const order = ['New', 'Contacted', 'Qualified', 'Converted', 'Closed', 'Lost', 'Archived']
    const c = new Map()
    inquiries.forEach(q => c.set(q.status, (c.get(q.status) || 0) + 1))
    const rank = (s) => (order.indexOf(s) === -1 ? 99 : order.indexOf(s))
    return [...c.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))
      .map(([label, value]) => ({ label, value }))
  }, [inquiries])

  const totalViews = MOCK_MODE
    ? properties.reduce((sum, p) => sum + (p.viewsCount || 0), 0)
    : (analytics?.totalViews ?? 0)

  const mostViewed = MOCK_MODE
    ? [...properties].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 6).map(p => ({
        id: p.id, title: p.title, city: p.area || p.city || '', purpose: p.purpose,
        status: p.status, thumb: p.images?.[0] || '', views: p.viewsCount || 0,
      }))
    : (analytics?.items ?? [])

  // A trend is only shown when a real previous month exists in the SAME year being viewed.
  const nowMonth = new Date().getMonth()
  const isCurrentYear = year === new Date().getFullYear()
  const trendFor = (key) => {
    if (!isCurrentYear || nowMonth < 1) return null
    return (months[nowMonth]?.[key] ?? 0) - (months[nowMonth - 1]?.[key] ?? 0)
  }
  const sparkFor = (key) => months.map(m => m[key] ?? 0)

  const activeMetric = TIMELINE_METRICS.find(m => m.key === metric) || TIMELINE_METRICS[0]
  const statusChangeTotal = STATUS_SERIES.reduce(
    (sum, s) => sum + months.reduce((a, m) => a + (m[s.key] ?? 0), 0), 0)

  const catalogue = [
    [t('admin.dashboard.catAgents'), agents.length, <IconUsers key="a" className="w-4 h-4" />, '/admin/agents'],
    [t('admin.dashboard.catAreas'), areas.length, <IconPin key="b" className="w-4 h-4" />, '/admin/areas'],
    [t('admin.dashboard.catDevelopments'), developments.length, <IconCrane key="c" className="w-4 h-4" />, '/admin/developments'],
    [t('admin.dashboard.catTypes'), propertyTypes.length, <IconBuilding key="d" className="w-4 h-4" />, '/admin/properties'],
    [t('admin.dashboard.catAmenities'), features.length, <IconSparkle key="e" className="w-4 h-4" />, '/admin/features'],
    [t('admin.dashboard.catRoles'), jobs.length, <IconBriefcase key="f" className="w-4 h-4" />, '/admin/jobs'],
  ]

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageTitle title={t('admin.dashboard.title')} />

      {/* ---- headline numbers ------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatTile label={t('admin.dashboard.totalProperties')} value={fmt(totalCount)} icon={<IconHome className="w-4 h-4" />}
          trend={trendFor('newProperties')} spark={sparkFor('newProperties')} />
        <StatTile label={t('admin.dashboard.published')} value={fmt(byStatus.Published ?? 0)} icon={<IconBuilding className="w-4 h-4" />}
          trend={trendFor('published')} spark={sparkFor('published')} sparkColor={SERIES.published.color} />
        <StatTile label={t('admin.dashboard.totalViews')} value={fmt(totalViews)} icon={<IconEye className="w-4 h-4" />}
          hint={t('admin.dashboard.allTime')} />
        <StatTile label={t('admin.dashboard.leads')} value={fmt(inquiries.length)} icon={<IconInbox className="w-4 h-4" />}
          trend={trendFor('newLeads')} spark={sparkFor('newLeads')} sparkColor={SERIES.rented.color} />
        <StatTile label={t('admin.dashboard.featured')} value={fmt(featured)} icon={<IconAward className="w-4 h-4" />}
          hint={t('admin.dashboard.onHomepage')} />
        <StatTile label={t('admin.dashboard.consultants')} value={fmt(agents.length)} icon={<IconUsers className="w-4 h-4" />}
          hint={t('admin.dashboard.nDevelopments', { n: fmt(developments.length) })} />
      </div>

      {/* ---- the two timelines, side by side, each half the content width ----------- */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
        <Card
          title={t('admin.dashboard.listingActivity')}
          subtitle={t('admin.dashboard.byCreationDate')}
          action={
            <select className="field-dark !w-auto !py-1 !px-2 text-[11px]" value={year}
              onChange={e => setYear(+e.target.value)} aria-label={t('admin.dashboard.year')}>
              {(stats.availableYears || [year]).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          }>
          <div className="flex items-center gap-1.5 mb-2">
            {TIMELINE_METRICS.map(m => (
              <Chip key={m.key} active={metric === m.key} onClick={() => setMetric(m.key)} dot={m.color}>{t(m.labelKey)}</Chip>
            ))}
            <span className="ms-auto text-[11px] text-neutral-500 whitespace-nowrap">
              <span className="font-semibold text-neutral-300 tabular-nums">{fmt(sparkFor(metric).reduce((a, b) => a + b, 0))}</span> {t('admin.dashboard.inYear', { year })}
            </span>
          </div>
          <WaveChart months={months} series={[{ key: activeMetric.key, label: t(activeMetric.labelKey), color: activeMetric.color }]} />
        </Card>

        <Card
          title={t('admin.dashboard.statusChanges')}
          subtitle={t('admin.dashboard.byHistory')}
          action={<span className="text-[11px] text-neutral-500 whitespace-nowrap"><span className="font-semibold text-neutral-300 tabular-nums">{fmt(statusChangeTotal)}</span> {t('admin.dashboard.inYear', { year })}</span>}>
          <WaveChart months={months} series={STATUS_SERIES} />
        </Card>
      </div>

      {/* ---- composition, demand, pipeline ----------------------------------------- */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <Card title={t('admin.dashboard.mostViewed')} subtitle={t('admin.dashboard.mostViewedSub')}>
          {mostViewed.length === 0 ? (
            <p className="text-xs text-neutral-500 py-3">{t('admin.dashboard.noViews')}</p>
          ) : (
            <ol className="divide-y divide-white/6 -my-1">
              {mostViewed.slice(0, 6).map((p, i) => (
                <li key={p.id}>
                  <Link to={`/property/${p.purpose || 'buy'}/${p.id}`}
                    className="group flex items-center gap-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/4">
                    <span className="w-4 text-[10.5px] font-bold text-neutral-600 tabular-nums shrink-0 text-center">{i + 1}</span>
                    {p.thumb
                      ? <img src={p.thumb} alt="" loading="lazy" className="w-8 h-8 rounded-md object-cover shrink-0" />
                      : <span className="w-8 h-8 rounded-md bg-white/6 shrink-0" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] text-neutral-200 group-hover:text-primary transition-colors truncate leading-tight">{p.title}</span>
                      <span className="block text-[10px] text-neutral-500 truncate">{p.city || '—'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-neutral-200 tabular-nums shrink-0">
                      <IconEye className="w-3.5 h-3.5 text-neutral-500" />{fmt(p.views)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title={t('admin.dashboard.portfolioMix')} subtitle={sampleNote || t('admin.dashboard.everyListing')}>
          <Donut
            total={totalCount}
            centerLabel={t('admin.dashboard.listingsTotal')}
            slices={STATUS_SLICES.filter(s => (byStatus[s.key] ?? 0) > 0)
              .map(s => ({ label: s.labelKey ? t(s.labelKey) : s.label, value: byStatus[s.key] ?? 0, color: s.color }))}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 pt-3.5 border-t border-white/6 text-[11px]">
            {[[t('admin.dashboard.forSale'), forSale], [t('admin.dashboard.forRent'), forRent], [t('admin.dashboard.offPlan'), offPlan], [t('admin.dashboard.priceOnRequest'), onRequest]].map(([l, v]) => (
              <div key={l} className="flex items-baseline justify-between gap-2">
                <span className="text-neutral-500 truncate">{l}</span>
                <span className="font-semibold text-neutral-200 tabular-nums">{fmt(v)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Third of three in a two-column grid at tablet width — span the row rather than
            leaving a hole beside it. */}
        <Card className="md:col-span-2 xl:col-span-1"
          title={t('admin.dashboard.leadPipeline')} subtitle={t('admin.dashboard.byStage', { n: fmt(inquiries.length) })}
          action={<Link to="/admin/leads" className="text-[11px] text-primary brand-link whitespace-nowrap">{t('admin.dashboard.allLeads')}</Link>}>
          <BarList rows={leadStages} color={SERIES.rented.color}
            emptyMessage={t('admin.dashboard.noEnquiries')} />
          {leadSources.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-white/6">
              <p className="text-[10.5px] uppercase tracking-wider text-neutral-600 mb-2.5">{t('admin.dashboard.whereFrom')}</p>
              <BarList rows={leadSources} color={SERIES.archived.color} />
            </div>
          )}
        </Card>
      </div>

      {/* ---- distributions. The consultant card only exists when listings actually carry
              an assigned agent, so the column count follows the data. ---------------- */}
      <div className={`grid md:grid-cols-2 gap-4 sm:gap-5 ${topAgents.length > 0 ? 'xl:grid-cols-3' : ''}`}>
        <Card title={t('admin.dashboard.topTypes')} subtitle={sampleNote || t('admin.dashboard.perType')}>
          <BarList rows={topTypes} color={SERIES.published.color} emptyMessage={t('admin.dashboard.noBreakdown')} />
        </Card>

        <Card title={t('admin.dashboard.topLocations')} subtitle={sampleNote || t('admin.dashboard.perArea')}>
          <BarList rows={topLocations} color={BRAND} emptyMessage={t('admin.dashboard.noBreakdown')} />
        </Card>

        {topAgents.length > 0 && (
          <Card title={t('admin.dashboard.perConsultant')} subtitle={t('admin.dashboard.assignedAgent')}>
            <BarList rows={topAgents} color={SERIES.archived.color} />
          </Card>
        )}
      </div>

      <Card title={t('admin.dashboard.catalogue')} subtitle={t('admin.dashboard.catalogueSub')}>
        <CatalogueGrid items={catalogue} cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />
      </Card>

      {/* ---- recent activity -------------------------------------------------------- */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
        <Card title={t('admin.dashboard.recentLeads')} subtitle={t('admin.dashboard.newestFirst')}
          action={<Link to="/admin/leads" className="text-[11px] text-primary brand-link whitespace-nowrap">{t('admin.dashboard.allLeads')}</Link>}>
          {inquiries.length === 0 ? (
            <p className="text-xs text-neutral-500 py-3">{t('admin.dashboard.noEnquiriesShort')}</p>
          ) : (
            <table className="w-full text-[12px]">
              <tbody className="divide-y divide-white/6">
                {inquiries.slice(0, 5).map(q => (
                  <tr key={q.id}>
                    <td className="py-2 pe-2 text-neutral-200 truncate max-w-[140px]">{q.name}</td>
                    <td className="py-2 pe-2 text-neutral-500 hidden sm:table-cell truncate max-w-[150px]">{q.typeLabel || q.source}</td>
                    <td className="py-2 text-end"><StatusBadge value={q.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title={t('admin.dashboard.recentlyAdded')} subtitle={t('admin.dashboard.latestListings')}
          action={<Link to="/admin/properties" className="text-[11px] text-primary brand-link whitespace-nowrap">{t('admin.dashboard.allProperties')}</Link>}>
          {properties.length === 0 ? (
            <p className="text-xs text-neutral-500 py-3">{t('admin.dashboard.noListings')}</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
              {properties.slice(0, 8).map(p => (
                <Link key={p.id} to="/admin/properties" className="shrink-0 w-32 group">
                  <img src={p.images?.[0]} alt="" loading="lazy"
                    className="w-32 h-20 object-cover rounded-lg mb-1.5 border border-white/8" />
                  <div className="text-[11px] text-neutral-400 group-hover:text-primary transition-colors line-clamp-2 leading-snug">{p.title}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
