import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { DataProvider } from './store/DataContext'
import { AuthProvider } from './store/AuthContext'
import { ToastProvider } from './components/Toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CtaBand from './components/CtaBand'
import { FloatingContact } from './components/misc'

import Home from './pages/Home'
import Listings from './pages/Listings'
import PropertyDetails from './pages/PropertyDetails'
import { DevelopmentsIndex, DevelopmentDetail } from './pages/DevelopmentsPages'
import { AreasIndex, AreaDetail } from './pages/AreasPages'
import { AgentsIndex, AgentProfile } from './pages/AgentsPages'
import Careers from './pages/Careers'
import { LearnHub, ArticlePage } from './pages/LearnPages'
import { AboutUs, ContactUs, ListProperty, NotFound } from './pages/SupportPages'

import AdminLayout from './admin/AdminLayout'
import Login from './admin/Login'
import Dashboard from './admin/Dashboard'
import PropertiesAdmin from './admin/PropertiesAdmin'
import { DevelopmentsAdmin, AreasAdmin, AgentsAdmin, JobsAdmin, ArticlesAdmin, LeadsAdmin, SettingsAdmin } from './admin/CrudPages'
import { AdminsAdmin, AdminDetail, PositionsAdmin, PositionDetail, PermissionsAdmin } from './admin/AuthAdminPages'
import { ProtectedRoute, PermissionRoute } from './admin/guards'

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
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
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
                <Route path="/careers" element={<Careers />} />
                <Route path="/learn" element={<LearnHub />} />
                <Route path="/learn/:slug" element={<ArticlePage />} />
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
                <Route path="articles" element={<ArticlesAdmin />} />
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
    </BrowserRouter>
  )
}
