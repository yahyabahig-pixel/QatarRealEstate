import { useState } from 'react'
import { useData } from '../store/DataContext'
import { EmptyState } from '../components/ui'

const TEAM = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1800&q=80'

export default function Careers() {
  // Filter chips come from the store (GET /api/jobs/departments in live mode, derived
  // from the seeds in mock mode) — never a hardcoded list that rots the day HR opens
  // a role in a department this file has never heard of.
  const { jobs, settings, jobDepartments } = useData()
  const departments = ['All Departments', ...jobDepartments]
  const [dept, setDept] = useState('All Departments')
  const visible = jobs.filter(j => j.active && (dept === 'All Departments' || j.department === dept))

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="eyebrow mb-2">Careers</div>
          <h1 className="h-serif text-4xl md:text-5xl mb-4">Build Your Career with {settings.siteName}</h1>
          <p className="text-neutral-600">Join the team defining how Qatar buys, sells and rents its finest homes.</p>
        </div>
        <img src={TEAM} alt="Our team" className="w-full h-80 object-cover mb-12" />

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-8 justify-center">
          {departments.map(d => (
            <button key={d} onClick={() => setDept(d)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${dept === d ? 'bg-ink text-gold border-ink' : 'border-neutral-300 hover:border-gold'}`}>{d}</button>
          ))}
        </div>

        {visible.length === 0
          ? <EmptyState message="No open positions in this department at the moment. Please check back later." />
          : (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {visible.map(j => (
                <div key={j.id} className="border border-neutral-200 p-6 lift">
                  <div className="flex gap-2 mb-3">
                    <span className="bg-neutral-100 text-xs px-2 py-1 uppercase tracking-wider">{j.department}</span>
                    <span className="bg-gold/10 text-gold text-xs px-2 py-1 uppercase tracking-wider">{j.type}</span>
                  </div>
                  <h3 className="h-serif text-xl mb-1">{j.title}</h3>
                  <p className="text-xs text-neutral-400 mb-2">{j.location}</p>
                  <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{j.description}</p>
                  <a href={`mailto:${settings.email}?subject=Application: ${encodeURIComponent(j.title)}`} className="btn-gold">Apply Now</a>
                </div>
              ))}
            </div>
          )}

        <div className="text-center mt-16 bg-ink text-white py-12 px-4">
          <h2 className="h-serif text-3xl mb-3">Don't See the Right Role?</h2>
          <p className="text-neutral-400 mb-6">Exceptional people always have a seat here — introduce yourself.</p>
          <a href={`mailto:${settings.email}?subject=Open application`} className="btn-gold">Send Your CV</a>
        </div>
      </div>
    </div>
  )
}
