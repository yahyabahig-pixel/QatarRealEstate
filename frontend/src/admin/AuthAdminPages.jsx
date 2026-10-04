import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { useToast } from '../components/Toast'
import { adminsApi, positionsApi, permissionsApi } from '../api/adminApi'
import { PageTitle, Modal, useConfirm, Field, StatusBadge } from './adminUi'

// ---------------------------------------------------------------------------------------
// Admin / Position / Permission management (Prompt 3). Talks to the api layer — mock or
// real backend transparently. UI hides what the caller can't do; the backend enforces the
// real rules (Main Admin protection etc.) and 403s are surfaced as toasts.
// ---------------------------------------------------------------------------------------
const errText = (e) => e?.problem?.errors?.[0]?.description || e?.problem?.title || e?.message || 'Request failed.'  // fallback stays English: shown only when the API gave nothing

export function AdminsAdmin() {
  const { hasPermission, user } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [positions, setPositions] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', fullName: '', positionId: '' })
  const [saving, setSaving] = useState(false)
  const [confirm, confirmDialog] = useConfirm()

  const reload = () => Promise.all([adminsApi.list(), positionsApi.list()])
    .then(([a, p]) => { setRows(a.items || a); setPositions(p) })
    .catch(e => toast(errText(e), 'error'))
  useEffect(() => { reload() }, [])

  // Returns whether the call SUCCEEDED. It used to return nothing, and every caller that
  // opened a modal closed it on the next line — synchronously, before the server had
  // answered. A rejected password or a duplicate position name showed "Validation failed"
  // over an already-closed, already-cleared form, so everything typed was lost and had to
  // be typed again blind. Callers now await this and keep the form open on false.
  const run = async (fn, ok) => {
    try { await fn(); toast(ok); await reload(); return true }
    catch (e) { toast(errText(e), 'error'); return false }
  }

  if (!rows) return <p className="text-neutral-500">{t('admin.auth.loading')}</p>

  return (
    <div>
      <PageTitle title={t('admin.auth.adminsTitle')}
        action={hasPermission('Admin.Create') && <button className="btn-primary !py-2" onClick={() => setCreating(true)}>{t('admin.auth.createAdmin')}</button>} />
      <div className="overflow-x-auto panel-dark !rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-white/4 text-neutral-400 text-start text-xs uppercase tracking-wider">
            <tr>{[t('admin.auth.thName'), t('admin.auth.thEmail'), t('admin.auth.thPosition'), t('admin.auth.thStatus'), t('admin.auth.thActions')].map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map(a => (
              <tr key={a.id} className="hover:bg-white/4 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/admin/admins/${a.id}`} className="text-white hover:text-primary">{a.fullName}</Link>
                  {a.isMainAdmin && <span className="ms-2 text-primary text-xs border border-primary/40 px-1.5 py-0.5">{t('admin.auth.mainAdmin')}</span>}
                  {a.id === user?.id && <span className="ms-2 text-neutral-500 text-xs">{t('admin.auth.you')}</span>}
                </td>
                <td className="px-4 py-3 text-neutral-400">{a.email}</td>
                <td className="px-4 py-3">{a.positionName || <span className="text-neutral-600">—</span>}</td>
                <td className="px-4 py-3"><StatusBadge value={a.isActive ? 'active' : 'inactive'} map={{ active: 'bg-green-500/15 text-green-400', inactive: 'bg-red-900 text-red-300' }} /></td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {/* The UI never offers destructive actions against the Main Admin —
                      and the backend would refuse them anyway (Admin.MainAdminProtected). */}
                  {a.isMainAdmin ? <span className="text-neutral-600 text-xs">{t('admin.auth.protected')}</span> : (
                    <>
                      {hasPermission('Admin.Update') && (a.isActive
                        ? <button className="text-yellow-400 hover:underline me-3" onClick={() => run(() => adminsApi.deactivate(a.id), t('admin.auth.deactivated'))}>{t('admin.auth.deactivate')}</button>
                        : <button className="text-green-400 hover:underline me-3" onClick={() => run(() => adminsApi.activate(a.id), t('admin.auth.activated'))}>{t('admin.auth.activate')}</button>)}
                      {hasPermission('Admin.Delete') &&
                        <button className="text-red-400 hover:underline" onClick={() => confirm(t('admin.auth.deleteAdminConfirm', { name: a.fullName }), () => run(() => adminsApi.remove(a.id), t('admin.auth.deletedOk')))}>{t('admin.auth.deleteBtn')}</button>}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal title={t('admin.auth.createAdminTitle')} onClose={() => setCreating(false)}>
          {/* No role field, no Main-Admin field — a created admin is ALWAYS a regular admin. */}
          <form className="space-y-4" onSubmit={async e => {
            e.preventDefault()
            if (saving) return
            setSaving(true)
            const ok = await run(() => adminsApi.create({ ...form, positionId: form.positionId || null }), t('admin.auth.createdOk'))
            setSaving(false)
            // Failed? Leave the modal open with everything still in it, so the admin can
            // fix the one field the backend complained about.
            if (!ok) return
            setCreating(false); setForm({ email: '', password: '', fullName: '', positionId: '' })
          }}>
            <Field label={t('admin.auth.fFullName')}><input required className="field-dark" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label={t('admin.auth.fEmail')}><input required type="email" className="field-dark" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label={t('admin.auth.fPassword')}><input required type="password" minLength="8" className="field-dark" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label={t('admin.auth.fPosition')}>
              <select className="field-dark" value={form.positionId} onChange={e => setForm({ ...form, positionId: e.target.value })}>
                <option value="">{t('admin.auth.noPosition')}</option>
                {positions.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <button className="btn-primary w-full" disabled={saving}>{saving ? t('common.loading') : t('admin.auth.createAdminBtn')}</button>
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
  const { t } = useI18n()
  const toast = useToast()
  const [admin, setAdmin] = useState(null)
  const [positions, setPositions] = useState([])
  const [name, setName] = useState('')
  const [positionId, setPositionId] = useState('')

  const reload = () => Promise.all([adminsApi.get(id), positionsApi.list()])
    .then(([a, p]) => { setAdmin(a); setName(a?.fullName || ''); setPositionId(a?.positionId || ''); setPositions(p) })
    .catch(e => toast(errText(e), 'error'))
  useEffect(() => { reload() }, [id])

  if (!admin) return <p className="text-neutral-500">{t('admin.auth.loading')}</p>
  // Returns whether the call SUCCEEDED. It used to return nothing, and every caller that
  // opened a modal closed it on the next line — synchronously, before the server had
  // answered. A rejected password or a duplicate position name showed "Validation failed"
  // over an already-closed, already-cleared form, so everything typed was lost and had to
  // be typed again blind. Callers now await this and keep the form open on false.
  const run = async (fn, ok) => {
    try { await fn(); toast(ok); await reload(); return true }
    catch (e) { toast(errText(e), 'error'); return false }
  }

  return (
    <div className="max-w-2xl">
      <PageTitle title={admin.fullName} />
      <div className="panel-dark p-6 space-y-5">
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <span className="text-neutral-400">{admin.email}</span>
          <StatusBadge value={admin.isActive ? 'active' : 'inactive'} map={{ active: 'bg-green-500/15 text-green-400', inactive: 'bg-red-900 text-red-300' }} />
          {admin.isMainAdmin && <span className="text-primary text-xs border border-primary/40 px-2 py-0.5">{t('admin.auth.mainAdminBadgeLong')}</span>}
        </div>

        {!admin.isMainAdmin && hasPermission('Admin.Update') && (
          <form className="flex gap-3 items-end" onSubmit={e => { e.preventDefault(); run(() => adminsApi.update(admin.id, { fullName: name }), t('admin.auth.nameUpdated')) }}>
            <div className="flex-1"><Field label={t('admin.auth.fFullName')}><input className="field-dark" value={name} onChange={e => setName(e.target.value)} /></Field></div>
            <button className="btn-primary !py-2">{t('admin.auth.saveBtn')}</button>
          </form>
        )}

        {!admin.isMainAdmin && hasPermission('Admin.AssignPosition') && (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Field label={t('admin.auth.position')}>
                <select className="field-dark" value={positionId} onChange={e => setPositionId(e.target.value)}>
                  <option value="">{t('admin.auth.noPosition')}</option>
                  {positions.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <button className="btn-primary !py-2" onClick={() =>
              positionId ? run(() => adminsApi.assignPosition(admin.id, positionId), t('admin.auth.positionAssigned'))
                : run(() => adminsApi.removePosition(admin.id), t('admin.auth.positionRemoved'))}>{t('admin.auth.apply')}</button>
          </div>
        )}

        <div>
          <div className="eyebrow mb-2">{t('admin.auth.effective')}</div>
          {admin.isMainAdmin
            ? <p className="text-sm text-neutral-300">{t('admin.auth.allPerms')}</p>
            : (admin.permissions?.length
              ? <div className="flex flex-wrap gap-2">{admin.permissions.map(p => <span key={p} className="border border-neutral-700 text-neutral-300 px-2 py-1 text-xs">{p}</span>)}</div>
              : <p className="text-sm text-neutral-600">{t('admin.auth.noPerms')}</p>)}
        </div>
      </div>
    </div>
  )
}

export function PositionsAdmin() {
  const { hasPermission } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [confirm, confirmDialog] = useConfirm()

  const reload = () => positionsApi.list().then(setRows).catch(e => toast(errText(e), 'error'))
  useEffect(() => { reload() }, [])
  // Returns whether the call SUCCEEDED. It used to return nothing, and every caller that
  // opened a modal closed it on the next line — synchronously, before the server had
  // answered. A rejected password or a duplicate position name showed "Validation failed"
  // over an already-closed, already-cleared form, so everything typed was lost and had to
  // be typed again blind. Callers now await this and keep the form open on false.
  const run = async (fn, ok) => {
    try { await fn(); toast(ok); await reload(); return true }
    catch (e) { toast(errText(e), 'error'); return false }
  }

  if (!rows) return <p className="text-neutral-500">{t('admin.auth.loading')}</p>

  return (
    <div>
      <PageTitle title={t('admin.auth.positionsTitle')}
        action={hasPermission('Position.Create') && <button className="btn-primary !py-2" onClick={() => { setEditing({}); setForm({ name: '', description: '' }) }}>{t('admin.auth.createPosition')}</button>} />
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map(p => (
          <div key={p.id} className="panel-dark p-5">
            <div className="flex justify-between items-start mb-2">
              <Link to={`/admin/positions/${p.id}`} className="h-serif text-lg text-white hover:text-primary">{p.name}</Link>
              <span className="text-xs text-neutral-500">{t('admin.auth.admins', { n: p.adminCount })}</span>
            </div>
            <p className="text-sm text-neutral-400 mb-3">{p.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {p.permissions.length === 0
                ? <span className="text-xs text-neutral-600">{t('admin.auth.noPermsYet')}</span>
                : p.permissions.map(x => <span key={x} className="border border-primary/30 text-primary px-2 py-0.5 text-[11px]">{x}</span>)}
            </div>
            <div className="flex gap-3 text-sm">
              <Link to={`/admin/positions/${p.id}`} className="text-primary hover:underline">{t('admin.auth.managePerms')}</Link>
              {hasPermission('Position.Update') && <button className="text-neutral-300 hover:underline" onClick={() => { setEditing(p); setForm({ name: p.name, description: p.description }) }}>{t('admin.crud.edit')}</button>}
              {hasPermission('Position.Delete') && <button className="text-red-400 hover:underline"
                onClick={() => confirm(t('admin.auth.deletePositionConfirm', { name: p.name }), () => run(() => positionsApi.remove(p.id), t('admin.auth.positionDeleted')))}>{t('admin.crud.delete')}</button>}
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <Modal title={editing.id ? t('admin.auth.editPositionTitle') : t('admin.auth.createPositionTitle')} onClose={() => setEditing(null)}>
          <form className="space-y-4" onSubmit={async e => {
            e.preventDefault()
            if (saving) return
            setSaving(true)
            const ok = await run(() => editing.id ? positionsApi.update(editing.id, form) : positionsApi.create(form),
              editing.id ? t('admin.auth.positionUpdated') : t('admin.auth.positionCreated'))
            setSaving(false)
            if (!ok) return   // duplicate name, empty description… keep what was typed
            setEditing(null)
          }}>
            <Field label={t('admin.auth.fName')}><input required className="field-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label={t('admin.auth.fDescription')}><textarea rows="3" className="field-dark" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <button className="btn-primary w-full" disabled={saving}>{saving ? t('common.loading') : t('admin.auth.saveBtn')}</button>
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
  const { t } = useI18n()
  const toast = useToast()
  const [position, setPosition] = useState(null)
  const [catalog, setCatalog] = useState([])

  const reload = () => Promise.all([positionsApi.get(id), permissionsApi.catalog()])
    .then(([p, c]) => { setPosition(p); setCatalog(c) })
    .catch(e => toast(errText(e), 'error'))
  useEffect(() => { reload() }, [id])
  // Returns whether the call SUCCEEDED. It used to return nothing, and every caller that
  // opened a modal closed it on the next line — synchronously, before the server had
  // answered. A rejected password or a duplicate position name showed "Validation failed"
  // over an already-closed, already-cleared form, so everything typed was lost and had to
  // be typed again blind. Callers now await this and keep the form open on false.
  const run = async (fn, ok) => {
    try { await fn(); toast(ok); await reload(); return true }
    catch (e) { toast(errText(e), 'error'); return false }
  }

  if (!position) return <p className="text-neutral-500">{t('admin.auth.loading')}</p>
  const canAssign = hasPermission('Permission.Assign')
  const groups = [...new Set(catalog.map(p => p.split('.')[0]))]

  return (
    <div className="max-w-3xl">
      <PageTitle title={position.name} />
      <p className="text-neutral-400 text-sm mb-6">{position.description}</p>
      {!canAssign && <p className="text-xs text-neutral-500 mb-4">{t('admin.auth.viewOnly')} <span className="text-primary">Permission.Assign</span> {t('admin.auth.mainByDefault')}</p>}
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
                      has ? t('admin.auth.removedPerm', { p: perm }) : t('admin.auth.grantedPerm', { p: perm }))}
                    className={`px-3 py-1.5 text-xs border transition-colors ${has ? 'bg-primary text-black border-primary' : 'border-neutral-700 text-neutral-400 hover:border-primary'} ${!canAssign ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {has ? '✓ ' : ''}{perm}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-600 mt-8">{t('admin.auth.jwtNote')}</p>
    </div>
  )
}

export function PermissionsAdmin() {
  const { t } = useI18n()
  const toast = useToast()
  const [catalog, setCatalog] = useState([])
  useEffect(() => { permissionsApi.catalog().then(setCatalog).catch(e => toast(errText(e), 'error')) }, [])
  const groups = [...new Set(catalog.map(p => p.split('.')[0]))]
  return (
    <div className="max-w-3xl">
      <PageTitle title={t('admin.auth.catalogTitle')} />
      <p className="text-neutral-400 text-sm mb-6">{t('admin.auth.catalogIntro1')} <Link to="/admin/positions" className="text-primary">{t('admin.auth.catalogIntroLink')}</Link>{t('admin.auth.catalogIntro2')}</p>
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
