import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import {
  IconArrowUpRight, IconBriefcase, IconCrane, IconDashboard, IconHome, IconInbox, IconKey,
  IconLogout, IconMap, IconMenu, IconSettings, IconShield, IconSparkle, IconUsers,
} from '../components/icons'

const NAV = [
  { to: '/admin', key: 'dashboard', Icon: IconDashboard, end: true },
  { to: '/admin/properties', key: 'properties', Icon: IconHome },
  { to: '/admin/developments', key: 'developments', Icon: IconCrane },
  { to: '/admin/areas', key: 'areas', Icon: IconMap },
  { to: '/admin/agents', key: 'agents', Icon: IconUsers },
  { to: '/admin/jobs', key: 'jobs', Icon: IconBriefcase },
  { to: '/admin/features', key: 'features', Icon: IconSparkle },
  { to: '/admin/leads', key: 'leads', Icon: IconInbox },
  { to: '/admin/admins', key: 'admins', Icon: IconShield, perm: 'Admin.Read' },
  { to: '/admin/positions', key: 'positions', Icon: IconBriefcase, perm: 'Position.Read' },
  { to: '/admin/permissions', key: 'permissions', Icon: IconKey, perm: 'Permission.Read' },
  { to: '/admin/settings', key: 'settings', Icon: IconSettings },
]

export default function AdminLayout() {
  const { user, logout, hasPermission, isMainAdmin } = useAuth()
  const { t, lang, toggleLang } = useI18n()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const visibleNav = NAV.filter(n => !n.perm || hasPermission(n.perm))

  return (
    <div className="min-h-screen bg-[#1B1C2B] text-neutral-200 flex">
      {/* sidebar */}
      {/* The off-canvas transform is mobile-only (max-lg:) so it can never fight
          lg:static — and it flips direction with the layout via the rtl: variant. */}
      <aside className={`bg-ink border-e border-white/8 flex flex-col fixed inset-y-0 z-40 w-60 transition-transform lg:static ${drawer ? 'translate-x-0' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full'}`}>
        <div className="h-16 flex items-center px-5 border-b border-white/8">
          <span className="h-serif text-lg text-white">Prime<span className="text-primary">Admin</span></span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ to, key, Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setDrawer(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'text-primary bg-white/6' : 'text-neutral-400 hover:text-white hover:bg-white/4'}`}>
              <Icon className="w-[18px] h-[18px] shrink-0" /><span>{t(`admin.nav.${key}`)}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={() => { logout(); navigate('/admin/login') }}
          className="m-4 flex items-center justify-center gap-2 border border-white/10 rounded-lg py-2.5 text-sm font-medium text-neutral-400 hover:border-primary hover:text-primary transition-colors">
          <IconLogout className="w-4 h-4" /> {t('admin.nav.logout')}
        </button>
      </aside>
      {drawer && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setDrawer(false)} />}

      {/* main */}
      <div className="flex-1 min-w-0">
        <header className="h-16 bg-ink/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-5 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/8 transition-colors" onClick={() => setDrawer(true)} aria-label={t('admin.nav.openMenu')}><IconMenu className="w-5 h-5" /></button>
            <span className="text-sm text-neutral-400 font-medium">{t('admin.nav.adminPanel')}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <button onClick={toggleLang} aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              className="border border-white/15 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-300 hover:text-white hover:border-white/40 transition-colors">
              {t('common.language')}
            </button>
            <Link to="/" className="text-primary brand-link hidden sm:inline-flex items-center gap-1 font-medium">{t('admin.nav.viewSite')} <IconArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" /></Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {user?.fullName?.[0] || 'A'}
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="text-white font-medium">{user?.fullName}</div>
                <div className="text-[11px] text-neutral-500">{isMainAdmin ? t('admin.nav.mainAdmin') : user?.positionName || t('admin.nav.admin')}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="p-5 lg:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
