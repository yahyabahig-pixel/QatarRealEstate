import { useState } from 'react'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import { EmptyState } from '../components/ui'

const TEAM = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1800&q=80'

export default function Careers() {
  // Filter chips come from the store (GET /api/jobs/departments in live mode, derived
  // from the seeds in mock mode) — never a hardcoded list that rots the day HR opens
  // a role in a department this file has never heard of.
  const { jobs, settings, jobDepartments } = useData()
  const { t } = useI18n()
  // 'All Departments' stays an internal sentinel; only its visible label localizes.
  const ALL = 'All Departments'
  const departments = [ALL, ...jobDepartments]
  const [dept, setDept] = useState(ALL)
  const visible = jobs.filter(j => j.active && (dept === ALL || j.department === dept))

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="eyebrow mb-2">{t('careers.eyebrow')}</div>
          <h1 className="h-serif text-4xl md:text-5xl mb-4">{t('careers.title', { name: settings.siteName })}</h1>
          <p className="text-neutral-600">{t('careers.subtitle')}</p>
        </div>
        <img src={TEAM} alt={t('careers.teamAlt')} className="w-full h-80 object-cover rounded-2xl mb-12" />

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-8 justify-center">
          {departments.map(d => (
            <button key={d} onClick={() => setDept(d)}
              className={`chip ${dept === d ? 'chip-active' : ''}`}>{d === ALL ? t('careers.allDepartments') : d}</button>
          ))}
        </div>

        {visible.length === 0
          ? <EmptyState message={t('careers.empty')} />
          : (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {visible.map(j => (
                <div key={j.id} className="card p-6 lift">
                  <div className="flex gap-2 mb-3">
                    <span className="badge badge-neutral">{j.department}</span>
                    <span className="badge badge-primary">{j.type}</span>
                  </div>
                  <h3 className="h-serif text-xl mb-1">{j.title}</h3>
                  <p className="text-xs text-neutral-400 mb-2">{j.location}</p>
                  <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{j.description}</p>
                  <a href={`mailto:${settings.email}?subject=${encodeURIComponent(t('careers.applySubject', { title: j.title }))}`} className="btn-primary">{t('careers.apply')}</a>
                </div>
              ))}
            </div>
          )}

        <div className="text-center mt-16 bg-ink text-white py-14 px-4 rounded-2xl">
          <h2 className="h-serif text-3xl mb-3">{t('careers.noRoleTitle')}</h2>
          <p className="text-neutral-400 mb-6">{t('careers.noRoleBody')}</p>
          <a href={`mailto:${settings.email}?subject=${encodeURIComponent(t('careers.openApplication'))}`} className="btn-primary">{t('careers.sendCv')}</a>
        </div>
      </div>
    </div>
  )
}
