import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useToast } from '../components/Toast'
import { adminsApi, positionsApi, permissionsApi } from '../api/adminApi'
import { PageTitle, Modal, useConfirm, Field, StatusBadge } from './adminUi'

// ---------------------------------------------------------------------------------------
// Admin / Position / Permission management (Prompt 3). Talks to the api layer — mock or
// real backend transparently. UI hides what the caller can't do; the backend enforces the
// real rules (Main Admin protection etc.) and 403s are surfaced as toasts.
// ---------------------------------------------------------------------------------------
const errText = (e) => e?.problem?.errors?.[0]?.description || e?.problem?.title || e?.message || 'Request failed.'

export function AdminsAdmin() {
  const { hasPermission, user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [positions, setPositions] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', fullName: '', positionId: '' })
  const [confirm, confirmDialog] = useConfirm()

  const reload = () => Promise.all([adminsApi.list(), positionsApi.list()])
    .then(([a, p]) => { setRows(a.items || a); setPositions(p) })
    .catch(e => toast(errText(e), 'error'))
  useEffect(() => { reload() }, [])

  const run = (fn, ok) => fn().then(() => { toast(ok); reload() }).catch(e => toast(errText(e), 'error'))

  if (!rows) return <p className="text-neutral-500">Loading…</p>

  return (
    <div>
      <PageTitle title="Admins"
        action={hasPermission('Admin.Create') && <button className="btn-primary !py-2" onClick={() => setCreating(true)}>+ Create Admin</button>} />
      <div className="overflow-x-auto panel-dark !rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-white/4 text-neutral-400 text-left text-xs uppercase tracking-wider">
            <tr>{['Name', 'Email', 'Position', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map(a => (
              <tr key={a.id} className="hover:bg-white/4 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/admin/admins/${a.id}`} className="text-white hover:text-primary">{a.fullName}</Link>
                  {a.isMainAdmin && <span className="ml-2 text-primary text-xs border border-primary/40 px-1.5 py-0.5">★ MAIN ADMIN</span>}
                  {a.id === user?.id && <span className="ml-2 text-neutral-500 text-xs">(you)</span>}
                </td>
                <td className="px-4 py-3 text-neutral-400">{a.email}</td>
                <td className="px-4 py-3">{a.positionName || <span className="text-neutral-600">—</span>}</td>
                <td className="px-4 py-3"><StatusBadge value={a.isActive ? 'active' : 'inactive'} map={{ active: 'bg-green-500/15 text-green-400', inactive: 'bg-red-900 text-red-300' }} /></td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {/* The UI never offers destructive actions against the Main Admin —
                      and the backend would refuse them anyway (Admin.MainAdminProtected). */}
                  {a.isMainAdmin ? <span className="text-neutral-600 text-xs">Protected</span> : (
                    <>
                      {hasPermission('Admin.Update') && (a.isActive
                        ? <button className="text-yellow-400 hover:underline mr-3" onClick={() => run(() => adminsApi.deactivate(a.id), 'Admin deactivated.')}>Deactivate</button>
                        : <button className="text-green-400 hover:underline mr-3" onClick={() => run(() => adminsApi.activate(a.id), 'Admin activated.')}>Activate</button>)}
                      {hasPermission('Admin.Delete') &&
                        <button className="text-red-400 hover:underline" onClick={() => confirm(`Permanently delete ${a.fullName}? Deactivating is usually enough.`, () => run(() => adminsApi.remove(a.id), 'Admin deleted.'))}>Delete</button>}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal title="Create Admin" onClose={() => setCreating(false)}>
          {/* No role field, no Main-Admin field — a created admin is ALWAYS a regular admin. */}
          <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            run(() => adminsApi.create({ ...form, positionId: form.positionId || null }), 'Admin created.')
            setCreating(false); setForm({ email: '', password: '', fullName: '', positionId: '' })
          }}>
            <Field label="Full name"><input required className="field-dark" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Email"><input required type="email" className="field-dark" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Password (min 8, upper+lower+digit)"><input required type="password" minLength="8" className="field-dark" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="Position (optional)">
              <select className="field-dark" value={form.positionId} onChange={e => setForm({ ...form, positionId: e.target.value })}>
                <option value="">— No position —</option>
                {positions.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <button className="btn-primary w-full">Create Admin</button>
          </form>
        </Modal>
      )}
      {confirmDialog}
    </div>
  )
}

export function AdminDetail() {
  const { id } = useParams()
  const { hasPermission } = useAuth()
  const toast = useToast()
  const [admin, setAdmin] = useState(null)
  const [positions, setPositions] = useState([])
  const [name, setName] = useState('')
  const [positionId, setPositionId] = useState('')

  const reload = () => Promise.all([adminsApi.get(id), positionsApi.list()])
    .then(([a, p]) => { setAdmin(a); setName(a?.fullName || ''); setPositionId(a?.positionId || ''); setPositions(p) })
    .catch(e => toast(errText(e), 'error'))
  useEffect(() => { reload() }, [id])

  if (!admin) return <p className="text-neutral-500">Loading…</p>
  const run = (fn, ok) => fn().then(() => { toast(ok); reload() }).catch(e => toast(errText(e), 'error'))

  return (
    <div className="max-w-2xl">
      <PageTitle title={admin.fullName} />
      <div className="panel-dark p-6 space-y-5">
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <span className="text-neutral-400">{admin.email}</span>
          <StatusBadge value={admin.isActive ? 'active' : 'inactive'} map={{ active: 'bg-green-500/15 text-green-400', inactive: 'bg-red-900 text-red-300' }} />
          {admin.isMainAdmin && <span className="text-primary text-xs border border-primary/40 px-2 py-0.5">★ MAIN ADMIN — full access, protected account</span>}
        </div>

        {!admin.isMainAdmin && hasPermission('Admin.Update') && (
          <form className="flex gap-3 items-end" onSubmit={e => { e.preventDefault(); run(() => adminsApi.update(admin.id, { fullName: name }), 'Name updated.') }}>
            <div className="flex-1"><Field label="Full name"><input className="field-dark" value={name} onChange={e => setName(e.target.value)} /></Field></div>
            <button className="btn-primary !py-2">Save</button>
          </form>
        )}

        {!admin.isMainAdmin && hasPermission('Admin.AssignPosition') && (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Field label="Position">
                <select className="field-dark" value={positionId} onChange={e => setPositionId(e.target.value)}>
                  <option value="">— No position —</option>
                  {positions.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <button className="btn-primary !py-2" onClick={() =>
              positionId ? run(() => adminsApi.assignPosition(admin.id, positionId), 'Position assigned.')
                : run(() => adminsApi.removePosition(admin.id), 'Position removed.')}>Apply</button>
          </div>
        )}

        <div>
          <div className="eyebrow mb-2">Effective permissions</div>
          {admin.isMainAdmin
            ? <p className="text-sm text-neutral-300">All permissions — the Main Admin bypasses permission checks entirely.</p>
            : (admin.permissions?.length
              ? <div className="flex flex-wrap gap-2">{admin.permissions.map(p => <span key={p} className="border border-neutral-700 text-neutral-300 px-2 py-1 text-xs">{p}</span>)}</div>
              : <p className="text-sm text-neutral-600">No position assigned → no permissions.</p>)}
        </div>
      </div>
    </div>
  )
}

export function PositionsAdmin() {
  const { hasPermission } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [confirm, confirmDialog] = useConfirm()

  const reload = () => positionsApi.list().then(setRows).catch(e => toast(errText(e), 'error'))
  useEffect(() => { reload() }, [])
  const run = (fn, ok) => fn().then(() => { toast(ok); reload() }).catch(e => toast(errText(e), 'error'))

  if (!rows) return <p className="text-neutral-500">Loading…</p>

  return (
    <div>
      <PageTitle title="Positions"
        action={hasPermission('Position.Create') && <button className="btn-primary !py-2" onClick={() => { setEditing({}); setForm({ name: '', description: '' }) }}>+ Create Position</button>} />
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map(p => (
          <div key={p.id} className="panel-dark p-5">
            <div className="flex justify-between items-start mb-2">
              <Link to={`/admin/positions/${p.id}`} className="h-serif text-lg text-white hover:text-primary">{p.name}</Link>
              <span className="text-xs text-neutral-500">{p.adminCount} admin(s)</span>
            </div>
            <p className="text-sm text-neutral-400 mb-3">{p.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {p.permissions.length === 0
                ? <span className="text-xs text-neutral-600">No permissions yet</span>
                : p.permissions.map(x => <span key={x} className="border border-primary/30 text-primary px-2 py-0.5 text-[11px]">{x}</span>)}
            </div>
            <div className="flex gap-3 text-sm">
              <Link to={`/admin/positions/${p.id}`} className="text-primary hover:underline">Manage permissions</Link>
              {hasPermission('Position.Update') && <button className="text-neutral-300 hover:underline" onClick={() => { setEditing(p); setForm({ name: p.name, description: p.description }) }}>Edit</button>}
              {hasPermission('Position.Delete') && <button className="text-red-400 hover:underline"
                onClick={() => confirm(`Delete position "${p.name}"? Admins holding it block deletion.`, () => run(() => positionsApi.remove(p.id), 'Position deleted.'))}>Delete</button>}
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <Modal title={editing.id ? 'Edit Position' : 'Create Position'} onClose={() => setEditing(null)}>
          <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            run(() => editing.id ? positionsApi.update(editing.id, form) : positionsApi.create(form),
              editing.id ? 'Position updated.' : 'Position created.')
            setEditing(null)
          }}>
            <Field label="Name"><input required className="field-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Description"><textarea rows="3" className="field-dark" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <button className="btn-primary w-full">Save</button>
          </form>
        </Modal>
      )}
      {confirmDialog}
    </div>
  )
}

export function PositionDetail() {
  const { id } = useParams()
  const { hasPermission } = useAuth()
  const toast = useToast()
  const [position, setPosition] = useState(null)
  const [catalog, setCatalog] = useState([])

  const reload = () => Promise.all([positionsApi.get(id), permissionsApi.catalog()])
    .then(([p, c]) => { setPosition(p); setCatalog(c) })
    .catch(e => toast(errText(e), 'error'))
  useEffect(() => { reload() }, [id])
  const run = (fn, ok) => fn().then(() => { toast(ok); reload() }).catch(e => toast(errText(e), 'error'))

  if (!position) return <p className="text-neutral-500">Loading…</p>
  const canAssign = hasPermission('Permission.Assign')
  const groups = [...new Set(catalog.map(p => p.split('.')[0]))]

  return (
    <div className="max-w-3xl">
      <PageTitle title={position.name} />
      <p className="text-neutral-400 text-sm mb-6">{position.description}</p>
      {!canAssign && <p className="text-xs text-neutral-500 mb-4">You can view this position's permissions but changing them requires <span className="text-primary">Permission.Assign</span> (Main Admin by default).</p>}
      <div className="space-y-6">
        {groups.map(g => (
          <div key={g}>
            <div className="eyebrow mb-2">{g}</div>
            <div className="flex flex-wrap gap-2">
              {catalog.filter(p => p.startsWith(g + '.')).map(perm => {
                const has = position.permissions.includes(perm)
                return (
                  <button key={perm} disabled={!canAssign}
                    onClick={() => run(() => has ? positionsApi.removePermission(position.id, perm) : positionsApi.assignPermission(position.id, perm),
                      has ? `Removed ${perm}.` : `Granted ${perm}.`)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${has ? 'bg-primary text-black border-primary' : 'border-neutral-700 text-neutral-400 hover:border-primary'} ${!canAssign ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {has ? '✓ ' : ''}{perm}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-600 mt-8">Permission changes take effect at the admin's next login (permissions ride inside the JWT).</p>
    </div>
  )
}

export function PermissionsAdmin() {
  const toast = useToast()
  const [catalog, setCatalog] = useState([])
  useEffect(() => { permissionsApi.catalog().then(setCatalog).catch(e => toast(errText(e), 'error')) }, [])
  const groups = [...new Set(catalog.map(p => p.split('.')[0]))]
  return (
    <div className="max-w-3xl">
      <PageTitle title="Permission Catalog" />
      <p className="text-neutral-400 text-sm mb-6">Every permission the system knows. Permissions are granted to <Link to="/admin/positions" className="text-primary">Positions</Link>, never directly to people — and never by the person themselves.</p>
      <div className="space-y-6">
        {groups.map(g => (
          <div key={g} className="panel-dark p-5">
            <div className="eyebrow mb-3">{g}</div>
            <div className="flex flex-wrap gap-2">
              {catalog.filter(p => p.startsWith(g + '.')).map(p => (
                <span key={p} className="border border-neutral-700 text-neutral-300 px-3 py-1.5 text-xs">{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
