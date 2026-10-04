import { uiText } from '../i18n/uiText'
import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  seedProperties, seedDevelopments, seedAreas, seedAgents, seedJobs,
  seedSettings, seedInquiries, refFor, AMENITIES, PROPERTY_TYPES,
} from '../data/mockData'
import { guessFeatureIcon } from '../lib/featureIcons'
import { MOCK_MODE, tokenStore } from '../api/client'
import {
  publicApi, catalogApi, propertyCommand, mapFeature, NAMED_FEATURES,
  agentsAdminApi, areasAdminApi, developmentsAdminApi, jobsAdminApi,
  propertiesAdminApi, featuresAdminApi, leadsApi, leadsAdminApi, toStoredMediaUrl,
} from '../api/realEstateApi'
import { orderedMediaIds, planMediaSync } from '../lib/mediaSync'

// ---------------------------------------------------------------------------------------
// The SHARED store. The public site reads from it; the admin panel writes to it.
//
// TWO MODES, one component-facing shape:
//   MOCK (no VITE_API_URL)  — seeds + in-memory CRUD.
//   LIVE (VITE_API_URL set) — slices load from the API on mount; every admin action calls
//     the API and then re-fetches its slice, so what you see is what the database holds.
//
// NOTHING FROM mockData REACHES LIVE MODE. Every slice starts EMPTY in live mode, including
// inquiries — which used to start from three invented customers (James Whitfield, Aisha
// Rahman, Marco Bellini). An admin logging in saw "Leads 3" with those names, and the real
// enquiries only appeared after a manual page refresh, because the token lives in
// sessionStorage and the admin lists were loaded once, on mount, before anyone had logged in.
//
// STILL LOCAL IN BOTH MODES (no backend module yet): settings.
// ---------------------------------------------------------------------------------------
const DataContext = createContext(null)
const uid = () => Math.random().toString(36).slice(2, 10)

// How many rows a slice loads per request. The store used to ask for 100 and ignore
// totalCount, so listing 101 existed in the database and nowhere on the site. Now the
// loaders follow the pages until they have everything (bounded, see MAX_PAGES).
const PAGE_SIZE = 100
const MAX_PAGES = 50        // 5,000 rows is far past this brokerage's scale; a stop, not a limit

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
  // Live mode starts with NO enquiries. Real ones arrive from the API once an admin is signed
  // in; before that there is nothing to show, and showing invented people instead is worse
  // than showing an empty list.
  const [inquiries, setInquiries] = useState(MOCK_MODE ? seedInquiries : [])
  const [settings, setSettings] = useState(seedSettings)
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [loading, setLoading] = useState(!MOCK_MODE)
  const [apiError, setApiError] = useState(null)

  // ---- live loaders -------------------------------------------------------------------
  // A logged-in admin gets the unfiltered admin lists (closed jobs, deactivated agents,
  // inactive features); anonymous visitors get the public ones. Falls back to public if
  // the token lacks the permission — the public site must never break on a stale token.
  const authed = () => !!tokenStore.get()

  // Walks a paged endpoint to the end instead of taking the first page and calling it the
  // whole dataset. `fetchPage` takes { page, pageSize } and resolves to { items, totalCount }.
  const loadAllPages = useCallback(async (fetchPage) => {
    const all = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await fetchPage({ page, pageSize: PAGE_SIZE })
      const items = result?.items || []
      all.push(...items)
      const total = result?.totalCount
      if (items.length < PAGE_SIZE) break
      if (typeof total === 'number' && all.length >= total) break
    }
    return all
  }, [])

  const reloadProperties = useCallback(async () => {
    setProperties(await loadAllPages(publicApi.searchProperties))
  }, [loadAllPages])

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

  const reloadInquiries = useCallback(async () => {
    if (!authed()) { setInquiries([]); return }
    // A 403 here is normal now: enquiries are behind Lead.Read, and not every position has it.
    // An empty list is the honest answer for those admins — not an error, and not fake rows.
    const items = await loadAllPages(leadsAdminApi.list).catch(() => null)
    if (items) setInquiries(items)
  }, [loadAllPages])

  const loadAll = useCallback(async () => {
    const results = await Promise.allSettled([
      reloadProperties(), reloadAgents(), reloadAreas(), reloadDevelopments(),
      reloadJobs(), reloadFeatures(), reloadInquiries(),
      catalogApi.propertyTypes().then(setPropertyTypes),
    ])
    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length) {
      console.error('API load failed:', failed.map(f => f.reason))
      setApiError(uiText.apiLoadError)
    }
    return failed.length === 0
  }, [reloadProperties, reloadAgents, reloadAreas, reloadDevelopments,
      reloadJobs, reloadFeatures, reloadInquiries])

  useEffect(() => {
    if (MOCK_MODE) return
    let cancelled = false
    ;(async () => {
      await loadAll()
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [loadAll])

  // Re-load every slice when the SIGNED-IN IDENTITY changes.
  //
  // This is what was missing. The lists load once on mount; signing in happens later and
  // navigates inside the SPA, so nothing reloaded and the admin kept looking at the anonymous
  // view — no real enquiries, only active agents, only open jobs — until they pressed refresh.
  // Signing out has the mirror problem: another admin's data would stay on screen.
  const lastToken = useRef(MOCK_MODE ? null : tokenStore.get())
  const onIdentityChanged = useCallback(() => {
    if (MOCK_MODE) return
    const token = tokenStore.get()
    if (token === lastToken.current) return
    lastToken.current = token
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (MOCK_MODE) return undefined
    // sessionStorage is per-tab, so 'storage' does not fire for our own writes. AuthContext
    // dispatches this event itself on login and logout; the listener is here because the
    // store is what has to react to it.
    window.addEventListener('qre:auth-changed', onIdentityChanged)
    return () => window.removeEventListener('qre:auth-changed', onIdentityChanged)
  }, [onIdentityChanged])

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

  // Leads are a real backend module now. LIVE: the public form POSTs to /api/leads/*
  // and success is only reported when the API confirmed (the promise rejects otherwise —
  // callers keep the form intact and show the real error). MOCK: in-memory as before.
  const addInquiry = useCallback(async (inq) => {
    if (MOCK_MODE) {
      setInquiries(prev => [{ id: uid(), status: 'New', date: new Date().toISOString().slice(0, 10), ...inq }, ...prev])
      return
    }
    if (inq.listingRequest) await leadsApi.createListingRequest(inq)
    else await leadsApi.createInquiry(inq)
  }, [])

  // ---- mock CRUD ----------------------------------------------------------------------
  const mockCrud = (setter) => ({
    // `active` is part of the record like any other field. It used to be dropped on create,
    // so an agent or a job created as "inactive" appeared on the public site immediately.
    add: (item) => { const withId = { id: uid(), active: true, ...item }; setter(prev => [withId, ...prev]); return withId },
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
    const parts = [err?.problem?.title || err?.message || uiText.apiRejected]
    const errs = err?.errors
    if (Array.isArray(errs)) parts.push(errs.map(e => e.description || e.code).join(' '))
    else if (errs && typeof errs === 'object') parts.push(Object.values(errs).flat().join(' '))
    if (err?.status === 404) parts.push(uiText.endpointMissing)
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
    add: guard(async (form) => {
      const created = await api.create(form)
      // A record created as INACTIVE has to be deactivated right after it is created: POST
      // has no "active" field (the domain starts everything active), so without this an agent
      // or a job the admin switched off on the create form went live the moment it was saved.
      if (toggleKey && form?.[toggleKey] === false) {
        const id = created?.id ?? created
        if (id) await api.toggleActive(id, false)
      }
      await reload()
    }),
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
  // ONE selection builder for everything the property form stores as a catalog feature:
  // the amenity chips, plus Furnishing (a Text feature — its value IS the chosen word) and
  // Balcony (the "Balconies" feature, which the form already keeps inside `amenities`).
  // "N/A" furnishing means "don't record it", so the feature is left off rather than
  // stored as the literal string. Names the catalog doesn't know are dropped, which is
  // what stops a stale chip from 400-ing the whole save.
  //
  // A feature the listing ALREADY carries keeps its stored value. Every non-furnishing
  // feature used to be sent as the literal 'Yes', so a Number feature that read
  // "Balconies: 4" came back as "Balconies: Yes" after any unrelated save.
  const toFeatureSelection = (form = {}, existing = []) => {
    const valueByName = Object.fromEntries((existing || []).map(f => [f.name, f.value]))
    const names = new Set(form.amenities || [])
    if (form.furnishing && form.furnishing !== 'N/A') names.add(NAMED_FEATURES.FURNISHING)
    else names.delete(NAMED_FEATURES.FURNISHING)
    return [...names]
      .map(name => featureIdByName[name] && ({
        featureId: featureIdByName[name],
        value: name === NAMED_FEATURES.FURNISHING
          ? form.furnishing
          : (valueByName[name] ?? 'Yes'),
      }))
      .filter(Boolean)
  }

  // Two selections are the same when they attach the same features with the same values,
  // order aside. The admin form submits the WHOLE record on save, so 'amenities' is present
  // in every patch even when the user only flipped Exclusive -- and a pointless PUT is a
  // pointless way to fail.
  const sameSelection = (a, b) => {
    const key = (sel) => sel.map(s => `${s.featureId}=${s.value ?? ''}`).sort().join('|')
    return key(a) === key(b)
  }

  const livePropertyActions = {
    // NOT wrapped in `guard`, because this one needs to report the id even when it fails.
    //
    // Creating a listing is up to five requests: create, media, features, publish, feature.
    // Request one produces a real row in the database. If request three then fails — a
    // feature that no longer exists, an expired token, a dropped connection — the old code
    // surfaced the error and left the form believing it was still creating something. The
    // admin fixed the field, pressed Save, and got a SECOND draft; a third attempt, a third
    // draft. The id travels back on the failure path too, so the form can switch itself
    // into edit mode and the next Save updates the row that already exists.
    add: async (form) => {
      let id = null
      try {
        const created = await propertiesAdminApi.create(propertyCommand(form, typeIdByName, areaIdByName))
        id = created?.id ?? created
        if (form.images?.length) {
          // toStoredMediaUrl for the same reason as in update(): store the relative path, so
          // the photo keeps working when the site moves from an IP to a domain. Everything
          // the uploader hands the form here is already relative — this is what keeps that
          // true if a URL ever arrives by another route.
          await propertiesAdminApi.addMedia(id, form.images.map((src, i) => ({
            url: toStoredMediaUrl(src),
            mediaType: 'Image', width: 1200, height: 800, order: i, isPrimary: i === 0,
          })))
        }
        const sel = toFeatureSelection(form)
        if (sel.length) await propertiesAdminApi.setFeatures(id, sel)
        if (form.status === 'available') await propertiesAdminApi.publication(id, 'Publish')
        // Exclusive = the domain's IsFeatured. Must come AFTER publish — the backend only
        // features published listings (a draft marked exclusive is simply not promoted yet).
        if (form.exclusive && form.status === 'available') {
          await propertiesAdminApi.setFeatured(id, true)
        }
        await reloadProperties()
        return { ok: true, value: { id } }
      } catch (err) {
        console.error(err)
        // The half-finished draft is real: put it in the table so it is visible and can be
        // finished or deleted rather than sitting there invisibly.
        if (id) await reloadProperties().catch(() => {})
        return { ok: false, error: describeError(err), status: err?.status, createdId: id }
      }
    },
    update: guard(async (id, patch) => {
      // The admin endpoint: a draft has to be loadable, and the real figure behind
      // "price on request" has to come back, neither of which the public endpoint does.
      const current = await propertiesAdminApi.details(id)
      const merged = { ...current, ...patch }
      await propertiesAdminApi.update(id, propertyCommand(merged, typeIdByName, areaIdByName))
      if ('amenities' in patch || 'furnishing' in patch) {
        const selection = toFeatureSelection(merged, current.features)
        if (!sameSelection(toFeatureSelection(current, current.features), selection)) {
          await propertiesAdminApi.setFeatures(id, selection)
        }
      }
      if ('images' in patch) {
        // planMediaSync normalises both sides to the STORED shape before comparing them.
        // See lib/mediaSync.js for why that matters; in short, the form holds rendered
        // (absolute) urls for photos already on the listing and relative ones for photos
        // added in this session, while media[].url is always the stored value.
        const { wanted, added, removed } = planMediaSync(patch.images, current.media)

        // ADD BEFORE REMOVE, deliberately. These are separate requests with no transaction
        // around them, so one can fail with the other already done. Removing first means an
        // expired token between the two leaves the listing with NO photos; adding first
        // leaves it with one too many, which an admin can see and fix. Neither order is
        // atomic; only one of them can lose the originals.
        if (added.length) {
          await propertiesAdminApi.addMedia(id, added.map((url, i) => ({
            url, mediaType: 'Image', width: 1200, height: 800,
            order: (current.media?.length || 0) + i, isPrimary: false,
          })))
        }
        for (const m of removed) await propertiesAdminApi.removeMedia(id, m.id)

        // ...and then set the ORDER the admin arranged, which comparing by URL cannot see.
        // Without this the reorder arrows did nothing and the cover photo never changed.
        const after = await propertiesAdminApi.details(id)
        const orderedIds = orderedMediaIds(wanted, after.media)
        if (orderedIds) await propertiesAdminApi.reorderMedia(id, orderedIds)
      }
      if ('status' in patch && patch.status !== current.status) {
        const action = { available: 'Publish', sold: 'MarkSold', rented: 'MarkRented', draft: 'Unpublish' }[patch.status]
        if (action) await propertiesAdminApi.publication(id, action)
        else if (patch.status === 'archived') await propertiesAdminApi.archive(id)
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
    // PERMANENT delete (backend DELETE /api/admin/properties/{id}); archiving is a
    // status change handled by the admin page's status dropdown, not by remove().
    remove: guard(async (id) => { await propertiesAdminApi.remove(id); await reloadProperties() }),
  }

  const value = useMemo(() => ({
    properties, developments, areas, agents, jobs, jobDepartments, features, propertyTypes,
    inquiries, settings, recentlyViewed,
    // Name → id lookups. The public pages need them to turn what a visitor clicked (an
    // amenity chip labelled "Pool", a type chip labelled "Villa") into the ids the search
    // endpoint filters by. Without them those filters can only run in the browser, over a
    // list DTO that carries neither amenities nor furnishing — which is why they matched
    // nothing at all in live mode.
    typeIdByName, featureIdByName, areaIdByName,
    loading, apiError, clearApiError: () => setApiError(null),
    areaCount, trackView, addInquiry, setSettings,
    // Refresh the shared public slice after direct admin API calls (no-op in mock mode).
    reloadProperties: MOCK_MODE ? () => {} : reloadProperties,
    reloadInquiries: MOCK_MODE ? () => {} : reloadInquiries,

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
            const withId = { id: uid(), active: true, slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...item }
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

    inquiryActions: MOCK_MODE
      ? mockCrud(setInquiries)
      : {
          add: () => {},   // public intake goes through addInquiry
          update: guard(async (id, patch) => {
            if ('status' in patch) await leadsAdminApi.setStatus(id, patch.status)
            await reloadInquiries()
          }),
          remove: guard(async (id) => { await leadsAdminApi.remove(id); await reloadInquiries() }),
        },
  }), [properties, developments, areas, agents, jobs, jobDepartments, features, propertyTypes,
       inquiries, settings, recentlyViewed, loading, apiError, areaCount, trackView, addInquiry,
       typeIdByName, featureIdByName, areaIdByName,
       reloadProperties, reloadAgents, reloadAreas, reloadDevelopments, reloadJobs, reloadFeatures, reloadInquiries])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
