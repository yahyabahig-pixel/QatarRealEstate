import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { I18nProvider } from './i18n/I18nContext'
import { UiTextSync } from './i18n/uiText'
import { DataProvider } from './store/DataContext'
import { AuthProvider } from './store/AuthContext'
import { ToastProvider } from './components/Toast'
import { PriceLabelSync } from './components/ui'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CtaBand from './components/CtaBand'
import { FloatingContact } from './components/misc'
import AssistantWidget from './assistant/AssistantWidget'

import Home from './pages/Home'
import Listings from './pages/Listings'
import PropertyDetails from './pages/PropertyDetails'
import { DevelopmentsIndex, DevelopmentDetail } from './pages/DevelopmentsPages'
import { AreasIndex, AreaDetail } from './pages/AreasPages'
import { AgentsIndex, AgentProfile } from './pages/AgentsPages'
import Careers from './pages/Careers'
import { AboutUs, ContactUs, ListProperty, NotFound } from './pages/SupportPages'
import Favourites from './pages/Favourites'

import AdminLayout from './admin/AdminLayout'
import Login from './admin/Login'
import Dashboard from './admin/Dashboard'
import PropertiesAdmin from './admin/PropertiesAdmin'
import { DevelopmentsAdmin, AreasAdmin, AgentsAdmin, JobsAdmin, FeaturesAdmin, LeadsAdmin, SettingsAdmin } from './admin/CrudPages'
import { AdminsAdmin, AdminDetail, PositionsAdmin, PositionDetail, PermissionsAdmin } from './admin/AuthAdminPages'
import { ProtectedRoute, PermissionRoute } from './admin/guards'

// ---------------------------------------------------------------------------------------
// Reset the scroll position when the user navigates.
//
// THE BUG THIS FIXES: a browser keeps the scroll offset across a client-side navigation, and
// React Router does not reset it. So clicking a link in the FOOTER — 1,700px down the page —
// loaded the new route and left the window still 1,700px down, where every page shows that
// same footer. The route had changed and the content had rendered, but the viewport looked
// identical, so the links appeared to do nothing. Typing the URL and pressing Enter "worked"
// only because a full page load starts at the top.
//
// Why the navigation TYPE matters:
//   PUSH    a link click, or a filter link that only changes the query string -> go to top.
//   REPLACE Listings.jsx rewrites the URL with { replace: true } on every filter keystroke.
//           Scrolling to top there would yank the page away mid-typing, so it is skipped.
//   POP     Back/Forward. The browser restores the previous offset itself; overriding that
//           would lose the reader's place, which is the whole point of going Back.
//
// `behavior: 'instant'` is required because index.css sets `html { scroll-behavior: smooth }`,
// which would otherwise animate a long scroll on every single navigation.
// ---------------------------------------------------------------------------------------
function ScrollToTop() {
  const { pathname, search } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType !== 'PUSH') return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, search, navigationType])

  return null
}

function PublicLayout() {
  const { pathname } = useLocation()
  const overHero = pathname === '/'
  return (
    <>
      <Navbar overHero={overHero} />
      <Outlet />
      <CtaBand />
      <Footer />
      <FloatingContact />
      {/* AI property assistant — public pages only (the admin console stays clean) */}
      <AssistantWidget />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <ScrollToTop />
            <PriceLabelSync />
            <UiTextSync />
            <Routes>
              {/* PUBLIC SITE */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/rent" element={<Listings purpose="rent" />} />
                <Route path="/buy" element={<Listings purpose="buy" />} />
                <Route path="/property/:purpose/:id" element={<PropertyDetails />} />
                <Route path="/developments" element={<DevelopmentsIndex />} />
                <Route path="/development/:slug" element={<DevelopmentDetail />} />
                <Route path="/areas" element={<AreasIndex />} />
                <Route path="/areas/:slug" element={<AreaDetail />} />
                <Route path="/find-agent" element={<AgentsIndex />} />
                <Route path="/find-agent/:slug" element={<AgentProfile />} />
                <Route path="/favourites" element={<Favourites />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/list-property" element={<ListProperty />} />
                <Route path="/off-market-opportunities" element={<Listings purpose="buy" offMarket />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* ADMIN */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="properties" element={<PermissionRoute permission="Property.Read"><PropertiesAdmin /></PermissionRoute>} />
                <Route path="developments" element={<DevelopmentsAdmin />} />
                <Route path="areas" element={<AreasAdmin />} />
                <Route path="agents" element={<AgentsAdmin />} />
                <Route path="jobs" element={<JobsAdmin />} />
                <Route path="features" element={<FeaturesAdmin />} />
                <Route path="leads" element={<LeadsAdmin />} />
                <Route path="settings" element={<SettingsAdmin />} />
                <Route path="admins" element={<PermissionRoute permission="Admin.Read"><AdminsAdmin /></PermissionRoute>} />
                <Route path="admins/:id" element={<PermissionRoute permission="Admin.Read"><AdminDetail /></PermissionRoute>} />
                <Route path="positions" element={<PermissionRoute permission="Position.Read"><PositionsAdmin /></PermissionRoute>} />
                <Route path="positions/:id" element={<PermissionRoute permission="Position.Read"><PositionDetail /></PermissionRoute>} />
                <Route path="permissions" element={<PermissionRoute permission="Permission.Read"><PermissionsAdmin /></PermissionRoute>} />
              </Route>
            </Routes>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}
