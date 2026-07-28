import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import {
  seedProperties, seedDevelopments, seedAreas, seedAgents, seedJobs,
  seedArticles, seedSettings, seedInquiries, refFor,
} from '../data/mockData'

// ---------------------------------------------------------------------------------------
// The SHARED store. The public site reads from it; the admin panel writes to it; changes
// appear on public pages immediately. In a real deployment each slice is replaced by the
// feature API services (src/api/*) — the component-facing shape stays identical.
// ---------------------------------------------------------------------------------------
const DataContext = createContext(null)
const uid = () => Math.random().toString(36).slice(2, 10)

export function DataProvider({ children }) {
  const [properties, setProperties] = useState(seedProperties)
  const [developments, setDevelopments] = useState(seedDevelopments)
  const [areas, setAreas] = useState(seedAreas)
  const [agents, setAgents] = useState(seedAgents)
  const [jobs, setJobs] = useState(seedJobs)
  const [articles, setArticles] = useState(seedArticles)
  const [inquiries, setInquiries] = useState(seedInquiries)
  const [settings, setSettings] = useState(seedSettings)
  const [recentlyViewed, setRecentlyViewed] = useState([])

  // ---- helpers used across the site --------------------------------------------------
  const areaCount = useCallback(
    (name) => properties.filter(p => p.area === name && p.status === 'available').length,
    [properties])

  const trackView = useCallback((id) => {
    setRecentlyViewed(prev => [id, ...prev.filter(x => x !== id)].slice(0, 8))
  }, [])

  const addInquiry = useCallback((inq) => {
    setInquiries(prev => [{ id: uid(), status: 'New', date: new Date().toISOString().slice(0, 10), ...inq }, ...prev])
  }, [])

  // ---- generic CRUD builders (used by the admin panel) --------------------------------
  const crud = (setter) => ({
    add: (item) => { const withId = { id: uid(), ...item }; setter(prev => [withId, ...prev]); return withId },
    update: (id, patch) => setter(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x)),
    remove: (id) => setter(prev => prev.filter(x => x.id !== id)),
  })

  const value = useMemo(() => ({
    properties, developments, areas, agents, jobs, articles, inquiries, settings, recentlyViewed,
    areaCount, trackView, addInquiry, setSettings,
    propertyActions: {
      ...crud(setProperties),
      add: (item) => {
        const n = Math.floor(1000 + Math.random() * 8999)
        const withId = { id: uid(), referenceNo: refFor(item.type, item.purpose, n), addedOn: new Date().toISOString().slice(0, 10), ...item }
        setProperties(prev => [withId, ...prev]); return withId
      },
    },
    developmentActions: crud(setDevelopments),
    areaActions: crud(setAreas),
    agentActions: {
      ...crud(setAgents),
      add: (item) => {
        const withId = { id: uid(), slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...item }
        setAgents(prev => [withId, ...prev]); return withId
      },
    },
    jobActions: crud(setJobs),
    articleActions: {
      ...crud(setArticles),
      add: (item) => {
        const withId = { id: uid(), slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60), ...item }
        setArticles(prev => [withId, ...prev]); return withId
      },
    },
    inquiryActions: crud(setInquiries),
  }), [properties, developments, areas, agents, jobs, articles, inquiries, settings, recentlyViewed, areaCount, trackView, addInquiry])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
