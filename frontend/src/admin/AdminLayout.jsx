import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '▦', end: true },
  { to: '/admin/properties', label: 'Properties', icon: '🏠' },
  { to: '/admin/developments', label: 'Developments', icon: '🏗' },
  { to: '/admin/areas', label: 'Areas', icon: '🗺' },
  { to: '/admin/agents', label: 'Agents', icon: '👥' },
  { to: '/admin/jobs', label: 'Jobs', icon: '💼' },
  { to: '/admin/features', label: 'Features', icon: '✦' },
  { to: '/admin/leads', label: 'Leads', icon: '📩' },
  { to: '/admin/admins', label: 'Admins', icon: '🛡', perm: 'Admin.Read' },
  { to: '/admin/positions', label: 'Positions', icon: '🎖', perm: 'Position.Read' },
  { to: '/admin/permissions', label: 'Permissions', icon: '🔑', perm: 'Permission.Read' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙' },
]

export default function AdminLayout() {
  const { user, logout, hasPermission, isMainAdmin } = useAuth()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const visibleNav = NAV.filter(n => !n.perm || hasPermission(n.perm))

  return (
    <div className="min-h-screen bg-[#111] text-neutral-200 flex">
      {/* sidebar */}
      <aside className={`bg-ink border-r border-neutral-800 flex flex-col fixed inset-y-0 z-40 w-60 transition-transform lg:translate-x-0 lg:static ${drawer ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-5 border-b border-neutral-800">
          <span className="h-serif text-lg text-white">Prime<span className="text-gold">Admin</span></span>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setDrawer(false)}
              className={({ isActive }) => `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${isActive ? 'text-gold bg-neutral-900 border-r-2 border-gold' : 'text-neutral-400 hover:text-white'}`}>
              <span className="w-5 text-center">{n.icon}</span><span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={() => { logout(); navigate('/admin/login') }}
          className="m-4 border border-neutral-700 py-2 text-sm hover:border-gold hover:text-gold transition-colors">
          Logout
        </button>
      </aside>
      {drawer && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setDrawer(false)} />}

      {/* main */}
      <div className="flex-1 min-w-0">
        <header className="h-16 bg-ink border-b border-neutral-800 flex items-center justify-between px-5 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-xl" onClick={() => setDrawer(true)}>☰</button>
            <span className="text-sm text-neutral-400">Admin Panel</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-gold gold-link hidden sm:block">View site ↗</Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold text-black flex items-center justify-center font-semibold">
                {user?.fullName?.[0] || 'A'}
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="text-white">{user?.fullName}</div>
                <div className="text-[11px] text-neutral-500">{isMainAdmin ? '★ Main Admin' : user?.positionName || 'Admin'}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="p-5 lg:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
