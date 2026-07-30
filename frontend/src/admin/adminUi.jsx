import { useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { useAuth } from '../store/AuthContext'
import { IconCheck, IconPlus, IconX } from '../components/icons'
import IconPicker from '../components/IconPicker'
import { MOCK_MODE } from '../api/client'
import { imagesAdminApi, imageUrl } from '../api/realEstateApi'

// ---------------------------------------------------------------------------------------
// Shared admin UI: table, modal, confirm, generic CRUD page factory. Permission props
// hide/disable actions the caller can't use — the backend re-checks everything anyway.
//
// SAVE CONTRACT (live mode): store actions return { ok: true, value } on backend success
// and { ok: false, error } on failure. CrudPage awaits that result — success is only
// announced after the backend confirms it, and a failure keeps the form OPEN with every
// entered value intact so the user can fix and retry. Mock-mode actions return plain
// values; anything without ok === false counts as success.
// ---------------------------------------------------------------------------------------

export function PageTitle({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <h1 className="h-serif text-2xl text-white tracking-tight">{title}</h1>
      {action}
    </div>
  )
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-start justify-center overflow-y-auto py-10 px-4" onClick={onClose}>
      <div className={`panel-dark !rounded-2xl shadow-2xl shadow-black/40 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-6`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="h-serif text-xl text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/8 transition-colors"><IconX className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Centered notice: success (auto-dismissed by the caller) or error (user dismisses).
// Rendered above everything, including an open modal — the modal and its data survive.
export function CenterNotice({ kind = 'success', message, onClose }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className={`max-w-md w-full rounded-2xl border p-7 text-center bg-coal shadow-2xl shadow-black/50 ${kind === 'success' ? 'border-green-600/60' : 'border-red-600/60'}`}
        onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${kind === 'success' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>{kind === 'success' ? <IconCheck className="w-6 h-6" /> : <IconX className="w-6 h-6" />}</div>
        <p className="text-white text-sm leading-relaxed whitespace-pre-line">{message}</p>
        {kind === 'error' && (
          <button className="btn-primary mt-5 !py-2" onClick={onClose}>OK — let me fix it</button>
        )}
      </div>
    </div>
  )
}

export const Spinner = () => (
  <span className="inline-block w-4 h-4 border-2 border-neutral-500 border-t-primary rounded-full animate-spin align-middle" />
)

export function useConfirm() {
  const [state, setState] = useState(null)
  const confirm = (message, onYes) => setState({ message, onYes })
  const dialog = state && (
    <Modal title="Are you sure?" onClose={() => setState(null)}>
      <p className="text-neutral-300 text-sm mb-6">{state.message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-outline !bg-transparent !border-white/15 !text-neutral-300 hover:!border-primary hover:!text-primary" onClick={() => setState(null)}>Cancel</button>
        <button className="btn-danger !py-2" onClick={() => { state.onYes(); setState(null) }}>Delete</button>
      </div>
    </Modal>
  )
  return [confirm, dialog]
}

// ---------------------------------------------------------------------------------------
// Reusable admin image upload: choose from the PC, preview, replace, remove. Uses the
// EXISTING media system (imagesAdminApi → /api/admin/media/images) in live mode and an
// inline data-URL in mock mode — never a second storage mechanism, never a pasted URL.
// ---------------------------------------------------------------------------------------
export function ImageUpload({ value = '', onChange, onBusy, maxMb = 8 }) {
  const fileInput = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const busy = (b) => { setUploading(b); onBusy?.(b) }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) { setError('Please choose an image file (JPG, PNG, WebP…).'); return }
    if (file.size > maxMb * 1024 * 1024) { setError(`Image is too large — maximum size is ${maxMb} MB.`); return }
    busy(true)
    try {
      if (MOCK_MODE) {
        const dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(r.result); r.onerror = reject
          r.readAsDataURL(file)
        })
        onChange?.(dataUrl)
      } else {
        const id = await imagesAdminApi.upload(file)   // throws with ProblemDetails on 4xx
        onChange?.(imageUrl(id))
      }
    } catch (err) {
      setError('Upload failed — ' + (err?.problem?.title || err.message))
    } finally { busy(false) }
  }

  return (
    <div>
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {value ? (
        <div className="relative inline-block group">
          <img src={value} alt="Preview" className="w-64 h-40 object-cover rounded-lg border border-white/10" />
          <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
            <button type="button" className="btn-outline !bg-transparent !border-white/40 !text-white !py-1.5 !px-3 text-xs" onClick={() => fileInput.current?.click()}>Replace</button>
            <button type="button" className="btn-danger !py-1.5 !px-3 text-xs" onClick={() => { setError(''); onChange?.('') }}>Remove</button>
          </div>
          {uploading && <p className="text-xs text-primary mt-2 flex items-center gap-2"><Spinner /> Uploading…</p>}
        </div>
      ) : (
        <button type="button" disabled={uploading}
          className="w-64 h-40 rounded-lg border-2 border-dashed border-white/15 hover:border-primary text-neutral-500 hover:text-primary text-sm flex flex-col items-center justify-center gap-2 transition-colors"
          onClick={() => fileInput.current?.click()}>
          {uploading ? <><Spinner /> Uploading…</> : <>Choose image…<span className="text-[11px]">JPG / PNG / WebP, up to {maxMb} MB</span></>}
        </button>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="text-neutral-400 text-xs uppercase tracking-wider block mb-1">{label}</span>
      {children}
    </label>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm">
      <span className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-4.5 ml-0.5' : 'left-0.5'}`} />
      </span>
      {label && <span className="text-neutral-300">{label}</span>}
    </button>
  )
}

// Generic CRUD page: table + add/edit modal + delete confirm, driven by a config.
// fields: [{ key, label, type: 'text'|'number'|'textarea'|'select'|'toggle'|'image', options?, required? }]
// columns: [{ key, label, render? }]
export function CrudPage({ title, rows, columns, fields, actions, permissions = {}, emptyMessage, defaults = {} }) {
  const toast = useToast()
  const { hasPermission } = useAuth()
  const [editing, setEditing] = useState(null)   // null | {} (new) | row
  const [form, setForm] = useState({})
  const [confirm, confirmDialog] = useConfirm()
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  // True while an ImageUpload inside this form has a request in flight. Saving mid-upload
  // would post the *previous* URL (or none at all) and silently drop the new file, so the
  // submit button waits for the upload to finish instead.
  const [imageBusy, setImageBusy] = useState(false)
  const [notice, setNotice] = useState(null)     // { kind, message }

  const singular = title.endsWith('s') ? title.slice(0, -1) : title
  const canCreate = !permissions.create || hasPermission(permissions.create)
  const canUpdate = !permissions.update || hasPermission(permissions.update)
  const canDelete = !permissions.delete || hasPermission(permissions.delete)

  const open = (row) => { setEditing(row ?? {}); setForm(row ? { ...row } : { ...defaults }); setImageBusy(false) }

  const save = async (e) => {
    e.preventDefault()
    if (saving) return                            // no duplicate submissions
    // The button is already disabled while an image uploads, but Enter inside a text field
    // submits the form regardless of which button is disabled — so guard here as well.
    if (imageBusy) {
      setNotice({ kind: 'error', message: 'An image is still uploading — wait for it to finish, then save.' })
      return
    }
    // Image fields are custom controls, so the browser's `required` attribute cannot
    // guard them — check here instead of letting the API return a 400 for an empty URL.
    const missingImage = fields.find(f => f.type === 'image' && f.required && !form[f.key])
    if (missingImage) {
      setNotice({ kind: 'error', message: `${missingImage.label} is required — choose an image before saving.` })
      return
    }
    setSaving(true)
    const res = await Promise.resolve(
      editing?.id ? actions.update(editing.id, form) : actions.add(form))
    setSaving(false)
    if (res && res.ok === false) {
      // Backend rejected it: the form stays open with everything the user typed.
      setNotice({ kind: 'error', message: res.error || 'The API rejected the request.' })
      return
    }
    // Only now — after the backend confirmed — close and announce.
    setEditing(null)
    setNotice({ kind: 'success', message: `${singular} ${editing?.id ? 'updated' : 'added'} successfully.` })
    setTimeout(() => setNotice(n => (n?.kind === 'success' ? null : n)), 2000)
  }

  const remove = async (id) => {
    const res = await Promise.resolve(actions.remove(id))
    if (res && res.ok === false) setNotice({ kind: 'error', message: res.error })
    else toast('Deleted.', 'error')
  }

  const filtered = search
    ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    : rows

  return (
    <div>
      <PageTitle title={title} action={canCreate && <button className="btn-primary !py-2" onClick={() => open(null)}><IconPlus className="w-4 h-4" /> Add {singular}</button>} />
      <input placeholder={`Search ${title.toLowerCase()}…`} className="field-dark max-w-xs mb-4" value={search} onChange={e => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <div className="border border-dashed border-white/15 rounded-xl p-14 text-center text-neutral-500">
          {emptyMessage || `Nothing here yet.`}
          {canCreate && <div className="mt-4"><button className="btn-primary !py-2" onClick={() => open(null)}><IconPlus className="w-4 h-4" /> Add</button></div>}
        </div>
      ) : (
        <div className="overflow-x-auto panel-dark !rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-white/4 text-neutral-400 text-left text-xs uppercase tracking-wider">
              <tr>{columns.map(c => <th key={c.key} className="px-4 py-3 whitespace-nowrap">{c.label}</th>)}<th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-white/4 transition-colors">
                  {columns.map(c => <td key={c.key} className="px-4 py-3 align-middle">{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>)}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canUpdate && <button className="text-primary hover:underline mr-3" onClick={() => open(row)}>Edit</button>}
                    {canDelete && <button className="text-red-400 hover:underline"
                      onClick={() => confirm(`Delete "${row.name || row.title}"? This cannot be undone.`, () => remove(row.id))}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <Modal title={editing.id ? `Edit ${singular}` : `Add ${singular}`} onClose={() => !saving && setEditing(null)} wide={fields.length > 6}>
          <form onSubmit={save} className={`grid gap-4 ${fields.length > 6 ? 'md:grid-cols-2' : ''}`}>
            {fields.map(f => (
              <div key={f.key} className={['textarea', 'image', 'icon'].includes(f.type) ? 'md:col-span-2' : ''}>
                <Field label={f.label}>
                  {f.type === 'image' ? <ImageUpload value={form[f.key] || ''} onChange={url => setForm({ ...form, [f.key]: url })} onBusy={setImageBusy} />
                    : f.type === 'icon' ? <IconPicker value={form[f.key] || ''} onChange={k => setForm({ ...form, [f.key]: k })} />
                    : f.type === 'textarea' ? <textarea rows="3" required={f.required} className="field-dark" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                    : f.type === 'select' ? (
                      <select className="field-dark" value={form[f.key] ?? ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                        {f.options.map(o => Array.isArray(o)
                          ? <option key={o[0]} value={o[0]}>{o[1]}</option>
                          : <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'toggle' ? <Toggle checked={!!form[f.key]} onChange={v => setForm({ ...form, [f.key]: v })} />
                    : <input type={f.type || 'text'} required={f.required} className="field-dark" value={form[f.key] ?? ''}
                        onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? +e.target.value : e.target.value })} />}
                </Field>
              </div>
            ))}
            <div className={`flex justify-end gap-3 pt-2 ${fields.length > 6 ? 'md:col-span-2' : ''}`}>
              <button type="button" className="btn-outline !bg-transparent !border-white/15 !text-neutral-300 hover:!border-primary hover:!text-primary" disabled={saving} onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" disabled={saving || imageBusy}>
                {(saving || imageBusy) && <Spinner />}{saving ? 'Saving…' : imageBusy ? 'Uploading…' : 'Save'}
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

export const StatusBadge = ({ value, map }) => {
  const colors = map || { available: 'bg-green-500/15 text-green-400', reserved: 'bg-amber-500/15 text-amber-400', sold: 'bg-red-500/15 text-red-400', New: 'bg-blue-500/15 text-blue-400', Contacted: 'bg-amber-500/15 text-amber-400', Closed: 'bg-white/10 text-neutral-400', draft: 'bg-white/10 text-neutral-300', archived: 'bg-orange-500/15 text-orange-400', Qualified: 'bg-teal-500/15 text-teal-400', Converted: 'bg-green-500/15 text-green-400', Lost: 'bg-red-500/15 text-red-400', Archived: 'bg-orange-500/15 text-orange-400' }
  return <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${colors[value] || 'bg-white/10 text-neutral-300'}`}>{value}</span>
}
