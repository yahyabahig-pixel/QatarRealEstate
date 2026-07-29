import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { PageTitle, StatusBadge } from './adminUi'
import { IconEye } from '../components/icons'
import { MOCK_MODE } from '../api/client'
import { propertiesAdminApi } from '../api/realEstateApi'

const METRICS = [
  ['newProperties', 'New properties'], ['published', 'Published'],
  ['sold', 'Sold'], ['rented', 'Rented'], ['archived', 'Archived'], ['newLeads', 'Leads'],
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const zeroMonths = () => MONTHS_LONG.map((name, i) => ({
  month: i + 1, monthName: name, newProperties: 0, published: 0, sold: 0, rented: 0, archived: 0, newLeads: 0,
}))

// Bar with a rounded TOP only — the data end; the baseline edge stays square.
const topRoundedRect = (x, y, w, h, r) => {
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`
}

// Single-series monthly bar chart, hand-rolled SVG. Series color #C42B41 is the brand
// primary snapped into the dark-surface lightness band (validated); hover brightens to the
// brand accent. All text stays in neutral ink tokens, never the series color.
function MonthlyBarChart({ months, metricKey, metricLabel }) {
  const [hover, setHover] = useState(null)
  const W = 720, H = 210, padL = 36, padB = 24, padT = 18
  const values = months.map(m => m[metricKey] ?? 0)
  const maxV = Math.max(4, ...values)
  const plotH = H - padT - padB
  const slot = (W - padL) / 12
  const barW = Math.min(26, slot * 0.45)
  const yFor = (v) => padT + plotH * (1 - v / maxV)
  const ticks = [0, Math.round(maxV / 2), maxV]
  const peak = Math.max(...values)
  const peakIdx = values.indexOf(peak)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label={`${metricLabel} per month — peak ${peak} in ${months[peakIdx]?.monthName}`}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W} y1={yFor(t)} y2={yFor(t)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <text x={padL - 8} y={yFor(t) + 3.5} textAnchor="end" fontSize="10" fill="#6b7280">{t.toLocaleString()}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const x = padL + slot * i + (slot - barW) / 2
          const h = (v / maxV) * plotH
          return (
            <g key={i}>
              {v > 0 && (
                <path d={topRoundedRect(x, yFor(v), barW, h, 4)}
                  fill={hover === i ? '#EF233C' : '#C42B41'} />
              )}
              {/* selective direct label: the peak only — everything else lives in the tooltip */}
              {i === peakIdx && v > 0 && (
                <text x={x + barW / 2} y={yFor(v) - 5} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#d4d4d4">
                  {v.toLocaleString()}
                </text>
              )}
              <text x={padL + slot * i + slot / 2} y={H - 7} textAnchor="middle" fontSize="10" fill="#6b7280">
                {MONTHS_SHORT[i]}
              </text>
              {/* hover hit target: the whole month column, larger than the mark */}
              <rect x={padL + slot * i} y={padT} width={slot} height={plotH + padB} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="absolute -top-1 pointer-events-none panel-dark !rounded-lg px-3 py-1.5 text-xs text-white shadow-xl shadow-black/40 whitespace-nowrap"
          style={{ left: `${((padL + slot * hover + slot / 2) / W) * 100}%`, transform: 'translateX(-50%)' }}>
          {months[hover].monthName}: <span className="font-semibold">{values[hover].toLocaleString()}</span>
          <span className="text-neutral-400"> {metricLabel.toLowerCase()}</span>
        </div>
      )}
      {/* screen-reader table view of the same data */}
      <table className="sr-only">
        <caption>{metricLabel} per month</caption>
        <tbody>{months.map((m, i) => <tr key={m.month}><th scope="row">{m.monthName}</th><td>{values[i]}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

export default function Dashboard() {
  const { properties, inquiries } = useData()

  const [analytics, setAnalytics] = useState(null)   // most-viewed { totalViews, items }
  const [liveStats, setLiveStats] = useState(null)   // dashboard statistics for the year
  const [counts, setCounts] = useState(null)         // live status counts (admin list)
  const [year, setYear] = useState(new Date().getFullYear())
  const [metric, setMetric] = useState('newProperties')

  // Most-viewed + status counts: one fetch each, real data, failures keep last state.
  useEffect(() => {
    if (MOCK_MODE) return
    let on = true
    propertiesAdminApi.mostViewed(5).then(a => { if (on) setAnalytics(a) }).catch(() => {})
    propertiesAdminApi.list({ pageSize: 100 }).then(page => {
      if (!on) return
      const items = page?.items || []
      setCounts({
        total: page?.totalCount ?? page?.total ?? items.length,
        published: items.filter(i => i.status === 'Published').length,
        sold: items.filter(i => i.status === 'Sold').length,
        rented: items.filter(i => i.status === 'Rented').length,
      })
    }).catch(() => {})
    return () => { on = false }
  }, [])

  // Monthly statistics for the selected year (live: grouped in SQL by the timestamps
  // that actually describe each metric — CreatedAtUtc for new listings, the status
  // history's own timestamps for published/sold/rented/archived).
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
  const metricLabel = METRICS.find(([k]) => k === metric)?.[1] || ''

  const totalViews = MOCK_MODE
    ? properties.reduce((sum, p) => sum + (p.viewsCount || 0), 0)
    : (analytics?.totalViews ?? 0)
  const mostViewed = MOCK_MODE
    ? [...properties].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 5).map(p => ({
        id: p.id, title: p.title, city: p.area || p.city || '', purpose: p.purpose,
        status: p.status, thumb: p.images?.[0] || '', views: p.viewsCount || 0,
      }))
    : (analytics?.items ?? [])

  const c = MOCK_MODE
    ? {
        total: properties.length,
        published: properties.filter(p => p.status === 'available').length,
        sold: properties.filter(p => p.status === 'sold').length,
        rented: properties.filter(p => p.status === 'rented').length,
      }
    : (counts ?? { total: properties.length, published: '—', sold: '—', rented: '—' })

  const cards = [
    ['Total properties', c.total], ['Published', c.published],
    ['Sold', c.sold], ['Rented', c.rented],
    ['Total leads', inquiries.length], ['Total property views', totalViews.toLocaleString()],
  ]

  return (
    <div>
      <PageTitle title="Dashboard" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {cards.map(([k, v]) => (
          <div key={k} className="panel-dark p-5">
            <div className="text-3xl font-bold tracking-tight text-white">{v}</div>
            <div className="text-xs font-medium text-neutral-500 mt-1.5">{k}</div>
          </div>
        ))}
      </div>

      {/* Property statistics — real monthly activity, always 12 months, zeros visible */}
      <div className="panel-dark p-5 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-white text-sm font-semibold">Property statistics</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              New listings by creation date · status changes by their history timestamps
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {METRICS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMetric(k)} aria-pressed={metric === k}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${metric === k ? 'bg-primary text-white border-primary' : 'border-white/15 text-neutral-400 hover:border-primary hover:text-primary'}`}>
                {label.replace(' properties', '')}
              </button>
            ))}
            <select className="field-dark !w-auto !py-1 !px-2.5 text-xs" value={year}
              onChange={e => setYear(+e.target.value)} aria-label="Year">
              {(stats.availableYears || [year]).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <MonthlyBarChart months={stats.months} metricKey={metric} metricLabel={metricLabel} />
      </div>

      {/* Most viewed — real data from the view recorder, ranked in the database */}
      <div className="panel-dark p-5 mb-6">
        <h2 className="text-white mb-1 text-sm font-semibold">Most viewed properties</h2>
        <p className="text-[11px] text-neutral-500 mb-4">All time · counted by the site's view tracker</p>
        {mostViewed.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4">No views recorded yet — counts appear as soon as visitors open listings.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-neutral-500 text-left text-xs uppercase tracking-wider">
                <tr><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Property</th><th className="py-2 pr-3 hidden sm:table-cell">Location</th><th className="py-2 pr-3">Views</th><th className="py-2 hidden md:table-cell">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {mostViewed.map((p, i) => (
                  <tr key={p.id} className="hover:bg-white/4 transition-colors">
                    <td className="py-2.5 pr-3 text-neutral-500 font-semibold">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <Link to={`/property/${p.purpose || 'buy'}/${p.id}`} className="flex items-center gap-3 group">
                        {p.thumb && <img src={p.thumb} alt="" className="w-14 h-10 object-cover rounded shrink-0" />}
                        <span className="text-white group-hover:text-primary transition-colors truncate max-w-[260px]">{p.title}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-400 hidden sm:table-cell">{p.city || '—'}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-primary font-semibold">
                        <IconEye className="w-4 h-4" /> {(p.views ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 hidden md:table-cell"><StatusBadge value={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="panel-dark p-5">
          <h2 className="text-white mb-4 text-sm font-semibold">Recent leads</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/6">
              {inquiries.slice(0, 5).map(q => (
                <tr key={q.id}>
                  <td className="py-2.5">{q.name}</td>
                  <td className="py-2.5 text-neutral-500 hidden sm:table-cell">{q.source}</td>
                  <td className="py-2.5 text-right"><StatusBadge value={q.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to="/admin/leads" className="text-primary text-sm brand-link inline-block mt-3">All leads →</Link>
        </div>

        <div className="panel-dark p-5">
          <h2 className="text-white mb-4 text-sm font-semibold">Recently added properties</h2>
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {properties.slice(0, 6).map(p => (
              <Link key={p.id} to="/admin/properties" className="shrink-0 w-44">
                <img src={p.images[0]} alt="" className="w-44 h-28 object-cover rounded-lg mb-2" />
                <div className="text-xs text-neutral-300 line-clamp-2">{p.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
