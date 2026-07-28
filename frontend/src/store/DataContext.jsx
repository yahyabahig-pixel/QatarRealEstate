import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  seedProperties, seedDevelopments, seedAreas, seedAgents, seedJobs,
  seedSettings, seedInquiries, refFor, AMENITIES, PROPERTY_TYPES,
} from '../data/mockData'
import { guessFeatureIcon } from '../lib/featureIcons'
import { MOCK_MODE, tokenStore } from '../api/client'
import {
  publicApi, catalogApi, propertyCommand, mapFeature,
  agentsAdminApi, areasAdminApi, developmentsAdminApi, jobsAdminApi,
  propertiesAdminApi, featuresAdminApi,
} from '../api/realEstateApi'

// ---------------------------------------------------------------------------------------
// The SHARED store. The public site reads from it; the admin panel writes to it.
//
// TWO MODES, one component-facing shape:
//   MOCK (no VITE_API_URL)  — seeds + in-memory CRUD.
//   LIVE (VITE_API_URL set) — slices load from the API on mount; every admin action calls
//     the API and then re-fetches its slice, so what you see is what the database holds.
//
// STILL LOCAL IN BOTH MODES (no backend module yet — deliberately, they're next):
//   settings, inquiries.
// Articles were removed from the application entirely.
// ---------------------------------------------------------------------------------------
const DataContext = createContext(null)
const uid = () => Math.random().toString(36).slice(2, 10)

// Mock features derive from the old hardcoded amenity list, shaped like FeatureAdminDto.
const mockFeatures = AMENITIES.map((name, i) => ({
  id: `f${i + 1}`, name, valueType: 'Boolean', icon: guessFeatureIcon(name), active: true,
}))

export function DataProvider({ children }) {
  const [properties, setProperties] = useState(MOCK_MODE ? seedProperties : [])
  const [developments, setDevelopments] = useState(MOCK_MODE ? seedDevelopments : [])
  const [areas, setAreas] = useState(MOCK_MODE ? seedAreas : [])
  const [agents, setAgents] = useState(MOCK_MODE ? seedAgents : [])
  const [jobs, setJobs] = useState(MOCK_MODE ? seedJobs : [])
  const [jobDepartments, setJobDepartments] = useState(
    MOCK_MODE ? [...new Set(seedJobs.filter(j => j.active).map(j => j.department))].sort() : [])
  const [features, setFeatures] = useState(MOCK_MODE ? mockFeatures : [])
  const [propertyTypes, setPropertyTypes] = useState(
    MOCK_MODE ? PROPERTY_TYPES.map(n => ({ id: n, name: n })) : [])
  const [inquiries, setInquiries] = useState(seedInquiries)
  const [settings, setSettings] = useState(seedSettings)
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [loading, setLoading] = useState(!MOCK_MODE)
  const [apiError, setApiError] = useState(null)

  // ---- live loaders -------------------------------------------------------------------
  // A logged-in admin gets the unfiltered admin lists (closed jobs, deactivated agents,
  // inactive features); anonymous visitors get the public ones. Falls back to public if
  // the token lacks the permission — the public site must never break on a stale token.
  const authed = () => !!tokenStore.get()

  const reloadProperties = useCallback(async () => {
    const page = await publicApi.searchProperties({ pageSize: 100 })
    setProperties(page.items)
  }, [])

  const reloadAgents = useCallback(async () => {
    setAgents(authed()
      ? await agentsAdminApi.list().catch(() => publicApi.agents())
      : await publicApi.agents())
  }, [])

  const reloadAreas = useCallback(async () => {
    setAreas(await publicApi.areas())     // AreaDto is identical on both sides
  }, [])

  const reloadDevelopments = useCallback(async () => {
    setDevelopments(await publicApi.developments())
  }, [])

  const reloadJobs = useCallback(async () => {
    setJobs(authed()
      ? await jobsAdminApi.list().catch(() => publicApi.jobs())
      : await publicApi.jobs())
    setJobDepartments(await publicApi.jobDepartments().catch(() => []))
  }, [])

  const reloadFeatures = useCallback(async () => {
    setFeatures(authed()
      ? await featuresAdminApi.list().catch(async () => (await catalogApi.features()).map(mapFeature))
      : (await catalogApi.features()).map(mapFeature))
  }, [])

  useEffect(() => {
    if (MOCK_MODE) return
    let cancelled = false
    ;(async () => {
      const results = await Promise.allSettled([
        reloadProperties(), reloadAgents(), reloadAreas(), reloadDevelopments(),
        reloadJobs(), reloadFeatures(),
        catalogApi.propertyTypes().then(ts => !cancelled && setPropertyTypes(ts)),
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
  }, [reloadProperties, reloadAgents, reloadAreas, reloadDevelopments, reloadJobs, reloadFeatures])

  // Name → id lookups the property form mapper needs (see realEstateApi.propertyCommand).
  const typeIdByName = useMemo(
    () => Object.fromEntries(propertyTypes.map(t => [t.name, t.id])), [propertyTypes])
  const featureIdByName = useMemo(
    () => Object.fromEntries(features.map(f => [f.name, f.id])), [features])
  const areaIdByName = useMemo(
    () => Object.fromEntries(areas.map(a => [a.name, a.id])), [areas])

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

  // ---- mock CRUD ----------------------------------------------------------------------
  const mockCrud = (setter) => ({
    add: (item) => { const withId = { id: uid(), ...item }; setter(prev => [withId, ...prev]); return withId },
    update: (id, patch) => setter(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x)),
    remove: (id) => setter(prev => prev.filter(x => x.id !== id)),
  })

  // ---- live CRUD ----------------------------------------------------------------------
  // Same call signatures the admin pages already use: add(form), update(id, patch),
  // remove(id). Each action hits the API, then re-fetches the slice — the store never
  // guesses at what the database did.
  //
  // RESULT CONTRACT: every guarded action resolves to { ok: true, value } only after the
  // backend confirmed success, or { ok: false, error } with the backend's real message
  // (ProblemDetails title + validation details). It never throws — pages await the
  // result, keep their form open on failure, and only announce success on ok: true.
  const describeError = (err) => {
    const parts = [err?.problem?.title || err?.message || 'The API rejected the request.']
    const errs = err?.errors
    if (Array.isArray(errs)) parts.push(errs.map(e => e.description || e.code).join(' '))
    else if (errs && typeof errs === 'object') parts.push(Object.values(errs).flat().join(' '))
    if (err?.status === 404) parts.push('(The endpoint was not found — is the backend running the latest build?)')
    return parts.filter(Boolean).join('\n')
  }

  const guard = (fn) => async (...args) => {
    try {
      const value = await fn(...args)
      return { ok: true, value }
    } catch (err) {
      console.error(err)
      return { ok: false, error: describeError(err), status: err?.status }
    }
  }

  const liveCrud = (api, reload, rows, { toggleKey } = {}) => ({
    add: guard(async (form) => { await api.create(form); await reload() }),
    update: guard(async (id, patch) => {
      const current = rows.find(x => x.id === id) || {}
      const merged = { ...current, ...patch }
      const keys = Object.keys(patch)
      // A lone active-flag flip goes to the dedicated toggle endpoint, not a full PUT.
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
  // Two amenity selections are the same when they name the same features, order aside.
  // The admin form submits the WHOLE record on save, so 'amenities' is present in every
  // patch even when the user only flipped Exclusive -- and a pointless PUT is a pointless
  // way to fail.
  const sameAmenities = (a, b) => {
    const left = [...(a || [])].sort()
    const right = [...(b || [])].sort()
    return left.length === right.length && left.every((name, i) => name === right[i])
  }

  const toFeatureSelection = (names = []) => names
    .map(name => featureIdByName[name] && ({ featureId: featureIdByName[name], value: 'Yes' }))
    .filter(Boolean)

  const livePropertyActions = {
    add: guard(async (form) => {
      const created = await propertiesAdminApi.create(propertyCommand(form, typeIdByName, areaIdByName))
      const id = created?.id ?? created
      if (form.images?.length) {
        await propertiesAdminApi.addMedia(id, form.images.map((url, i) => ({
          url, mediaType: 'Image', width: 1200, height: 800, order: i, isPrimary: i === 0,
        })))
      }
      if (form.amenities?.length) {
        const sel = toFeatureSelection(form.amenities)
        if (sel.length) await propertiesAdminApi.setFeatures(id, sel)
      }
      if (form.status === 'available') await propertiesAdminApi.publication(id, 'Publish')
      // Exclusive = the domain's IsFeatured. Must come AFTER publish — the backend only
      // features published listings (a draft marked exclusive is simply not promoted yet).
      if (form.exclusive && form.status === 'available') {
        await propertiesAdminApi.setFeatured(id, true)
      }
      await reloadProperties()
      return { id }
    }),
    update: guard(async (id, patch) => {
      const current = await propertiesAdminApi.details(id)
      const merged = { ...current, ...patch }
      await propertiesAdminApi.update(id, propertyCommand(merged, typeIdByName, areaIdByName))
      if ('amenities' in patch && !sameAmenities(current.amenities, patch.amenities)) {
        await propertiesAdminApi.setFeatures(id, toFeatureSelection(merged.amenities))
      }
      if ('images' in patch) {
        // Sync media by URL: remove what the admin removed, add what they added.
        const keep = new Set(patch.images)
        const removed = (current.media || []).filter(m => !keep.has(m.url))
        const existing = new Set((current.media || []).map(m => m.url))
        const added = patch.images.filter(u => !existing.has(u))
        for (const m of removed) await propertiesAdminApi.removeMedia(id, m.id)
        if (added.length) {
          await propertiesAdminApi.addMedia(id, added.map((url, i) => ({
            url, mediaType: 'Image', width: 1200, height: 800,
            order: (current.media?.length || 0) + i, isPrimary: false,
          })))
        }
      }
      if ('status' in patch && patch.status !== current.status) {
        const action = { available: 'Publish', sold: 'MarkSold', rented: 'MarkRented', draft: 'Unpublish' }[patch.status]
        if (action) await propertiesAdminApi.publication(id, action)
      }
      // Exclusive = IsFeatured, applied AFTER any publication change so "publish + feature"
      // in one save works. Featuring a non-published listing is skipped (backend would 409);
      // unfeaturing always goes through.
      if ('exclusive' in patch && patch.exclusive !== current.exclusive) {
        const nowPublished = (patch.status ?? current.status) === 'available'
        if (!patch.exclusive || nowPublished) {
          await propertiesAdminApi.setFeatured(id, patch.exclusive)
        }
      }
      await reloadProperties()
    }),
    remove: guard(async (id) => { await propertiesAdminApi.archive(id); await reloadProperties() }),
  }

  const value = useMemo(() => ({
    properties, developments, areas, agents, jobs, jobDepartments, features, propertyTypes,
    inquiries, settings, recentlyViewed,
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
      : liveCrud(developmentsAdminApi, reloadDevelopments, developments),

    areaActions: MOCK_MODE
      ? mockCrud(setAreas)
      : liveCrud(areasAdminApi, reloadAreas, areas),

    agentActions: MOCK_MODE
      ? {
          ...mockCrud(setAgents),
          add: (item) => {
            const withId = { id: uid(), slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...item }
            setAgents(prev => [withId, ...prev]); return withId
          },
        }
      : liveCrud(agentsAdminApi, reloadAgents, agents, { toggleKey: 'active' }),

    jobActions: MOCK_MODE
      ? mockCrud(setJobs)
      : liveCrud(jobsAdminApi, reloadJobs, jobs, { toggleKey: 'active' }),

    featureActions: MOCK_MODE
      ? mockCrud(setFeatures)
      : liveCrud(featuresAdminApi, reloadFeatures, features, { toggleKey: 'active' }),

    // No backend module yet — in-memory in both modes, on purpose.
    inquiryActions: mockCrud(setInquiries),
  }), [properties, developments, areas, agents, jobs, jobDepartments, features, propertyTypes,
       inquiries, settings, recentlyViewed, loading, apiError, areaCount, trackView, addInquiry,
       typeIdByName, featureIdByName, areaIdByName,
       reloadProperties, reloadAgents, reloadAreas, reloadDevelopments, reloadJobs, reloadFeatures])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
