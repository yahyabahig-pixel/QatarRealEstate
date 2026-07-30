import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import {
  IconArrowUpRight, IconBriefcase, IconCrane, IconDashboard, IconHome, IconInbox, IconKey,
  IconLogout, IconMap, IconMenu, IconSettings, IconShield, IconSparkle, IconUsers,
} from '../components/icons'

const NAV = [
  { to: '/admin', label: 'Dashboard', Icon: IconDashboard, end: true },
  { to: '/admin/properties', label: 'Properties', Icon: IconHome },
  { to: '/admin/developments', label: 'Developments', Icon: IconCrane },
  { to: '/admin/areas', label: 'Areas', Icon: IconMap },
  { to: '/admin/agents', label: 'Agents', Icon: IconUsers },
  { to: '/admin/jobs', label: 'Jobs', Icon: IconBriefcase },
  { to: '/admin/features', label: 'Features', Icon: IconSparkle },
  { to: '/admin/leads', label: 'Leads', Icon: IconInbox },
  { to: '/admin/admins', label: 'Admins', Icon: IconShield, perm: 'Admin.Read' },
  { to: '/admin/positions', label: 'Positions', Icon: IconBriefcase, perm: 'Position.Read' },
  { to: '/admin/permissions', label: 'Permissions', Icon: IconKey, perm: 'Permission.Read' },
  { to: '/admin/settings', label: 'Settings', Icon: IconSettings },
]

export default function AdminLayout() {
  const { user, logout, hasPermission, isMainAdmin } = useAuth()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const visibleNav = NAV.filter(n => !n.perm || hasPermission(n.perm))

  return (
    <div className="min-h-screen bg-[#1B1C2B] text-neutral-200 flex">
      {/* sidebar */}
      <aside className={`bg-ink border-r border-white/8 flex flex-col fixed inset-y-0 z-40 w-60 transition-transform lg:translate-x-0 lg:static ${drawer ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-5 border-b border-white/8">
          <span className="h-serif text-lg text-white">Prime<span className="text-primary">Admin</span></span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setDrawer(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'text-primary bg-white/6' : 'text-neutral-400 hover:text-white hover:bg-white/4'}`}>
              <Icon className="w-[18px] h-[18px] shrink-0" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={() => { logout(); navigate('/admin/login') }}
          className="m-4 flex items-center justify-center gap-2 border border-white/10 rounded-lg py-2.5 text-sm font-medium text-neutral-400 hover:border-primary hover:text-primary transition-colors">
          <IconLogout className="w-4 h-4" /> Logout
        </button>
      </aside>
      {drawer && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setDrawer(false)} />}

      {/* main */}
      <div className="flex-1 min-w-0">
        <header className="h-16 bg-ink/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-5 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/8 transition-colors" onClick={() => setDrawer(true)} aria-label="Open menu"><IconMenu className="w-5 h-5" /></button>
            <span className="text-sm text-neutral-400 font-medium">Admin Panel</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-primary brand-link hidden sm:inline-flex items-center gap-1 font-medium">View site <IconArrowUpRight className="w-3.5 h-3.5" /></Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {user?.fullName?.[0] || 'A'}
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="text-white font-medium">{user?.fullName}</div>
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
