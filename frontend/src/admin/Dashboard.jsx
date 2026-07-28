import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { PageTitle, StatusBadge } from './adminUi'
import { IconEye } from '../components/icons'
import { MOCK_MODE } from '../api/client'
import { propertiesAdminApi } from '../api/realEstateApi'

export default function Dashboard() {
  const { properties, inquiries } = useData()
  const active = properties.filter(p => p.status === 'available')

  // Real view analytics. LIVE: GET /api/admin/properties/most-viewed (aggregate
  // ViewsCount maintained by the backend's PropertyViewRecorder). MOCK: derived from
  // the seeds. A failed fetch keeps the last good numbers — never blanks the dashboard.
  const [analytics, setAnalytics] = useState(null)   // { totalViews, items } | null
  useEffect(() => {
    if (MOCK_MODE) return
    let on = true
    propertiesAdminApi.mostViewed(5)
      .then(a => { if (on) setAnalytics(a) })
      .catch(() => {})
    return () => { on = false }
  }, [])

  const mockTop = [...properties]
    .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
    .slice(0, 5)
    .map(p => ({
      id: p.id, title: p.title, city: p.area || p.city || '', purpose: p.purpose,
      status: p.status, price: p.priceOnRequest ? null : p.price, currency: p.currency,
      thumb: p.images?.[0] || '', views: p.viewsCount || 0,
    }))
  const totalViews = MOCK_MODE
    ? properties.reduce((sum, p) => sum + (p.viewsCount || 0), 0)
    : (analytics?.totalViews ?? 0)
  const mostViewed = MOCK_MODE ? mockTop : (analytics?.items ?? [])

  const stats = [
    ['Total properties', properties.length], ['Active listings', active.length],
    ['Total leads', inquiries.length], ['Total property views', totalViews.toLocaleString()],
  ]
  const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
  const bars = [4, 7, 5, 9, 8, 12]

  return (
    <div>
      <PageTitle title="Dashboard" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(([k, v]) => (
          <div key={k} className="panel-dark p-5">
            <div className="text-3xl font-bold tracking-tight text-white">{v}</div>
            <div className="text-xs font-medium text-neutral-500 mt-1.5">{k}</div>
          </div>
        ))}
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
          <Link to="/admin/leads" className="text-gold text-sm gold-link inline-block mt-3">All leads →</Link>
        </div>

        <div className="panel-dark p-5">
          <h2 className="text-white mb-4 text-sm font-semibold">Listings per month</h2>
          <div className="flex items-end gap-3 h-40">
            {bars.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                <div className="w-full bg-gold/70 hover:bg-gold rounded-t-md transition-colors" style={{ height: `${b * 10}px` }} />
                <span className="text-[10px] text-neutral-500">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Most viewed — real data from the view recorder, ranked in the database */}
      <div className="mt-6 panel-dark p-5">
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
                        <span className="text-white group-hover:text-gold transition-colors truncate max-w-[260px]">{p.title}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-400 hidden sm:table-cell">{p.city || '—'}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-gold font-semibold">
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

      <div className="mt-6 panel-dark p-5">
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
  )
}
