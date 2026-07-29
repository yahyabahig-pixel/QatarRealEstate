import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import { IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconEye, IconPencil, IconTrash, IconX } from '../components/icons'
import { useToast } from '../components/Toast'
import { PageTitle, Modal, useConfirm, Field, Toggle, StatusBadge, CenterNotice, Spinner } from './adminUi'
import { MOCK_MODE } from '../api/client'
import { NAMED_FEATURES, imagesAdminApi, imageUrl, mapAdminPropertyRow, propertiesAdminApi } from '../api/realEstateApi'
import LocationPicker from '../components/LocationPicker'
import { resolveFeatureIcon } from '../lib/featureIcons'

// Two entries in the Features catalog get a dedicated control on this form rather than a
// chip, because the request asks for them by name: "Balcony" as a flag and "Furnishing" as
// a dropdown. They are filtered out of the chip grid so each value has exactly ONE control,
// but they are still stored as features — no parallel columns, no second catalog.
const { BALCONY: BALCONY_FEATURE, FURNISHING: FURNISHING_FEATURE } = NAMED_FEATURES

// Form state mirrors the UI dialect; DataContext + realEstateApi translate it into the
// backend's CreatePropertyCommand / UpdatePropertyRequest (see propertyCommand).
// "bedrooms" here IS the backend's Specs.NumberOfRooms — one field, one source of truth.
const EMPTY = {
  title: '', description: '', purpose: 'buy', type: '', city: 'Doha', area: '', district: '',
  bedrooms: 0, bathrooms: 0, sizeSqm: 0, price: 0, currency: 'QAR', priceOnRequest: false,
  exclusive: false, offPlan: false, status: 'available', furnishing: 'Unfurnished',
  balcony: false, amenities: [], images: [], agentId: '',
  // Location: x = LONGITUDE, y = LATITUDE (strings, matching the backend Location VO).
  // Set by the LocationPicker only -- there are no coordinate inputs in the form.
  x: '', y: '', lat: null, lng: null, locCountry: 'Qatar', locState: '', locDescription: '',
}

// Reverse geocoding hands back free text ("Porto Arabia, The Pearl, Doha, Qatar"), while
// Area is a catalog record. This looks for a catalog name inside that text so the dropdown
// can pre-select itself. Deliberately conservative:
//   * only names ALREADY in the Areas catalog can match — nothing is ever created;
//   * matching is on whole words, so "Al Waab" cannot match inside a longer word;
//   * the LONGEST match wins, so "Lusail Marina District" beats a bare "Lusail";
//   * no match returns null, and the caller then leaves the current choice untouched.
const normalizeText = (s) => ` ${String(s || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim()} `
const matchAreaName = (areas, patch) => {
  const haystack = normalizeText([patch.description, patch.street, patch.state, patch.city].filter(Boolean).join(' '))
  if (haystack.trim() === '') return null
  let best = null
  let bestLength = 0
  for (const a of areas) {
    const name = normalizeText(a.name)
    if (name.trim() === '') continue
    const withoutArticle = name.replace(/^ the /, ' ')
    if (haystack.includes(name) || haystack.includes(withoutArticle)) {
      if (name.length > bestLength) { best = a.name; bestLength = name.length }
    }
  }
  return best
}

export default function PropertiesAdmin() {
  const { properties, agents, areas, features, propertyTypes, propertyActions, apiError, clearApiError, reloadProperties } = useData()
  const { hasPermission } = useAuth()
  const toast = useToast()
  const [confirm, confirmDialog] = useConfirm()
  const [editing, setEditing] = useState(null)     // null | {} | { id, loading? }
  const [form, setForm] = useState(EMPTY)
  const [filters, setFilters] = useState({ q: '', purpose: '', type: '', status: '', agentId: '' })
  const [uploading, setUploading] = useState([])   // file names currently in flight
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)       // { kind: 'success'|'error', message }
  const fileInput = useRef(null)

  // LIVE rows come from the ADMIN endpoint: unlike the shared public slice (published
  // listings only), it includes drafts and archived properties — which is exactly what
  // status management needs to show — plus the real ViewsCount per row.
  // MOCK rows come from the seeds. `viewSort` cycles off → desc → asc.
  const [adminRows, setAdminRows] = useState(null)
  const [viewSort, setViewSort] = useState(null)
  const [statusMenuFor, setStatusMenuFor] = useState(null)
  useEffect(() => {
    if (MOCK_MODE) return
    let on = true
    propertiesAdminApi.list({ pageSize: 100 })
      .then(page => { if (on) setAdminRows((page?.items || []).map(mapAdminPropertyRow)) })
      .catch(() => {})
    return () => { on = false }
  }, [properties])   // eslint-disable-line react-hooks/exhaustive-deps
  const viewsOf = (p) => p.viewsCount ?? 0

  // Status changes ride the EXISTING publication/archive commands — the backend's domain
  // rules decide whether a transition is legal (e.g. only Published can become Sold) and
  // an illegal one surfaces as the real error, with nothing changed locally.
  const STATUS_OPTIONS = [['available', 'Published'], ['draft', 'Draft'], ['archived', 'Archived'], ['sold', 'Sold'], ['rented', 'Rented']]
  const applyStatus = async (p, status) => {
    setStatusMenuFor(null)
    if (MOCK_MODE) { propertyActions.update(p.id, { status }); toast('Status updated.'); return }
    try {
      if (status === 'archived') await propertiesAdminApi.archive(p.id)
      else await propertiesAdminApi.publication(p.id, { available: 'Publish', draft: 'Unpublish', sold: 'MarkSold', rented: 'MarkRented' }[status])
      toast('Status updated.')
      await reloadProperties()
    } catch (err) {
      setNotice({ kind: 'error', message: err?.problem?.title || err.message })
    }
  }

  // Amenity chips come from the backend feature catalog (Features admin section),
  // never a hardcoded list. Only active features are offered on the form.
  const featureOptions = useMemo(
    () => features.filter(f => f.active !== false && f.name !== BALCONY_FEATURE && f.name !== FURNISHING_FEATURE),
    [features])
  const typeNames = useMemo(() => propertyTypes.map(t => t.name), [propertyTypes])

  // Initial data-load failures (not save errors — those come back on the action result).
  useEffect(() => {
    if (apiError) { toast(apiError, 'error'); clearApiError() }
  }, [apiError])   // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    const source = MOCK_MODE ? properties : (adminRows ?? properties)
    const filtered = source.filter(p =>
      (!filters.q || p.title.toLowerCase().includes(filters.q.toLowerCase())) &&
      (!filters.purpose || p.purpose === filters.purpose) &&
      (!filters.type || p.type === filters.type) &&
      (!filters.status || p.status === filters.status) &&
      (!filters.agentId || p.agentId === filters.agentId))
    if (!viewSort) return filtered
    return [...filtered].sort((a, b) => viewSort === 'desc'
      ? viewsOf(b) - viewsOf(a)
      : viewsOf(a) - viewsOf(b))
  }, [properties, adminRows, filters, viewSort])   // eslint-disable-line react-hooks/exhaustive-deps

  // Number inputs keep their RAW string while the admin types. Coercing to a number on
  // every keystroke is what made decimals impossible to enter: "1500." collapses to 1500,
  // so the "." never survives long enough to type the digits after it. The payload
  // builders already do `Number(f.price) || 0`, so strings are safe all the way down and
  // an emptied field means 0 rather than a stuck "0" the admin has to delete around.
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Editing: the detail DTO exposes lat/lng; the form speaks x/y (x=lng, y=lat).
  const withCoords = (src) => ({
    x: src.lng != null ? String(src.lng) : '',
    y: src.lat != null ? String(src.lat) : '',
    locCountry: src.locCountry || 'Qatar',
    locState: src.locState || src.city || '',
    locDescription: src.locDescription || '',
  })

  // One adapter between the picker's generic keys and this form's field names.
  // The picker emits twice per pin: coordinates first, then the geocoded address — so the
  // Area lookup only runs on the second call, when there is actually an address to read.
  const applyLocation = (patch) => setForm(f => {
    const next = { ...f,
      ...(patch.x !== undefined ? { x: patch.x, y: patch.y, lat: patch.lat, lng: patch.lng } : {}),
      ...(patch.country !== undefined ? { locCountry: patch.country } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      ...(patch.street !== undefined ? { district: patch.street } : {}),
      ...(patch.state !== undefined ? { locState: patch.state } : {}),
      ...(patch.description !== undefined ? { locDescription: patch.description } : {}),
    }
    // A geocode that resolved nothing comes back with blank parts. Blanking City would
    // strand the admin: the field is filled by the map, so there would be nothing left to
    // fix it with. An empty answer therefore leaves the previous value standing.
    if (patch.city !== undefined && !String(patch.city).trim()) next.city = f.city
    if (patch.street !== undefined && !String(patch.street).trim()) next.district = f.district
    if (patch.description !== undefined || patch.street !== undefined) {
      // A hit updates the selection; a miss leaves whatever the admin already chose,
      // because "the geocoder didn't recognise it" is not the same as "no area".
      const matched = matchAreaName(areas, patch)
      if (matched) next.area = matched
    }
    return next
  })
  const setV = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // EDIT loads the FULL record from GET /api/properties/{id} — the table rows are thin
  // search cards without description/media/amenities, so populating the form from them
  // would silently show empty fields (that was the "description missing in edit" bug).
  const open = async (row) => {
    if (!row) {
      setEditing({})
      // Type starts EMPTY so the "Select a type…" placeholder is what the admin sees —
      // pre-picking the first type silently decides a required field on their behalf.
      setForm({ ...EMPTY, type: '', agentId: agents[0]?.id || '' })
      return
    }
    if (MOCK_MODE) { setEditing(row); setForm({ ...EMPTY, ...row, ...withCoords(row) }); return }
    setEditing({ id: row.id, loading: true })
    try {
      const full = await propertiesAdminApi.details(row.id)
      setEditing({ id: row.id, referenceNo: full.referenceNo })
      // An empty furnishing means the catalog feature simply isn't attached — show that
      // as "N/A" so the dropdown and the form state agree instead of the browser
      // rendering the first option while the value is still ''.
      setForm({ ...EMPTY, ...full, furnishing: full.furnishing || 'N/A', ...withCoords(full) })
    } catch (err) {
      setEditing(null)
      setNotice({ kind: 'error', message: `Could not load this listing for editing.\n${err?.problem?.title || err.message}` })
    }
  }

  const showSuccess = (message) => {
    setNotice({ kind: 'success', message })
    setTimeout(() => setNotice(n => (n?.kind === 'success' ? null : n)), 2200)
  }

  const save = async (e) => {
    e.preventDefault()
    if (saving) return                                     // no duplicate submissions
    if (form.images.length === 0) { setNotice({ kind: 'error', message: 'Add at least one photo before saving.' }); return }
    if (!form.x || !form.y) { setNotice({ kind: 'error', message: 'Select the property location on the map before saving.\nSearch for the area or click the map in the Location section.' }); return }
    if (!MOCK_MODE && !form.type) { setNotice({ kind: 'error', message: 'Pick a property type.' }); return }

    setSaving(true)
    const isEdit = !!editing?.id
    const res = await Promise.resolve(
      isEdit ? propertyActions.update(editing.id, form) : propertyActions.add(form))
    setSaving(false)

    if (res && res.ok === false) {
      // Backend said no: the form stays open, every field keeps its value, the real
      // error (ProblemDetails title + validation messages) shows centered on screen.
      setNotice({ kind: 'error', message: res.error })
      return
    }
    // Only after the backend confirmed:
    setEditing(null)
    showSuccess(isEdit ? 'Property updated successfully.' : 'Property created successfully.')
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
        setNotice({ kind: 'error', message: `Upload failed — ${file.name}\n${err?.problem?.title || err.message}` })
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

  // PERMANENT delete — always behind the confirmation dialog, never one click.
  // Archiving is not this: it lives in the status dropdown like any other status.
  const removeProperty = async (p) => {
    const res = await Promise.resolve(propertyActions.remove(p.id))
    if (res && res.ok === false) setNotice({ kind: 'error', message: res.error })
    else toast('Property deleted.', 'error')
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
          <option value="">Status (all)</option><option>available</option><option>draft</option><option>sold</option><option>rented</option><option>archived</option>
        </select>
        <select className="field-dark" value={filters.agentId} onChange={e => setFilters({ ...filters, agentId: e.target.value })}>
          <option value="">Agent (all)</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto panel-dark !rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-white/4 text-neutral-400 text-left text-xs uppercase tracking-wider">
            <tr>{['', 'Title', 'Type', 'Purpose', 'Location', 'Price', 'Status', 'Viewers', 'Agent', 'Actions'].map(h => h === 'Viewers' ? (
              <th key={h} className="px-3 py-3 whitespace-nowrap">
                <button type="button" className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gold transition-colors"
                  title="Sort by views"
                  onClick={() => setViewSort(s => s === null ? 'desc' : s === 'desc' ? 'asc' : null)}>
                  Viewers
                  {viewSort && <IconChevronDown className={`w-3 h-3 transition-transform ${viewSort === 'asc' ? 'rotate-180' : ''}`} />}
                </button>
              </th>
            ) : <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map(p => (
              <tr key={p.id} className="hover:bg-white/4 transition-colors">
                <td className="px-3 py-2"><img src={p.images[0]} alt="" className="w-16 h-11 object-cover" /></td>
                <td className="px-3 py-2 max-w-[220px]"><div className="truncate text-white">{p.title}</div><div className="text-[11px] text-neutral-500">{p.referenceNo}</div></td>
                <td className="px-3 py-2">{p.type}</td>
                <td className="px-3 py-2 capitalize">{p.purpose}</td>
                <td className="px-3 py-2 text-neutral-400">{p.area || p.city}</td>
                <td className="px-3 py-2 text-gold whitespace-nowrap">{p.priceOnRequest ? 'On request' : `${p.price.toLocaleString()} ${p.currency}`}</td>
                <td className="px-3 py-2"><StatusBadge value={p.status} /></td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 text-neutral-300">
                    <IconEye className="w-4 h-4 text-neutral-500" /> {viewsOf(p).toLocaleString()}
                  </span>
                </td>
                <td className="px-3 py-2 text-neutral-400 whitespace-nowrap">{p.agentName || agents.find(a => a.id === p.agentId)?.name || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex flex-col gap-1.5 w-36">
                    {/* Row 1 — current status, changeable in place */}
                    {hasPermission('Property.Publish') && (
                      <span className="relative block">
                        <button type="button" title="Change status"
                          className="w-full flex items-center justify-between gap-2 border border-white/12 rounded-lg px-2.5 py-1.5 hover:border-gold transition-colors"
                          aria-haspopup="menu" aria-expanded={statusMenuFor === p.id}
                          onClick={() => setStatusMenuFor(id => id === p.id ? null : p.id)}>
                          <StatusBadge value={p.status} />
                          <IconChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${statusMenuFor === p.id ? 'rotate-180' : ''}`} />
                        </button>
                        {statusMenuFor === p.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setStatusMenuFor(null)} />
                            <div className="absolute right-0 top-9 z-30 panel-dark !rounded-lg shadow-2xl shadow-black/50 py-1 w-44" role="menu">
                              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-neutral-500">Change status</div>
                              {STATUS_OPTIONS.map(([v, label]) => (
                                <button key={v} role="menuitem" disabled={v === p.status}
                                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-2 transition-colors ${v === p.status ? 'text-neutral-500 cursor-default' : 'text-neutral-200 hover:bg-white/8 hover:text-gold'}`}
                                  onClick={() => applyStatus(p, v)}>
                                  {p.status === 'archived' && v === 'available' ? 'Restore (Publish)' : label}
                                  {v === p.status && <IconCheck className="w-3.5 h-3.5 text-gold" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </span>
                    )}
                    {/* Row 2 — edit / delete */}
                    <div className="flex gap-1.5">
                      {hasPermission('Property.Update') && (
                        <button type="button" title="Edit property"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 border border-white/12 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-200 hover:border-gold hover:text-gold transition-colors"
                          onClick={() => open(p)}>
                          <IconPencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      {hasPermission('Property.Delete') && (
                        <button type="button" title="Delete property permanently"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 border border-white/12 rounded-lg px-2 py-1.5 text-xs font-medium text-red-400 hover:border-red-400/60 hover:bg-red-400/10 transition-colors"
                          onClick={() => confirm(`Delete "${p.title}"? This action cannot be undone.`, () => removeProperty(p))}>
                          <IconTrash className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <Modal title={editing.loading ? 'Loading…' : (editing.id ? `Edit — ${editing.referenceNo || form.title}` : 'Add Property')}
          onClose={() => !saving && setEditing(null)} wide>
          {editing.loading ? (
            <div className="py-16 text-center text-neutral-400"><Spinner /> <span className="ml-2">Loading the full listing…</span></div>
          ) : (
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
            {/* LOCATION — the map comes first and everything below it is what the map just
                said. Pin the property, then read (and correct) the address underneath:
                1. City   2. Area   3. Street. */}
            <div className="md:col-span-2">
              <Field label="Location (search or click the map — the address below fills in automatically)">
                <LocationPicker
                  value={{ x: form.x, y: form.y, country: form.locCountry, city: form.city, street: form.district, state: form.locState, description: form.locDescription }}
                  onChange={applyLocation}
                />
              </Field>
            </div>
            <div className="md:col-span-2 grid md:grid-cols-3 gap-4">
              <Field label="City (auto-filled from the map)"><input required readOnly title="Set by the Location picker above" className="field-dark opacity-70 cursor-default" value={form.city} /></Field>
              <Field label="Area (from the Areas catalog)">
                {/* Only defined Areas are selectable — the value submitted is the Area's id,
                    resolved in DataContext. Free-typed area names are gone on purpose.
                    The map pre-selects this when the geocoded address names a known Area. */}
                <select className="field-dark" value={form.area} onChange={set('area')}>
                  <option value="">No area</option>
                  {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
                {areas.length === 0 && <p className="text-[11px] text-neutral-500 mt-1">No areas defined yet — add them under Areas first.</p>}
              </Field>
              <Field label="Street (auto-filled from the map)"><input readOnly title="Set by the Location picker above" className="field-dark opacity-70 cursor-default" value={form.district} /></Field>
            </div>
            {/* Agents come from the Agents catalog, never a hardcoded list. The blank option
                mirrors "No area": the backend accepts a null AgentId, and without an option
                for it an unassigned listing would display someone else's name. */}
            <Field label="Assigned agent"><select className="field-dark" value={form.agentId} onChange={set('agentId')}><option value="">No agent assigned</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="Bedrooms (number of beds)"><input type="number" min="0" className="field-dark" value={form.bedrooms} onChange={set('bedrooms')} /></Field>
            <Field label="Bathrooms"><input type="number" min="0" className="field-dark" value={form.bathrooms} onChange={set('bathrooms')} /></Field>
            <Field label="Size (m²)"><input type="number" min="0" step="0.01" className="field-dark" value={form.sizeSqm} onChange={set('sizeSqm')} /></Field>
            {/* Editable even when "Price on request" is on: the listing still records a real
                figure internally, the flag only decides whether the site shows it. */}
            <Field label="Price"><input type="number" min="0" step="0.01" className="field-dark" value={form.price} onChange={set('price')} /></Field>
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
              {/* Stored as the catalog's "Balconies" feature. `balcony` is kept in step so
                  anything already reading it (the details page, mock mode) still works. */}
              <Toggle checked={form.amenities.includes(BALCONY_FEATURE)}
                onChange={v => setForm(f => ({ ...f,
                  balcony: v,
                  amenities: v
                    ? [...new Set([...f.amenities, BALCONY_FEATURE])]
                    : f.amenities.filter(x => x !== BALCONY_FEATURE),
                }))}
                label="Balcony" />
            </div>
            <div className="md:col-span-2">
              <Field label="Property features (managed under Features)">
                {featureOptions.length === 0
                  ? <p className="text-xs text-neutral-500">No features defined yet — create them in the Features section first.</p>
                  : (
                    <div className="flex flex-wrap gap-2">
                      {featureOptions.map(f => (
                        <label key={f.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs inline-flex items-center gap-1.5 ${form.amenities.includes(f.name) ? 'bg-gold text-white border-gold' : 'border-neutral-600 text-neutral-300'}`}>
                          <input type="checkbox" className="hidden" checked={form.amenities.includes(f.name)}
                            onChange={() => setV('amenities', form.amenities.includes(f.name) ? form.amenities.filter(x => x !== f.name) : [...form.amenities, f.name])} />
                          {(() => { const r = resolveFeatureIcon(f.icon); return r ? <r.Icon className="w-3.5 h-3.5" /> : null })()}
                          {f.name}
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
                  <button type="button" className="btn-outline !bg-transparent !border-white/15 !text-neutral-300 hover:!border-gold hover:!text-gold"
                    onClick={() => fileInput.current?.click()}>Choose photos…</button>
                  {uploading.length > 0 && (
                    <span className="text-xs text-gold flex items-center gap-2"><Spinner /> Uploading {uploading.join(', ')}…</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {form.images.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} alt="" className="w-24 h-16 object-cover rounded-lg border border-white/10" />
                      {i === 0 && <span className="absolute top-1 left-1 bg-gold text-white font-bold text-[9px] px-1.5 py-0.5 rounded">COVER</span>}
                      <div className="absolute inset-0 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs transition-opacity">
                        <button type="button" aria-label="Move left" className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20" onClick={() => moveImg(i, -1)}><IconChevronLeft className="w-3.5 h-3.5" /></button>
                        <button type="button" aria-label="Remove photo" className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:bg-white/20" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}><IconX className="w-3.5 h-3.5" /></button>
                        <button type="button" aria-label="Move right" className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20" onClick={() => moveImg(i, 1)}><IconChevronRight className="w-3.5 h-3.5" /></button>
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
              <button type="button" className="btn-outline !bg-transparent !border-white/15 !text-neutral-300 hover:!border-gold hover:!text-gold" disabled={saving} onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-gold flex items-center gap-2" disabled={saving || uploading.length > 0}>
                {saving && <Spinner />}
                {saving ? 'Saving property…' : uploading.length > 0 ? 'Waiting for uploads…' : 'Save Property'}
              </button>
            </div>
          </form>
          )}
        </Modal>
      )}
      {notice && <CenterNotice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}
      {confirmDialog}
    </div>
  )
}
