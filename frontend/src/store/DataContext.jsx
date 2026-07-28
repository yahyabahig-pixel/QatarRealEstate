import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  seedProperties, seedDevelopments, seedAreas, seedAgents, seedJobs,
  seedArticles, seedSettings, seedInquiries, refFor,
} from '../data/mockData'
import { MOCK_MODE, tokenStore } from '../api/client'
import {
  publicApi, catalogApi, propertyCommand,
  agentsAdminApi, areasAdminApi, developmentsAdminApi, jobsAdminApi, propertiesAdminApi,
} from '../api/realEstateApi'

// ---------------------------------------------------------------------------------------
// The SHARED store. The public site reads from it; the admin panel writes to it.
//
// TWO MODES, one component-facing shape:
//   MOCK (no VITE_API_URL)  — seeds + in-memory CRUD, exactly as before.
//   LIVE (VITE_API_URL set) — slices load from the API on mount; every admin action calls
//     the API and then re-fetches its slice, so what you see is what the database holds.
//
// STILL LOCAL IN BOTH MODES (no backend module yet — deliberately, they're next):
//   settings, articles, inquiries.
// ---------------------------------------------------------------------------------------
const DataContext = createContext(null)
const uid = () => Math.random().toString(36).slice(2, 10)

export function DataProvider({ children }) {
  const [properties, setProperties] = useState(MOCK_MODE ? seedProperties : [])
  const [developments, setDevelopments] = useState(MOCK_MODE ? seedDevelopments : [])
  const [areas, setAreas] = useState(MOCK_MODE ? seedAreas : [])
  const [agents, setAgents] = useState(MOCK_MODE ? seedAgents : [])
  const [jobs, setJobs] = useState(MOCK_MODE ? seedJobs : [])
  const [jobDepartments, setJobDepartments] = useState(
    MOCK_MODE ? [...new Set(seedJobs.filter(j => j.active).map(j => j.department))].sort() : [])
  const [articles, setArticles] = useState(seedArticles)
  const [inquiries, setInquiries] = useState(seedInquiries)
  const [settings, setSettings] = useState(seedSettings)
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [loading, setLoading] = useState(!MOCK_MODE)
  const [apiError, setApiError] = useState(null)

  // Catalogs (live only): name → id lookups the property form mapper needs.
  const [typeIdByName, setTypeIdByName] = useState({})
  const [featureIdByName, setFeatureIdByName] = useState({})

  // ---- live loaders -------------------------------------------------------------------
  // A logged-in admin gets the unfiltered admin lists (closed jobs, deactivated agents);
  // anonymous visitors get the public ones. Falls back to public if the token lacks the
  // permission — the public site must never break because an admin token went stale.
  const authed = () => !!tokenStore.get()

  const reloadProperties = useCallback(async () => {
    const page = await publicApi.searchProperties({ pageSize: 100 })
    setProperties(page.items)
  }, [])

  const reloadAgents = useCallback(async () => {
    const list = authed()
      ? await agentsAdminApi.list().catch(() => publicApi.agents())
      : await publicApi.agents()
    setAgents(list)
  }, [])

  const reloadAreas = useCallback(async () => {
    setAreas(await publicApi.areas())     // AreaDto is identical on both sides
  }, [])

  const reloadDevelopments = useCallback(async () => {
    setDevelopments(await publicApi.developments())
  }, [])

  const reloadJobs = useCallback(async () => {
    const list = authed()
      ? await jobsAdminApi.list().catch(() => publicApi.jobs())
      : await publicApi.jobs()
    setJobs(list)
    setJobDepartments(await publicApi.jobDepartments().catch(() => []))
  }, [])

  useEffect(() => {
    if (MOCK_MODE) return
    let cancelled = false
    ;(async () => {
      const results = await Promise.allSettled([
        reloadProperties(), reloadAgents(), reloadAreas(), reloadDevelopments(), reloadJobs(),
        catalogApi.propertyTypes().then(ts => !cancelled &&
          setTypeIdByName(Object.fromEntries(ts.map(t => [t.name, t.id])))),
        catalogApi.features().then(fs => !cancelled &&
          setFeatureIdByName(Object.fromEntries(fs.map(f => [f.name, f.id])))),
      ])
      if (cancelled) return
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length) {
        console.error('API load failed:', failed.map(f => f.reason))
        setApiError('Some data could not be loaded from the API. Is the backend running?')
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [reloadProperties, reloadAgents, reloadAreas, reloadDevelopments, reloadJobs])

  // ---- helpers used across the site --------------------------------------------------
  const areaCount = useCallback(
    (name) => MOCK_MODE
      ? properties.filter(p => p.area === name && p.status === 'available').length
      : (areas.find(a => a.name === name)?.propertyCount ?? 0),
    [properties, areas])

  const trackView = useCallback((id) => {
    setRecentlyViewed(prev => [id, ...prev.filter(x => x !== id)].slice(0, 8))
    if (!MOCK_MODE) publicApi.recordView(id)     // real ViewsCount++, fire-and-forget
  }, [])

  const addInquiry = useCallback((inq) => {
    setInquiries(prev => [{ id: uid(), status: 'New', date: new Date().toISOString().slice(0, 10), ...inq }, ...prev])
  }, [])

  // ---- mock CRUD (unchanged) ----------------------------------------------------------
  const mockCrud = (setter) => ({
    add: (item) => { const withId = { id: uid(), ...item }; setter(prev => [withId, ...prev]); return withId },
    update: (id, patch) => setter(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x)),
    remove: (id) => setter(prev => prev.filter(x => x.id !== id)),
  })

  // ---- live CRUD ----------------------------------------------------------------------
  // Same call signatures the admin pages already use: add(form), update(id, patch),
  // remove(id). Each action hits the API, then re-fetches the slice — the store never
  // guesses at what the database did. Errors land in apiError instead of exploding
  // in a component that never awaited the promise.
  const guard = (fn) => (...args) =>
    fn(...args).catch(err => {
      console.error(err)
      setApiError(err?.problem?.title || err?.message || 'The API rejected the request.')
    })

  const liveCrud = (api, reload, { toggleKey } = {}) => ({
    add: guard(async (form) => { await api.create(form); await reload() }),
    update: guard(async (id, patch) => {
      const current = (({ agents, areas, developments, jobs }) =>
        [...agents, ...areas, ...developments, ...jobs])({ agents, areas, developments, jobs })
        .find(x => x.id === id) || {}
      const merged = { ...current, ...patch }
      // A lone active-flag flip goes to the dedicated toggle endpoint, not a full PUT.
      const keys = Object.keys(patch)
      if (toggleKey && keys.length === 1 && keys[0] === toggleKey) {
        await api.toggleActive(id, patch[toggleKey])
      } else {
        await api.update(id, merged)
        if (toggleKey && toggleKey in patch && patch[toggleKey] !== current[toggleKey]) {
          await api.toggleActive(id, patch[toggleKey])
        }
      }
      await reload()
    }),
    remove: guard(async (id) => { await api.remove(id); await reload() }),
  })

  // Properties speak a different dialect (see realEstateApi.propertyCommand) and have a
  // richer lifecycle: create → attach media → set amenities → publish. No hard delete on
  // the backend — remove() archives, which is the domain-correct end of a listing.
  const livePropertyActions = {
    add: guard(async (form) => {
      const created = await propertiesAdminApi.create(propertyCommand(form, typeIdByName, areaIdByName()))
      const id = created?.id ?? created
      if (form.images?.length) {
        await propertiesAdminApi.addMedia(id, form.images.map((url, i) => ({
          url, mediaType: 'Image', width: 1200, height: 800, order: i, isPrimary: i === 0,
        })))
      }
      if (form.amenities?.length) {
        const sel = form.amenities
          .map(name => featureIdByName[name] && ({ featureId: featureIdByName[name], value: 'Yes' }))
          .filter(Boolean)
        if (sel.length) await propertiesAdminApi.setFeatures(id, sel)
      }
      if (form.status === 'available') await propertiesAdminApi.publication(id, 'Publish')
      await reloadProperties()
      return { id }
    }),
    update: guard(async (id, patch) => {
      const current = await propertiesAdminApi.details(id)
      const merged = { ...current, ...patch }
      await propertiesAdminApi.update(id, propertyCommand(merged, typeIdByName, areaIdByName()))
      if ('amenities' in patch) {
        const sel = merged.amenities
          .map(name => featureIdByName[name] && ({ featureId: featureIdByName[name], value: 'Yes' }))
          .filter(Boolean)
        await propertiesAdminApi.setFeatures(id, sel)
      }
      if ('status' in patch && patch.status !== current.status) {
        const action = { available: 'Publish', sold: 'MarkSold', rented: 'MarkRented', draft: 'Unpublish' }[patch.status]
        if (action) await propertiesAdminApi.publication(id, action)
      }
      await reloadProperties()
    }),
    remove: guard(async (id) => { await propertiesAdminApi.archive(id); await reloadProperties() }),
  }
  const areaIdByName = () => Object.fromEntries(areas.map(a => [a.name, a.id]))

  const value = useMemo(() => ({
    properties, developments, areas, agents, jobs, jobDepartments,
    articles, inquiries, settings, recentlyViewed,
    loading, apiError, clearApiError: () => setApiError(null),
    areaCount, trackView, addInquiry, setSettings,

    propertyActions: MOCK_MODE
      ? {
          ...mockCrud(setProperties),
          add: (item) => {
            const n = Math.floor(1000 + Math.random() * 8999)
            const withId = { id: uid(), referenceNo: refFor(item.type, item.purpose, n), addedOn: new Date().toISOString().slice(0, 10), ...item }
            setProperties(prev => [withId, ...prev]); return withId
          },
        }
      : livePropertyActions,

    developmentActions: MOCK_MODE
      ? mockCrud(setDevelopments)
      : liveCrud(developmentsAdminApi, reloadDevelopments),

    areaActions: MOCK_MODE
      ? mockCrud(setAreas)
      : liveCrud(areasAdminApi, reloadAreas),

    agentActions: MOCK_MODE
      ? {
          ...mockCrud(setAgents),
          add: (item) => {
            const withId = { id: uid(), slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...item }
            setAgents(prev => [withId, ...prev]); return withId
          },
        }
      : liveCrud(agentsAdminApi, reloadAgents, { toggleKey: 'active' }),

    jobActions: MOCK_MODE
      ? mockCrud(setJobs)
      : liveCrud(jobsAdminApi, reloadJobs, { toggleKey: 'active' }),

    // No backend modules yet for these three — in-memory in both modes, on purpose.
    articleActions: {
      ...mockCrud(setArticles),
      add: (item) => {
        const withId = { id: uid(), slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60), ...item }
        setArticles(prev => [withId, ...prev]); return withId
      },
    },
    inquiryActions: mockCrud(setInquiries),
  }), [properties, developments, areas, agents, jobs, jobDepartments, articles, inquiries,
       settings, recentlyViewed, loading, apiError, areaCount, trackView, addInquiry,
       typeIdByName, featureIdByName,
       reloadProperties, reloadAgents, reloadAreas, reloadDevelopments, reloadJobs])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
