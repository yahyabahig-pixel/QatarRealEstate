import { useRef, useState } from 'react'
import { useData } from '../store/DataContext'
import { useToast } from '../components/Toast'
import { CenterNotice, CrudPage, Field, ImageUpload, Modal, PageTitle, Spinner, StatusBadge, useConfirm } from './adminUi'
import { resolveFeatureIcon } from '../lib/featureIcons'
import LocationPicker from '../components/LocationPicker'
import { MOCK_MODE } from '../api/client'
import { imagesAdminApi, imageUrl } from '../api/realEstateApi'

// ---------------------------------------------------------------------------------------
// Developments now carry the SAME Location object as properties, picked with the SAME
// LocationPicker — no second map implementation. The cover image is uploaded from the
// admin's computer through the existing media system (imagesAdminApi), never pasted as
// a URL. This page is a dedicated form (not the generic CrudPage) because it needs both.
// ---------------------------------------------------------------------------------------
const DEV_EMPTY = {
  name: '', slug: '', deliveryYear: 2027, unitsCount: 0, developer: '', coverImage: '',
  startingPrice: 0, paymentPlan: '', description: '', area: '',
  city: '', street: '', locCountry: 'Qatar', locState: '', locDescription: '',
  x: '', y: '', lat: null, lng: null,
}

export function DevelopmentsAdmin() {
  const { developments, developmentActions } = useData()
  const toast = useToast()
  const [confirm, confirmDialog] = useConfirm()
  const [editing, setEditing] = useState(null)      // null | {} | row
  const [form, setForm] = useState(DEV_EMPTY)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState(null)

  const rows = search
    ? developments.filter(d => JSON.stringify(d).toLowerCase().includes(search.toLowerCase()))
    : developments

  const open = (row) => {
    setEditing(row ?? {})
    if (!row) { setForm(DEV_EMPTY); return }
    setForm({
      ...DEV_EMPTY, ...row,
      x: row.x || (row.lng != null ? String(row.lng) : ''),
      y: row.y || (row.lat != null ? String(row.lat) : ''),
      locState: row.locState || row.state || '',
      locCountry: row.locCountry || 'Qatar',
    })
  }

  // Same picker→form adapter shape as PropertiesAdmin.
  const applyLocation = (patch) => setForm(f => ({ ...f,
    ...(patch.x !== undefined ? { x: patch.x, y: patch.y, lat: patch.lat, lng: patch.lng } : {}),
    ...(patch.country !== undefined ? { locCountry: patch.country } : {}),
    ...(patch.city !== undefined ? { city: patch.city } : {}),
    ...(patch.street !== undefined ? { street: patch.street } : {}),
    ...(patch.state !== undefined ? { locState: patch.state } : {}),
    ...(patch.description !== undefined ? { locDescription: patch.description } : {}),
  }))


  const save = async (e) => {
    e.preventDefault()
    if (saving) return
    if (!form.coverImage) { setNotice({ kind: 'error', message: 'Upload a cover image before saving.' }); return }
    if (!form.x || !form.y) { setNotice({ kind: 'error', message: 'Select the project location on the map before saving.\nSearch for the area or click the map in the Location section.' }); return }
    setSaving(true)
    // Human-readable label for cards/chips, derived from the Location — never typed.
    const area = [form.street || form.locState, form.city].filter(Boolean).join(', ') || form.area
    const isEdit = !!editing?.id
    const res = await Promise.resolve(isEdit
      ? developmentActions.update(editing.id, { ...form, area })
      : developmentActions.add({ ...form, area }))
    setSaving(false)
    if (res && res.ok === false) { setNotice({ kind: 'error', message: res.error }); return }
    setEditing(null)
    setNotice({ kind: 'success', message: `Development ${isEdit ? 'updated' : 'added'} successfully.` })
    setTimeout(() => setNotice(n => (n?.kind === 'success' ? null : n)), 2200)
  }

  const remove = async (id) => {
    const res = await Promise.resolve(developmentActions.remove(id))
    if (res && res.ok === false) setNotice({ kind: 'error', message: res.error })
    else toast('Deleted.', 'error')
  }

  return (
    <div>
      <PageTitle title="Developments"
        action={<button className="btn-gold !py-2" onClick={() => open(null)}>+ Add Development</button>} />
      <input placeholder="Search developments…" className="field-dark max-w-xs mb-4" value={search} onChange={e => setSearch(e.target.value)} />

      {rows.length === 0 ? (
        <div className="border border-dashed border-white/15 rounded-xl p-14 text-center text-neutral-500">
          Nothing here yet.
          <div className="mt-4"><button className="btn-gold !py-2" onClick={() => open(null)}>+ Add</button></div>
        </div>
      ) : (
        <div className="overflow-x-auto panel-dark !rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-white/4 text-neutral-400 text-left text-xs uppercase tracking-wider">
              <tr>{['', 'Project', 'Location', 'Delivery', 'Units', 'Developer', 'Actions'].map(h => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {rows.map(d => (
                <tr key={d.id} className="hover:bg-white/4 transition-colors">
                  <td className="px-4 py-2"><img src={d.coverImage} alt="" className="w-16 h-11 object-cover rounded" /></td>
                  <td className="px-4 py-2 text-white">{d.name}</td>
                  <td className="px-4 py-2 text-neutral-400">{d.area || '—'}</td>
                  <td className="px-4 py-2">{d.deliveryYear}</td>
                  <td className="px-4 py-2">{d.unitsCount}</td>
                  <td className="px-4 py-2 text-neutral-400">{d.developer || '—'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <button className="text-gold hover:underline mr-3" onClick={() => open(d)}>Edit</button>
                    <button className="text-red-400 hover:underline"
                      onClick={() => confirm(`Delete "${d.name}"? This cannot be undone.`, () => remove(d.id))}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <Modal title={editing.id ? `Edit — ${form.name}` : 'Add Development'} onClose={() => !saving && setEditing(null)} wide>
          <form onSubmit={save} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Field label="Project name"><input required className="field-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field></div>
            <Field label="Delivery year"><input type="number" min="2000" max="2100" className="field-dark" value={form.deliveryYear} onChange={e => setForm({ ...form, deliveryYear: +e.target.value })} /></Field>
            <Field label="Units count"><input type="number" min="0" className="field-dark" value={form.unitsCount} onChange={e => setForm({ ...form, unitsCount: +e.target.value })} /></Field>
            <Field label="Developer"><input className="field-dark" value={form.developer} onChange={e => setForm({ ...form, developer: e.target.value })} /></Field>
            <Field label="Starting price (QAR — 0 means “price on request”)"><input type="number" min="0" className="field-dark" value={form.startingPrice} onChange={e => setForm({ ...form, startingPrice: +e.target.value })} /></Field>
            <Field label="Payment plan"><input className="field-dark" value={form.paymentPlan} onChange={e => setForm({ ...form, paymentPlan: e.target.value })} placeholder="e.g. 20/80 over 4 years" /></Field>
            <Field label="Slug (URL name)"><input className="field-dark" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="derived from the name if empty" /></Field>
            <div className="md:col-span-2"><Field label="Description"><textarea rows="3" className="field-dark" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field></div>

            <div className="md:col-span-2">
              <Field label="Location (search or click the map — the address fills in automatically)">
                <LocationPicker
                  value={{ x: form.x, y: form.y, country: form.locCountry, city: form.city, street: form.street, state: form.locState, description: form.locDescription }}
                  onChange={applyLocation}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Cover image (uploaded from your device)">
                <ImageUpload value={form.coverImage} onChange={url => setForm(f => ({ ...f, coverImage: url }))} onBusy={setUploading} />
              </Field>
            </div>


            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" className="btn-outline !bg-transparent !border-white/15 !text-neutral-300 hover:!border-gold hover:!text-gold" disabled={saving} onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-gold flex items-center gap-2" disabled={saving || uploading}>
                {saving && <Spinner />}{saving ? 'Saving…' : 'Save Development'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {notice && <CenterNotice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}
      {confirmDialog}
    </div>
  )
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
      { key: 'photo', label: 'Photo (uploaded from your device)', type: 'image' },
      { key: 'intro', label: 'Intro text', type: 'textarea' },
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
      { key: 'active', label: 'Active', render: r => <StatusBadge value={r.active ? 'active' : 'hidden'} map={{ active: 'bg-green-500/15 text-green-400', hidden: 'bg-white/10 text-neutral-400' }} /> },
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
      { key: 'active', label: 'Active', render: r => <StatusBadge value={r.active ? 'open' : 'closed'} map={{ open: 'bg-green-500/15 text-green-400', closed: 'bg-white/10 text-neutral-400' }} /> },
    ]}
    fields={[
      { key: 'title', label: 'Job title', required: true },
      { key: 'department', label: 'Department', type: 'select', options: ['Marketing', 'Operations', 'Sales', 'Technology'] },
      { key: 'type', label: 'Type', type: 'select', options: ['Full-time', 'Part-time'] },
      { key: 'location', label: 'Location' }, { key: 'active', label: 'Active', type: 'toggle' },
      { key: 'description', label: 'Description (2–3 lines)', type: 'textarea', required: true },
    ]} />
}

export function FeaturesAdmin() {
  // The feature (amenity) catalog offered on the property form. Backed by
  // /api/admin/features — create/edit/deactivate/delete flow through featureActions.
  // Deleting a feature that listings still use returns 409 Feature.InUse from the API;
  // deactivating is the safe everyday way to retire one.
  const { features, featureActions } = useData()
  return <CrudPage title="Property Features" rows={features} actions={featureActions}
    defaults={{ name: '', valueType: 'Boolean', icon: '', active: true }}
    columns={[
      { key: 'name', label: 'Feature' },
      { key: 'valueType', label: 'Value type' },
      { key: 'icon', label: 'Icon', render: r => {
        const resolved = resolveFeatureIcon(r.icon)
        return resolved
          ? <span className="inline-flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-gold/15 text-gold flex items-center justify-center"><resolved.Icon className="w-4 h-4" /></span><span className="text-xs text-neutral-400">{resolved.name}</span></span>
          : '—'
      } },
      { key: 'active', label: 'Active', render: r => <StatusBadge value={r.active ? 'offered' : 'retired'} map={{ offered: 'bg-green-500/15 text-green-400', retired: 'bg-white/10 text-neutral-400' }} /> },
    ]}
    fields={[
      { key: 'name', label: 'Feature name (e.g. Swimming Pool)', required: true },
      { key: 'valueType', label: 'Value type', type: 'select', options: [['Boolean', 'Yes / No (presence only)'], ['Text', 'Text value (e.g. floor type)'], ['Number', 'Numeric value (e.g. parking count)'] ] },
      { key: 'icon', label: 'Icon (pick from the real-estate icon set)', type: 'icon' },
      { key: 'active', label: 'Active (offered on new listings)', type: 'toggle' },
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
      <div className="overflow-x-auto panel-dark !rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-white/4 text-neutral-400 text-left text-xs uppercase tracking-wider">
            <tr>{['Date', 'Name', 'Contact', 'Source', 'Message', 'Status'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {inquiries.map(q => (
              <tr key={q.id} className="hover:bg-white/4 transition-colors cursor-pointer" onClick={() => setSelected(q)}>
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
            <div className="border border-white/8 bg-ink rounded-lg p-4 whitespace-pre-line">{selected.message}</div>
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
