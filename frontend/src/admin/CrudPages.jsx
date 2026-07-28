import { useState } from 'react'
import { useData } from '../store/DataContext'
import { useToast } from '../components/Toast'
import { CrudPage, PageTitle, Modal, StatusBadge, Field } from './adminUi'

export function DevelopmentsAdmin() {
  const { developments, developmentActions } = useData()
  return <CrudPage title="Developments" rows={developments} actions={developmentActions}
    defaults={{ name: '', area: '', deliveryYear: 2027, coverImage: '', description: '', unitsCount: 0, developer: '', startingPrice: 0, paymentPlan: '', slug: '' }}
    columns={[
      { key: 'coverImage', label: '', render: r => <img src={r.coverImage} alt="" className="w-16 h-11 object-cover" /> },
      { key: 'name', label: 'Project' }, { key: 'area', label: 'Area' },
      { key: 'deliveryYear', label: 'Delivery' }, { key: 'unitsCount', label: 'Units' }, { key: 'developer', label: 'Developer' },
    ]}
    fields={[
      { key: 'name', label: 'Project name', required: true }, { key: 'area', label: 'Location / area', required: true },
      { key: 'deliveryYear', label: 'Delivery year', type: 'number' }, { key: 'unitsCount', label: 'Units count', type: 'number' },
      { key: 'developer', label: 'Developer' }, { key: 'coverImage', label: 'Cover image URL', required: true },
      { key: 'startingPrice', label: 'Starting price (QAR)', type: 'number' }, { key: 'paymentPlan', label: 'Payment plan' },
      { key: 'slug', label: 'Slug (url name)' }, { key: 'description', label: 'Description', type: 'textarea' },
    ]} />
}

export function AreasAdmin() {
  const { areas, areaActions, areaCount } = useData()
  return <CrudPage title="Areas" rows={areas} actions={areaActions}
    defaults={{ name: '', photo: '', intro: '', slug: '' }}
    columns={[
      { key: 'photo', label: '', render: r => <img src={r.photo} alt="" className="w-16 h-11 object-cover" /> },
      { key: 'name', label: 'Area' },
      // property count is COMPUTED from listings, never typed by hand
      { key: 'count', label: 'Properties', render: r => areaCount(r.name) },
    ]}
    fields={[
      { key: 'name', label: 'Area name', required: true }, { key: 'slug', label: 'Slug (url name)' },
      { key: 'photo', label: 'Photo URL', required: true }, { key: 'intro', label: 'Intro text', type: 'textarea' },
    ]} />
}

export function AgentsAdmin() {
  const { agents, agentActions } = useData()
  return <CrudPage title="Agents" rows={agents} actions={agentActions}
    defaults={{ name: '', title: '', photo: '', phone: '', whatsapp: '', email: '', rating: 0, bio: '', active: true }}
    columns={[
      { key: 'photo', label: '', render: r => <img src={r.photo} alt="" className="w-11 h-11 rounded-full object-cover" /> },
      { key: 'name', label: 'Name' }, { key: 'title', label: 'Title' }, { key: 'phone', label: 'Phone' },
      { key: 'rating', label: 'Rating', render: r => r.rating > 0 ? `★ ${r.rating.toFixed(1)}` : '—' },
      { key: 'active', label: 'Active', render: r => <StatusBadge value={r.active ? 'active' : 'hidden'} map={{ active: 'bg-green-900 text-green-300', hidden: 'bg-neutral-800 text-neutral-400' }} /> },
    ]}
    fields={[
      { key: 'name', label: 'Full name', required: true }, { key: 'title', label: 'Job title', required: true },
      { key: 'photo', label: 'Portrait photo URL', required: true }, { key: 'phone', label: 'Phone' },
      { key: 'whatsapp', label: 'WhatsApp number' }, { key: 'email', label: 'Email' },
      { key: 'rating', label: 'Rating (0–5)', type: 'number' }, { key: 'active', label: 'Active (visible on site)', type: 'toggle' },
      { key: 'bio', label: 'Short bio', type: 'textarea' },
    ]} />
}

export function JobsAdmin() {
  const { jobs, jobActions } = useData()
  return <CrudPage title="Jobs" rows={jobs} actions={jobActions}
    defaults={{ title: '', department: 'Sales', type: 'Full-time', location: 'Doha, Qatar', description: '', active: true }}
    columns={[
      { key: 'title', label: 'Title' }, { key: 'department', label: 'Department' },
      { key: 'type', label: 'Type' }, { key: 'location', label: 'Location' },
      { key: 'active', label: 'Active', render: r => <StatusBadge value={r.active ? 'open' : 'closed'} map={{ open: 'bg-green-900 text-green-300', closed: 'bg-neutral-800 text-neutral-400' }} /> },
    ]}
    fields={[
      { key: 'title', label: 'Job title', required: true },
      { key: 'department', label: 'Department', type: 'select', options: ['Marketing', 'Operations', 'Sales', 'Technology'] },
      { key: 'type', label: 'Type', type: 'select', options: ['Full-time', 'Part-time'] },
      { key: 'location', label: 'Location' }, { key: 'active', label: 'Active', type: 'toggle' },
      { key: 'description', label: 'Description (2–3 lines)', type: 'textarea', required: true },
    ]} />
}

export function ArticlesAdmin() {
  const { articles, articleActions } = useData()
  return <CrudPage title="Articles" rows={articles} actions={articleActions}
    defaults={{ title: '', category: 'agents', coverImage: '', body: '', published: true }}
    columns={[
      { key: 'coverImage', label: '', render: r => <img src={r.coverImage} alt="" className="w-16 h-11 object-cover" /> },
      { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' },
      { key: 'published', label: 'Published', render: r => <StatusBadge value={r.published ? 'live' : 'draft'} map={{ live: 'bg-green-900 text-green-300', draft: 'bg-neutral-800 text-neutral-400' }} /> },
    ]}
    fields={[
      { key: 'title', label: 'Title', required: true },
      { key: 'category', label: 'Category', type: 'select', options: [['agents', 'Agents'], ['investors', 'Investors'], ['clients', 'Clients']] },
      { key: 'coverImage', label: 'Cover image URL', required: true },
      { key: 'published', label: 'Published', type: 'toggle' },
      { key: 'body', label: 'Body (short lines become headings)', type: 'textarea', required: true },
    ]} />
}

export function LeadsAdmin() {
  const { inquiries, inquiryActions, properties, agents } = useData()
  const toast = useToast()
  const [selected, setSelected] = useState(null)
  const linked = (q) => q.propertyId ? properties.find(p => p.id === q.propertyId)?.title
    : q.agentId ? agents.find(a => a.id === q.agentId)?.name : null

  return (
    <div>
      <PageTitle title="Leads" />
      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-ink text-neutral-400 text-left text-xs uppercase tracking-wider">
            <tr>{['Date', 'Name', 'Contact', 'Source', 'Message', 'Status'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {inquiries.map(q => (
              <tr key={q.id} className="hover:bg-neutral-900/60 cursor-pointer" onClick={() => setSelected(q)}>
                <td className="px-4 py-3 whitespace-nowrap text-neutral-400">{q.date}</td>
                <td className="px-4 py-3 text-white">{q.name}</td>
                <td className="px-4 py-3 text-neutral-400"><div>{q.phone}</div><div className="text-[11px]">{q.email}</div></td>
                <td className="px-4 py-3">{q.source}{linked(q) && <div className="text-[11px] text-gold">{linked(q)}</div>}</td>
                <td className="px-4 py-3 max-w-[220px] truncate text-neutral-400">{q.message}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <select value={q.status} className="field-dark !py-1 !w-auto"
                    onChange={e => { inquiryActions.update(q.id, { status: e.target.value }); toast('Lead status updated.') }}>
                    <option>New</option><option>Contacted</option><option>Closed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`Lead — ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm text-neutral-300">
            <p><span className="text-neutral-500">Date:</span> {selected.date} · <StatusBadge value={selected.status} /></p>
            <p><span className="text-neutral-500">Contact:</span> {selected.phone} · {selected.email}</p>
            <p><span className="text-neutral-500">Source:</span> {selected.source}</p>
            {linked(selected) && <p><span className="text-neutral-500">Linked to:</span> <span className="text-gold">{linked(selected)}</span></p>}
            <div className="border border-neutral-800 bg-ink p-4 whitespace-pre-line">{selected.message}</div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function SettingsAdmin() {
  const { settings, setSettings } = useData()
  const toast = useToast()
  const [f, setF] = useState(settings)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="max-w-2xl">
      <PageTitle title="Settings" />
      <form className="grid md:grid-cols-2 gap-4" onSubmit={e => { e.preventDefault(); setSettings(f); toast('Settings saved — live across the site.') }}>
        <Field label="Site name"><input className="field-dark" value={f.siteName} onChange={set('siteName')} /></Field>
        <Field label="Contact phone"><input className="field-dark" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="WhatsApp number"><input className="field-dark" value={f.whatsapp} onChange={set('whatsapp')} /></Field>
        <Field label="Contact email"><input className="field-dark" value={f.email} onChange={set('email')} /></Field>
        <Field label="Instagram URL"><input className="field-dark" value={f.instagram} onChange={set('instagram')} /></Field>
        <Field label="LinkedIn URL"><input className="field-dark" value={f.linkedin} onChange={set('linkedin')} /></Field>
        <div className="md:col-span-2"><Field label="Footer about text"><textarea rows="3" className="field-dark" value={f.footerAbout} onChange={set('footerAbout')} /></Field></div>
        <div className="md:col-span-2"><button className="btn-gold">Save Settings</button></div>
      </form>
    </div>
  )
}
