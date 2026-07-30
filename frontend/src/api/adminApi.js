import { http, MOCK_MODE } from './client'

// Admin / Position / Permission management — mirrors the backend Auth module endpoints.
// In MOCK_MODE these operate on an in-memory list so the UI is fully demoable.

let mockAdmins = [
  { id: 'mock-admin', email: 'admin@demo.com', fullName: 'Demo Main Admin', isMainAdmin: true, isActive: true, positionId: null, positionName: null, permissions: [], createdAtUtc: '2026-01-01' },
  { id: 'mock-2', email: 'pm@demo.com', fullName: 'Property Manager Demo', isMainAdmin: false, isActive: true, positionId: 'pos1', positionName: 'Property Manager', permissions: ['Property.Read', 'Property.Create', 'Property.Update', 'Property.Publish'], createdAtUtc: '2026-03-12' },
]
let mockPositions = [
  { id: 'pos1', name: 'Property Manager', description: 'Manages listings end to end.', isActive: true, permissions: ['Property.Read', 'Property.Create', 'Property.Update', 'Property.Publish'], adminCount: 1 },
  { id: 'pos2', name: 'Content Manager', description: 'Manages site content.', isActive: true, permissions: ['Property.Read'], adminCount: 0 },
  { id: 'pos3', name: 'User Manager', description: 'Manages end-user accounts.', isActive: true, permissions: ['User.Read', 'User.Update', 'Admin.Read'], adminCount: 0 },
  { id: 'pos4', name: 'Support Manager', description: 'Read access for support work.', isActive: true, permissions: ['Property.Read', 'User.Read'], adminCount: 0 },
]
const MOCK_CATALOG = [
  'Property.Read', 'Property.Create', 'Property.Update', 'Property.Delete', 'Property.Publish',
  'User.Read', 'User.Update', 'User.Delete',
  'Admin.Read', 'Admin.Create', 'Admin.Update', 'Admin.Delete', 'Admin.AssignPosition',
  'Position.Read', 'Position.Create', 'Position.Update', 'Position.Delete',
  'Permission.Read', 'Permission.Assign',
]
const uid = () => Math.random().toString(36).slice(2, 10)

export const adminsApi = {
  async list() {
    if (MOCK_MODE) return { items: mockAdmins, totalCount: mockAdmins.length }
    return http('/api/admins?pageSize=100')
  },
  async get(id) {
    if (MOCK_MODE) return mockAdmins.find(a => a.id === id) || null
    return http(`/api/admins/${id}`)
  },
  async create(body) {
    if (MOCK_MODE) {
      const pos = mockPositions.find(p => p.id === body.positionId)
      const a = { id: uid(), email: body.email, fullName: body.fullName, isMainAdmin: false, isActive: true, positionId: body.positionId || null, positionName: pos?.name || null, permissions: pos?.permissions || [], createdAtUtc: new Date().toISOString() }
      mockAdmins = [...mockAdmins, a]; return { id: a.id }
    }
    return http('/api/admins', { method: 'POST', body })
  },
  async update(id, body) {
    if (MOCK_MODE) { mockAdmins = mockAdmins.map(a => a.id === id ? { ...a, ...body } : a); return null }
    return http(`/api/admins/${id}`, { method: 'PUT', body })
  },
  async activate(id) {
    if (MOCK_MODE) { mockAdmins = mockAdmins.map(a => a.id === id ? { ...a, isActive: true } : a); return null }
    return http(`/api/admins/${id}/activate`, { method: 'POST' })
  },
  async deactivate(id) {
    if (MOCK_MODE) { mockAdmins = mockAdmins.map(a => a.id === id ? { ...a, isActive: false } : a); return null }
    return http(`/api/admins/${id}/deactivate`, { method: 'POST' })
  },
  async remove(id) {
    if (MOCK_MODE) { mockAdmins = mockAdmins.filter(a => a.id !== id); return null }
    return http(`/api/admins/${id}`, { method: 'DELETE' })
  },
  async assignPosition(id, positionId) {
    if (MOCK_MODE) {
      const pos = mockPositions.find(p => p.id === positionId)
      mockAdmins = mockAdmins.map(a => a.id === id ? { ...a, positionId, positionName: pos?.name, permissions: pos?.permissions || [] } : a); return null
    }
    return http(`/api/admins/${id}/position`, { method: 'POST', body: { positionId } })
  },
  async removePosition(id) {
    if (MOCK_MODE) { mockAdmins = mockAdmins.map(a => a.id === id ? { ...a, positionId: null, positionName: null, permissions: [] } : a); return null }
    return http(`/api/admins/${id}/position`, { method: 'DELETE' })
  },
}

export const positionsApi = {
  async list() { if (MOCK_MODE) return mockPositions; return http('/api/positions') },
  async get(id) { if (MOCK_MODE) return mockPositions.find(p => p.id === id) || null; return http(`/api/positions/${id}`) },
  async create(body) {
    if (MOCK_MODE) { const p = { id: uid(), ...body, isActive: true, permissions: [], adminCount: 0 }; mockPositions = [...mockPositions, p]; return { id: p.id } }
    return http('/api/positions', { method: 'POST', body })
  },
  async update(id, body) {
    if (MOCK_MODE) { mockPositions = mockPositions.map(p => p.id === id ? { ...p, ...body } : p); return null }
    return http(`/api/positions/${id}`, { method: 'PUT', body })
  },
  async remove(id) {
    if (MOCK_MODE) { mockPositions = mockPositions.filter(p => p.id !== id); return null }
    return http(`/api/positions/${id}`, { method: 'DELETE' })
  },
  async assignPermission(id, permission) {
    if (MOCK_MODE) { mockPositions = mockPositions.map(p => p.id === id ? { ...p, permissions: [...new Set([...p.permissions, permission])] } : p); return null }
    return http(`/api/positions/${id}/permissions`, { method: 'POST', body: { permission } })
  },
  async removePermission(id, permission) {
    if (MOCK_MODE) { mockPositions = mockPositions.map(p => p.id === id ? { ...p, permissions: p.permissions.filter(x => x !== permission) } : p); return null }
    return http(`/api/positions/${id}/permissions/${encodeURIComponent(permission)}`, { method: 'DELETE' })
  },
}

export const permissionsApi = {
  async catalog() { if (MOCK_MODE) return MOCK_CATALOG; return http('/api/permissions') },
}
