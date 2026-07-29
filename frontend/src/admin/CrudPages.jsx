import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useToast } from '../components/Toast'
import { CenterNotice, CrudPage, Field, ImageUpload, Modal, PageTitle, Spinner, StatusBadge, useConfirm } from './adminUi'
import { resolveFeatureIcon } from '../lib/featureIcons'
import LocationPicker from '../components/LocationPicker'
import PropertyLocation from '../components/PropertyLocation'
import { MOCK_MODE } from '../api/client'
import { imagesAdminApi, imageUrl, leadsAdminApi } from '../api/realEstateApi'

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
      { key: 'photo', label: 'Portrait photo (uploaded from your device)', type: 'image', required: true },
      { key: 'phone', label: 'Phone' },
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

// ---------------------------------------------------------------------------------------
// Lead management. LIVE: rows come from GET /api/admin/leads (real Leads module —
// status changes and deletes persist). MOCK: in-memory inquiries, as before.
// Three lead types, type-safe from the backend enum: PropertyInquiry (linked to a
// listing), ListingRequest ("list your property with us", carries a Location picked on
// Mapbox), GeneralInquiry (contact page / agent contact).
// ---------------------------------------------------------------------------------------
const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost', 'Archived']
const LEAD_TYPE_LABELS = { PropertyInquiry: 'Property Inquiry', ListingRequest: 'Listing Request', GeneralInquiry: 'General Inquiry' }

export function LeadsAdmin() {
  const { inquiries, inquiryActions, properties, agents } = useData()
  const toast = useToast()
  const [confirm, confirmDialog] = useConfirm()
  const [selected, setSelected] = useState(null)     // detail (mapped lead or {loading})
  const [notice, setNotice] = useState(null)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Mock rows predate the backend type — derive it so both modes filter identically.
  const typeOf = (l) => l.type || (l.listingRequest || l.source === 'List your property' ? 'ListingRequest' : l.propertyId ? 'PropertyInquiry' : 'GeneralInquiry')

  const rows = inquiries.filter(l =>
    (!q || `${l.name} ${l.email} ${l.phone}`.toLowerCase().includes(q.toLowerCase())) &&
    (!typeFilter || typeOf(l) === typeFilter) &&
    (!statusFilter || l.status === statusFilter))

  const linked = (l) => {
    if (typeOf(l) === 'ListingRequest')
      return [l.propertyTypeName || l.type, l.purpose === 'rent' ? 'For Rent' : l.purpose ? 'For Sale' : null, l.locationLabel]
        .filter(Boolean).join(' · ') || 'Listing request'
    if (l.propertyTitle) return l.propertyTitle
    if (l.propertyId) return properties.find(p => p.id === l.propertyId)?.title || null
    if (l.agentId) return agents.find(a => a.id === l.agentId)?.name || null
    return null
  }

  const view = async (l) => {
    if (MOCK_MODE) {
      const prop = l.propertyId ? properties.find(p => p.id === l.propertyId) : null
      setSelected({ ...l, typeLabel: LEAD_TYPE_LABELS[typeOf(l)],
        property: prop ? { id: prop.id, title: prop.title, city: prop.area || prop.city, purpose: prop.purpose, price: prop.price, currency: prop.currency, coverImage: prop.images?.[0] || '', type: prop.type } : null,
        location: (l.x && l.y) ? { lat: Number(l.y), lng: Number(l.x), city: l.city, street: l.street, state: l.locState, country: l.locCountry || 'Qatar', description: l.locDescription } : null,
        propertyTypeName: l.propertyTypeName || (typeOf(l) === 'ListingRequest' ? l.type : null),
      })
      return
    }
    setSelected({ loading: true })
    try { setSelected(await leadsAdminApi.byId(l.id)) }
    catch (err) { setSelected(null); setNotice({ kind: 'error', message: err?.problem?.title || err.message }) }
  }

  const setStatus = async (l, status) => {
    const res = await Promise.resolve(inquiryActions.update(l.id, { status }))
    if (res && res.ok === false) setNotice({ kind: 'error', message: res.error })
    else toast('Lead status updated.')
  }

  const remove = async (id) => {
    const res = await Promise.resolve(inquiryActions.remove(id))
    if (res && res.ok === false) setNotice({ kind: 'error', message: res.error })
    else { toast('Lead deleted.', 'error'); setSelected(null) }
  }

  return (
    <div>
      <PageTitle title="Leads" />
      <div className="flex gap-3 flex-wrap mb-4">
        <input placeholder="Search name, email or phone…" className="field-dark max-w-xs" value={q} onChange={e => setQ(e.target.value)} />
        <select className="field-dark !w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">Type (all)</option>
          <option value="PropertyInquiry">Property Inquiry</option>
          <option value="ListingRequest">Listing Request</option>
          <option value="GeneralInquiry">General Inquiry</option>
        </select>
        <select className="field-dark !w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Status (all)</option>
          {LEAD_STATUSES.map(st => <option key={st}>{st}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-white/15 rounded-xl p-14 text-center text-neutral-500">
          No leads match. New inquiries from the website land here automatically.
        </div>
      ) : (
        <div className="overflow-x-auto panel-dark !rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-white/4 text-neutral-400 text-left text-xs uppercase tracking-wider">
              <tr>{['Date', 'Name', 'Contact', 'Type', 'Regarding', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {rows.map(l => (
                <tr key={l.id} className="hover:bg-white/4 transition-colors cursor-pointer" onClick={() => view(l)}>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-400">{l.date}</td>
                  <td className="px-4 py-3 text-white">{l.name}</td>
                  <td className="px-4 py-3 text-neutral-400"><div>{l.phone}</div><div className="text-[11px]">{l.email}</div></td>
                  <td className="px-4 py-3"><StatusBadge value={LEAD_TYPE_LABELS[typeOf(l)] || typeOf(l)}
                    map={{ 'Property Inquiry': 'bg-blue-500/15 text-blue-400', 'Listing Request': 'bg-gold/15 text-gold', 'General Inquiry': 'bg-white/10 text-neutral-300' }} /></td>
                  <td className="px-4 py-3 max-w-[220px]"><div className="truncate text-neutral-300">{linked(l) || '—'}</div><div className="text-[11px] text-neutral-500">{l.source}</div></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select value={l.status} className="field-dark !py-1 !w-auto" onChange={e => setStatus(l, e.target.value)}>
                      {LEAD_STATUSES.map(st => <option key={st}>{st}</option>)}
                      {!LEAD_STATUSES.includes(l.status) && <option>{l.status}</option>}
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <button className="text-gold hover:underline mr-3" onClick={() => view(l)}>View</button>
                    <button className="text-red-400 hover:underline"
                      onClick={() => confirm(`Delete the lead from "${l.name}"? This cannot be undone.`, () => remove(l.id))}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={selected.loading ? 'Loading…' : `Lead — ${selected.name}`} onClose={() => setSelected(null)} wide>
          {selected.loading ? (
            <div className="py-14 text-center text-neutral-400"><Spinner /> <span className="ml-2">Loading lead…</span></div>
          ) : (
            <div className="space-y-4 text-sm text-neutral-300">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={selected.typeLabel || LEAD_TYPE_LABELS[typeOf(selected)]}
                  map={{ 'Property Inquiry': 'bg-blue-500/15 text-blue-400', 'Listing Request': 'bg-gold/15 text-gold', 'General Inquiry': 'bg-white/10 text-neutral-300' }} />
                <StatusBadge value={selected.status} />
                <span className="text-neutral-500 text-xs ml-auto">{selected.date} · {selected.source}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                <p><span className="text-neutral-500">Phone:</span> {selected.phone}</p>
                <p><span className="text-neutral-500">Email:</span> {selected.email}</p>
                {selected.agentName && <p><span className="text-neutral-500">Agent:</span> {selected.agentName}</p>}
              </div>
              {selected.message && <div className="border border-white/8 bg-ink rounded-lg p-4 whitespace-pre-line">{selected.message}</div>}

              {selected.property && (
                <Link to={`/property/${selected.property.purpose || 'buy'}/${selected.property.id}`}
                  className="flex items-center gap-4 panel-dark p-3 hover:border-gold transition-colors group">
                  {selected.property.coverImage && <img src={selected.property.coverImage} alt="" className="w-24 h-16 object-cover rounded-lg shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-white truncate group-hover:text-gold transition-colors">{selected.property.title}</div>
                    <div className="text-xs text-neutral-500">{[selected.property.type, selected.property.city].filter(Boolean).join(' · ')}</div>
                    {selected.property.price != null && <div className="text-gold text-xs font-semibold mt-0.5">{Number(selected.property.price).toLocaleString()} {selected.property.currency || 'QAR'}</div>}
                  </div>
                  <span className="ml-auto text-gold text-xs whitespace-nowrap">View property →</span>
                </Link>
              )}

              {(selected.propertyTypeName || selected.location) && (
                <div className="panel-dark p-4 space-y-1.5">
                  <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Owner's property</div>
                  {selected.propertyTypeName && <p><span className="text-neutral-500">Type:</span> {selected.propertyTypeName}</p>}
                  {selected.purpose && <p><span className="text-neutral-500">Transaction:</span> {selected.purpose === 'rent' ? 'For Rent' : 'For Sale'}</p>}
                  {selected.location && (
                    <p><span className="text-neutral-500">Location:</span> {[selected.location.street, selected.location.state, selected.location.city, selected.location.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</p>
                  )}
                  {selected.location && Number.isFinite(selected.location.lat) && Number.isFinite(selected.location.lng) && (
                    <div className="pt-2">
                      <PropertyLocation lat={selected.location.lat} lng={selected.location.lng}
                        title={selected.name} areaLabel={[selected.location.street, selected.location.city].filter(Boolean).join(', ')} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
      {notice && <CenterNotice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}
      {confirmDialog}
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
        <Field label="Tax number (placeholder — replace with the issued number)">
          <input className="field-dark" value={f.taxNumber ?? ''} onChange={set('taxNumber')} />
        </Field>
        <div className="md:col-span-2"><Field label="Footer about text"><textarea rows="3" className="field-dark" value={f.footerAbout} onChange={set('footerAbout')} /></Field></div>
        <div className="md:col-span-2">
          <Field label="Footer about text (Arabic)">
            <textarea rows="2" dir="rtl" lang="ar" className="field-dark text-right" value={f.footerAboutAr ?? ''} onChange={set('footerAboutAr')} />
          </Field>
        </div>
        <div className="md:col-span-2"><button className="btn-gold">Save Settings</button></div>
      </form>
    </div>
  )
}
