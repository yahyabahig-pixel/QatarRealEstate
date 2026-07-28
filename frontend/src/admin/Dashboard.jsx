import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { PageTitle, StatusBadge } from './adminUi'

export default function Dashboard() {
  const { properties, inquiries } = useData()
  const active = properties.filter(p => p.status === 'available')
  const stats = [
    ['Total properties', properties.length], ['Active listings', active.length],
    ['Total leads', inquiries.length], ['Views this month', '12,4K'],
  ]
  const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
  const bars = [4, 7, 5, 9, 8, 12]

  return (
    <div>
      <PageTitle title="Dashboard" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(([k, v]) => (
          <div key={k} className="bg-coal border border-neutral-800 p-5">
            <div className="text-3xl h-serif text-gold">{v}</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">{k}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-coal border border-neutral-800 p-5">
          <h2 className="text-white mb-4 text-sm uppercase tracking-wider">Recent leads</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-neutral-800">
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

        <div className="bg-coal border border-neutral-800 p-5">
          <h2 className="text-white mb-4 text-sm uppercase tracking-wider">Listings per month</h2>
          <div className="flex items-end gap-3 h-40">
            {bars.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                <div className="w-full bg-gold/80 hover:bg-gold transition-colors" style={{ height: `${b * 10}px` }} />
                <span className="text-[10px] text-neutral-500">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-coal border border-neutral-800 p-5">
        <h2 className="text-white mb-4 text-sm uppercase tracking-wider">Recently added properties</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {properties.slice(0, 6).map(p => (
            <Link key={p.id} to="/admin/properties" className="shrink-0 w-44">
              <img src={p.images[0]} alt="" className="w-44 h-28 object-cover mb-2" />
              <div className="text-xs text-neutral-300 line-clamp-2">{p.title}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
