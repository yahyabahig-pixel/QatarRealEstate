import { useState } from 'react'
import { useToast } from '../components/Toast'
import { useAuth } from '../store/AuthContext'

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
      <h1 className="h-serif text-2xl text-white">{title}</h1>
      {action}
    </div>
  )
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-start justify-center overflow-y-auto py-10 px-4" onClick={onClose}>
      <div className={`bg-coal border border-neutral-800 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-6`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="h-serif text-xl text-white">{title}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white text-xl">✕</button>
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
      <div className={`max-w-md w-full border-2 p-6 text-center bg-coal shadow-2xl ${kind === 'success' ? 'border-green-600' : 'border-red-600'}`}
        onClick={e => e.stopPropagation()}>
        <div className={`text-4xl mb-3 ${kind === 'success' ? 'text-green-400' : 'text-red-400'}`}>{kind === 'success' ? '✓' : '✕'}</div>
        <p className="text-white text-sm leading-relaxed whitespace-pre-line">{message}</p>
        {kind === 'error' && (
          <button className="btn-gold mt-5 !py-2" onClick={onClose}>OK — let me fix it</button>
        )}
      </div>
    </div>
  )
}

export const Spinner = () => (
  <span className="inline-block w-4 h-4 border-2 border-neutral-500 border-t-gold rounded-full animate-spin align-middle" />
)

export function useConfirm() {
  const [state, setState] = useState(null)
  const confirm = (message, onYes) => setState({ message, onYes })
  const dialog = state && (
    <Modal title="Are you sure?" onClose={() => setState(null)}>
      <p className="text-neutral-300 text-sm mb-6">{state.message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-outline !border-neutral-600 !text-neutral-300" onClick={() => setState(null)}>Cancel</button>
        <button className="bg-red-700 hover:bg-red-600 text-white px-5 py-2 text-sm" onClick={() => { state.onYes(); setState(null) }}>Delete</button>
      </div>
    </Modal>
  )
  return [confirm, dialog]
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
      <span className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-gold' : 'bg-neutral-700'}`}>
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
  const [notice, setNotice] = useState(null)     // { kind, message }

  const singular = title.endsWith('s') ? title.slice(0, -1) : title
  const canCreate = !permissions.create || hasPermission(permissions.create)
  const canUpdate = !permissions.update || hasPermission(permissions.update)
  const canDelete = !permissions.delete || hasPermission(permissions.delete)

  const open = (row) => { setEditing(row ?? {}); setForm(row ? { ...row } : { ...defaults }) }

  const save = async (e) => {
    e.preventDefault()
    if (saving) return                            // no duplicate submissions
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
      <PageTitle title={title} action={canCreate && <button className="btn-gold !py-2" onClick={() => open(null)}>+ Add {singular}</button>} />
      <input placeholder={`Search ${title.toLowerCase()}…`} className="field-dark max-w-xs mb-4" value={search} onChange={e => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <div className="border border-dashed border-neutral-700 p-14 text-center text-neutral-500">
          {emptyMessage || `Nothing here yet.`}
          {canCreate && <div className="mt-4"><button className="btn-gold !py-2" onClick={() => open(null)}>+ Add</button></div>}
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-ink text-neutral-400 text-left text-xs uppercase tracking-wider">
              <tr>{columns.map(c => <th key={c.key} className="px-4 py-3 whitespace-nowrap">{c.label}</th>)}<th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-neutral-900/60">
                  {columns.map(c => <td key={c.key} className="px-4 py-3 align-middle">{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>)}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canUpdate && <button className="text-gold hover:underline mr-3" onClick={() => open(row)}>Edit</button>}
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
              <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                <Field label={f.label}>
                  {f.type === 'textarea' ? <textarea rows="3" required={f.required} className="field-dark" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
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
              <button type="button" className="btn-outline !border-neutral-600 !text-neutral-300" disabled={saving} onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-gold flex items-center gap-2" disabled={saving}>
                {saving && <Spinner />}{saving ? 'Saving…' : 'Save'}
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
  const colors = map || { available: 'bg-green-900 text-green-300', reserved: 'bg-yellow-900 text-yellow-300', sold: 'bg-red-900 text-red-300', New: 'bg-blue-900 text-blue-300', Contacted: 'bg-yellow-900 text-yellow-300', Closed: 'bg-neutral-800 text-neutral-400' }
  return <span className={`text-xs px-2 py-1 rounded uppercase tracking-wide ${colors[value] || 'bg-neutral-800 text-neutral-300'}`}>{value}</span>
}
