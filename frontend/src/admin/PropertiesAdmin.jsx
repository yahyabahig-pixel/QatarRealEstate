import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import { useToast } from '../components/Toast'
import { PageTitle, Modal, useConfirm, Field, Toggle, StatusBadge } from './adminUi'
import { MOCK_MODE } from '../api/client'
import { imagesAdminApi, imageUrl } from '../api/realEstateApi'

// Form state mirrors the UI dialect; DataContext + realEstateApi translate it into the
// backend's CreatePropertyCommand / UpdatePropertyRequest (see propertyCommand).
// "bedrooms" here IS the backend's Specs.NumberOfRooms — one field, one source of truth.
const EMPTY = {
  title: '', description: '', purpose: 'buy', type: '', city: 'Doha', area: '', district: '',
  bedrooms: 0, bathrooms: 0, sizeSqm: 0, price: 0, currency: 'QAR', priceOnRequest: false,
  exclusive: false, offPlan: false, status: 'available', furnishing: 'Unfurnished', parking: 0,
  balcony: false, amenities: [], images: [], agentId: '',
}

export default function PropertiesAdmin() {
  const { properties, agents, areas, features, propertyTypes, propertyActions, apiError, clearApiError } = useData()
  const { hasPermission } = useAuth()
  const toast = useToast()
  const [confirm, confirmDialog] = useConfirm()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [filters, setFilters] = useState({ q: '', purpose: '', type: '', status: '', agentId: '' })
  const [uploading, setUploading] = useState([])   // file names currently in flight
  const fileInput = useRef(null)

  // Amenity chips come from the backend feature catalog (Features admin section),
  // never a hardcoded list. Only active features are offered on the form.
  const featureOptions = useMemo(() => features.filter(f => f.active !== false), [features])
  const typeNames = useMemo(() => propertyTypes.map(t => t.name), [propertyTypes])

  // API failures from the guarded store actions surface here as toasts.
  useEffect(() => {
    if (apiError) { toast(apiError, 'error'); clearApiError() }
  }, [apiError])   // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => properties.filter(p =>
    (!filters.q || p.title.toLowerCase().includes(filters.q.toLowerCase())) &&
    (!filters.purpose || p.purpose === filters.purpose) &&
    (!filters.type || p.type === filters.type) &&
    (!filters.status || p.status === filters.status) &&
    (!filters.agentId || p.agentId === filters.agentId)
  ), [properties, filters])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.type === 'number' ? +e.target.value : e.target.value }))
  const setV = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const open = (row) => {
    setEditing(row ?? {})
    setForm(row
      ? { ...EMPTY, ...row }
      : { ...EMPTY, type: typeNames[0] || '', area: '', agentId: agents[0]?.id || '' })
  }

  const save = (e) => {
    e.preventDefault()
    if (form.images.length === 0) { toast('Add at least one photo.', 'error'); return }
    if (!MOCK_MODE && !form.type) { toast('Pick a property type.', 'error'); return }
    if (editing?.id) { propertyActions.update(editing.id, form); toast('Property saved.') }
    else { propertyActions.add(form); toast('Property created.') }
    setEditing(null)
  }

  // ---- device photo upload ------------------------------------------------------------
  // Live mode: each selected file goes straight to POST /api/admin/media/images
  // (multipart, field "file") and the returned /api/media/images/{id} URL joins the form.
  // Mock mode: an inline data-URL preview stands in, since there is no backend to hold it.
  const onFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''                       // same file can be picked again later
    for (const file of files) {
      setUploading(u => [...u, file.name])
      try {
        if (MOCK_MODE) {
          const dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader()
            r.onload = () => resolve(r.result); r.onerror = reject
            r.readAsDataURL(file)
          })
          setForm(f => ({ ...f, images: [...f.images, dataUrl] }))
        } else {
          const id = await imagesAdminApi.upload(file)   // throws with ProblemDetails on 4xx
          setForm(f => ({ ...f, images: [...f.images, imageUrl(id)] }))
        }
      } catch (err) {
        toast(`Upload failed — ${file.name}: ${err?.problem?.title || err.message}`, 'error')
      } finally {
        setUploading(u => { const i = u.indexOf(file.name); return u.filter((_, j) => j !== i) })
      }
    }
  }

  const moveImg = (i, dir) => {
    setForm(f => {
      const imgs = [...f.images]
      const j = i + dir
      if (j < 0 || j >= imgs.length) return f
      ;[imgs[i], imgs[j]] = [imgs[j], imgs[i]]
      return { ...f, images: imgs }
    })
  }

  return (
    <div>
      <PageTitle title="Properties"
        action={hasPermission('Property.Create') && <button className="btn-gold !py-2" onClick={() => open(null)}>+ Add Property</button>} />

      {/* filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <input placeholder="Search title…" className="field-dark" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
        <select className="field-dark" value={filters.purpose} onChange={e => setFilters({ ...filters, purpose: e.target.value })}>
          <option value="">Purpose (all)</option><option value="rent">Rent</option><option value="buy">Buy</option>
        </select>
        <select className="field-dark" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
          <option value="">Type (all)</option>{typeNames.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="field-dark" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Status (all)</option><option>available</option><option>draft</option><option>sold</option><option>rented</option>
        </select>
        <select className="field-dark" value={filters.agentId} onChange={e => setFilters({ ...filters, agentId: e.target.value })}>
          <option value="">Agent (all)</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-ink text-neutral-400 text-left text-xs uppercase tracking-wider">
            <tr>{['', 'Title', 'Type', 'Purpose', 'Location', 'Price', 'Status', 'Agent', 'Actions'].map(h => <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {rows.map(p => (
              <tr key={p.id} className="hover:bg-neutral-900/60">
                <td className="px-3 py-2"><img src={p.images[0]} alt="" className="w-16 h-11 object-cover" /></td>
                <td className="px-3 py-2 max-w-[220px]"><div className="truncate text-white">{p.title}</div><div className="text-[11px] text-neutral-500">{p.referenceNo}</div></td>
                <td className="px-3 py-2">{p.type}</td>
                <td className="px-3 py-2 capitalize">{p.purpose}</td>
                <td className="px-3 py-2 text-neutral-400">{p.area || p.city}</td>
                <td className="px-3 py-2 text-gold whitespace-nowrap">{p.priceOnRequest ? 'On request' : `${p.price.toLocaleString()} ${p.currency}`}</td>
                <td className="px-3 py-2"><StatusBadge value={p.status} /></td>
                <td className="px-3 py-2 text-neutral-400 whitespace-nowrap">{agents.find(a => a.id === p.agentId)?.name || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {hasPermission('Property.Update') && <button className="text-gold hover:underline mr-3" onClick={() => open(p)}>Edit</button>}
                  {hasPermission('Property.Publish') && <button className="text-red-400 hover:underline"
                    onClick={() => confirm(`Archive "${p.title}"? It disappears from the site but stays in the database.`, () => { propertyActions.remove(p.id); toast('Property archived.', 'error') })}>Archive</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <Modal title={editing.id ? `Edit — ${editing.referenceNo || form.title}` : 'Add Property'} onClose={() => setEditing(null)} wide>
          <form onSubmit={save} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Field label="Title"><input required className="field-dark" value={form.title} onChange={set('title')} /></Field></div>
            <div className="md:col-span-2"><Field label="Description"><textarea rows="4" required className="field-dark" value={form.description} onChange={set('description')} /></Field></div>
            <Field label="Purpose"><select className="field-dark" value={form.purpose} onChange={set('purpose')}><option value="buy">Buy</option><option value="rent">Rent</option></select></Field>
            <Field label="Property type">
              <select required className="field-dark" value={form.type} onChange={set('type')}>
                <option value="" disabled>Select a type…</option>
                {typeNames.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="City"><input required className="field-dark" value={form.city} onChange={set('city')} /></Field>
            <Field label="Area (from the Areas catalog)">
              {/* Only defined Areas are selectable — the value submitted is the Area's id,
                  resolved in DataContext. Free-typed area names are gone on purpose. */}
              <select className="field-dark" value={form.area} onChange={set('area')}>
                <option value="">— No area —</option>
                {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
              {areas.length === 0 && <p className="text-[11px] text-neutral-500 mt-1">No areas defined yet — add them under Areas first.</p>}
            </Field>
            <Field label="District / street"><input className="field-dark" value={form.district} onChange={set('district')} /></Field>
            <Field label="Assigned agent"><select className="field-dark" value={form.agentId} onChange={set('agentId')}>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="Bedrooms (number of beds)"><input type="number" min="0" className="field-dark" value={form.bedrooms} onChange={set('bedrooms')} /></Field>
            <Field label="Bathrooms"><input type="number" min="0" className="field-dark" value={form.bathrooms} onChange={set('bathrooms')} /></Field>
            <Field label="Size (m²)"><input type="number" min="0" step="0.01" className="field-dark" value={form.sizeSqm} onChange={set('sizeSqm')} /></Field>
            <Field label="Parking spots"><input type="number" min="0" className="field-dark" value={form.parking} onChange={set('parking')} /></Field>
            <Field label="Price"><input type="number" min="0" className="field-dark" value={form.price} onChange={set('price')} disabled={form.priceOnRequest} /></Field>
            <Field label="Currency"><select className="field-dark" value={form.currency} onChange={set('currency')}><option>QAR</option><option>USD</option></select></Field>
            <Field label="Status">
              <select className="field-dark" value={form.status} onChange={set('status')}>
                <option value="draft">Draft (hidden)</option>
                <option value="available">Available (published)</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
              </select>
            </Field>
            <Field label="Furnishing"><select className="field-dark" value={form.furnishing} onChange={set('furnishing')}>{['Unfurnished', 'Semi-furnished', 'Furnished', 'Fitted', 'N/A'].map(x => <option key={x}>{x}</option>)}</select></Field>
            <div className="flex flex-wrap gap-5 md:col-span-2 py-1">
              <Toggle checked={form.priceOnRequest} onChange={v => setV('priceOnRequest', v)} label="Price on request" />
              <Toggle checked={form.exclusive} onChange={v => setV('exclusive', v)} label="Exclusive" />
              <Toggle checked={form.offPlan} onChange={v => setV('offPlan', v)} label="Off-Plan" />
              <Toggle checked={form.balcony} onChange={v => setV('balcony', v)} label="Balcony" />
            </div>
            <div className="md:col-span-2">
              <Field label="Property features (managed under Features)">
                {featureOptions.length === 0
                  ? <p className="text-xs text-neutral-500">No features defined yet — create them in the Features section first.</p>
                  : (
                    <div className="flex flex-wrap gap-2">
                      {featureOptions.map(f => (
                        <label key={f.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${form.amenities.includes(f.name) ? 'bg-gold text-black border-gold' : 'border-neutral-600 text-neutral-300'}`}>
                          <input type="checkbox" className="hidden" checked={form.amenities.includes(f.name)}
                            onChange={() => setV('amenities', form.amenities.includes(f.name) ? form.amenities.filter(x => x !== f.name) : [...form.amenities, f.name])} />{f.name}
                        </label>
                      ))}
                    </div>
                  )}
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Photos (uploaded from your device — first one is the cover)">
                <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
                <div className="flex items-center gap-3 mb-2">
                  <button type="button" className="btn-outline !border-neutral-600 !text-neutral-300"
                    onClick={() => fileInput.current?.click()}>⬆ Choose photos…</button>
                  {uploading.length > 0 && (
                    <span className="text-xs text-gold animate-pulse">Uploading {uploading.join(', ')}…</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {form.images.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} alt="" className="w-24 h-16 object-cover border border-neutral-700" />
                      {i === 0 && <span className="absolute top-0 left-0 bg-gold text-black text-[9px] px-1">COVER</span>}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs transition-opacity">
                        <button type="button" onClick={() => moveImg(i, -1)}>◀</button>
                        <button type="button" className="text-red-400" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}>✕</button>
                        <button type="button" onClick={() => moveImg(i, 1)}>▶</button>
                      </div>
                    </div>
                  ))}
                  {form.images.length === 0 && uploading.length === 0 && (
                    <p className="text-xs text-neutral-500">No photos yet.</p>
                  )}
                </div>
              </Field>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" className="btn-outline !border-neutral-600 !text-neutral-300" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-gold" disabled={uploading.length > 0}>{uploading.length > 0 ? 'Waiting for uploads…' : 'Save Property'}</button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDialog}
    </div>
  )
}
