import { API_URL, http, qs } from './client'

// ---------------------------------------------------------------------------------------
// Real API bindings for the RealEstate module + mappers between backend DTOs and the UI
// shapes the components were built against (mockData.js). The mapping lives HERE, in one
// file, so the components never learn backend field names — swap-friendly by design.
//
//   backend AgentDto { jobTitle, photoUrl, whatsApp, isActive }
//   UI agent         { title,    photo,    whatsapp, active   }
//
// Enums arrive as strings ("Sale", "Published") because the API registers
// JsonStringEnumConverter.
// ---------------------------------------------------------------------------------------

// ---- media URLs ------------------------------------------------------------------------
//
// An uploaded photo is STORED as a relative path: "/api/media/images/{id}". It used to be
// stored as an absolute URL built from whatever address the bundle happened to be built
// against — so every photo uploaded while the site ran on http://<ip> kept pointing at
// http://<ip> after the move to a domain, and the browser blocked all of them as mixed
// content. A relative path follows the site wherever it goes.
//
// resolveMediaUrl turns what is STORED into what a browser should REQUEST, and leaves
// anything absolute (Unsplash, an old row not yet migrated) exactly as it is.
export const resolveMediaUrl = (url) => {
  if (!url) return url
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url
  if (!url.startsWith('/')) return url
  return `${API_URL}${url}`
}

// ---- backend → UI mappers -------------------------------------------------------------

const kindToPurpose = (k) => (k === 'Sale' ? 'buy' : 'rent')
const purposeToKind = (p) => (p === 'buy' ? 'Sale' : 'Rent')

const statusToUi = (s) => ({
  Published: 'available',
  Draft: 'draft',
  Sold: 'sold',
  Rented: 'rented',
  Archived: 'archived',
}[s] || String(s || '').toLowerCase())

export const mapAgent = (a) => ({
  id: a.id, name: a.name, title: a.jobTitle, photo: resolveMediaUrl(a.photoUrl), slug: a.slug,
  photoStored: a.photoUrl,     // what to send back on save; `photo` is for rendering
  phone: a.phone, whatsapp: a.whatsApp, email: a.email, rating: a.rating,
  bio: a.bio, active: a.isActive,
})

export const mapArea = (a) => ({
  id: a.id, name: a.name, slug: a.slug, photo: resolveMediaUrl(a.photoUrl), intro: a.intro,
  photoStored: a.photoUrl,
  propertyCount: a.propertyCount,          // computed by the backend — no client counting
})

export const mapDevelopment = (d) => {
  // Same Location dialect as properties: x = LONGITUDE, y = LATITUDE, strings.
  // 0/0 is the legacy "no exact location yet" placeholder, not an address.
  const loc = d.location || null
  const lng = loc ? Number(loc.x) : NaN
  const lat = loc ? Number(loc.y) : NaN
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
  return {
    id: d.id, name: d.name, slug: d.slug,
    // Human-readable label for cards, chips and headers — never raw coordinates.
    area: loc ? ([loc.street || loc.state, loc.city].filter(Boolean).join(', ') || loc.city) : (d.areaName || ''),
    city: loc?.city || '', street: loc?.street || '', locState: loc?.state || '',
    locCountry: loc?.country || 'Qatar', locDescription: loc?.description || '',
    lat: hasCoords ? lat : null, lng: hasCoords ? lng : null,
    x: hasCoords ? String(lng) : '', y: hasCoords ? String(lat) : '',
    deliveryYear: d.deliveryYear,
    coverImage: resolveMediaUrl(d.coverImageUrl), coverImageStored: d.coverImageUrl,
    description: d.description, unitsCount: d.unitsCount,
    developer: d.developerName, startingPrice: d.startingPrice, paymentPlan: d.paymentPlan,
  }
}

export const mapJob = (j) => ({
  id: j.id, title: j.title, department: j.department, type: j.employmentType,
  location: j.location, description: j.description, active: j.isActive,
})

// Search results are intentionally thin on the backend (one SQL row per card).
// Fields the card shape has but the list DTO doesn't (district, amenities, agentId)
// come back empty here and fully populated on the details page.
export const mapPropertyListItem = (p) => ({
  id: p.id,
  referenceNo: `QP-${String(p.id).slice(0, 8).toUpperCase()}`,
  title: p.title,
  purpose: kindToPurpose(p.listingKind),
  status: statusToUi(p.status),
  // null (not 0) when the price is withheld: the API sends no figure at all for a
  // "price on request" listing, and 0 would render as "QAR 0".
  price: p.priceOnRequest ? null : (p.offerPrice ?? p.price ?? 0),
  originalPrice: p.offerPrice != null ? p.price : null,
  currency: p.currency || 'QAR',
  // The real flag now, not "we couldn't see a price". A listing always has terms --
  // the aggregate requires them -- so a missing amount was never the right signal.
  priceOnRequest: !!p.priceOnRequest,
  city: p.city,
  bedrooms: p.numberOfRooms,
  bathrooms: p.bathrooms,
  sizeSqm: Number(p.areaInSquareMeters) || 0,
  images: p.coverImageUrl ? [resolveMediaUrl(p.coverImageUrl)] : [],
  exclusive: !!p.isFeatured,
  offPlan: !!p.isOffPlan,
  // These four used to be hardcoded empty, which is why filtering by area, type or agent in
  // the browser matched nothing at all: every card claimed to have no area, no type and no
  // agent. The API sends them now; the pages that need MORE than a name filter on the server.
  type: p.propertyTypeName || '',
  typeId: p.propertyTypeId || null,
  area: p.areaName || '',
  areaId: p.areaId || null,
  district: p.district || '',
  agentId: p.agentId || null,
  // Amenities are still absent by design: a list endpoint stays one SQL row per card, so
  // amenity filtering is a server-side query (?featureIds=…), not a client-side scan.
  amenities: [],
  balcony: false, furnishing: '',
  addedOn: '',
})

// GET /api/properties/map returns its own slim row: only what a pin and a compact
// card need. It is NOT PropertyListItem -- there are no bathrooms, amenities or gallery
// here, which is exactly why the split view has its own card component.
export const mapPropertyMapItem = (p) => ({
  id: p.id,
  title: p.title,
  area: p.area || '',
  price: p.price ?? null,
  priceOnRequest: !!p.priceOnRequest,
  currency: p.currency || 'QAR',
  beds: p.beds ?? 0,
  bathrooms: p.bathrooms ?? 0,
  type: p.propertyType || '',
  sizeM2: Number(p.sizeM2) || 0,
  lat: p.lat,
  lng: p.lng,
  thumbUrl: p.thumbUrl ? resolveMediaUrl(p.thumbUrl) : '',
  isExclusive: !!p.isExclusive,
  isOffPlan: !!p.isOffPlan,
})

// Two catalog features double as first-class UI concepts: the property form shows them as
// a flag and a dropdown instead of a chip, and the public pages read them back as `balcony`
// and `furnishing`. Naming them here keeps that mapping in ONE place — they are still
// ordinary rows in the Features catalog, not columns and not a second system.
export const NAMED_FEATURES = { BALCONY: 'Balconies', FURNISHING: 'Furnishing' }

const featureValue = (features, name) =>
  (features || []).find(f => f.name === name)?.value || ''

export const mapPropertyDetails = (p) => ({
  id: p.id,
  referenceNo: `QP-${String(p.id).slice(0, 8).toUpperCase()}`,
  title: p.title,
  description: p.description,
  purpose: kindToPurpose(p.listingKind),
  status: statusToUi(p.status),
  type: p.propertyTypeName,
  propertyTypeId: p.propertyTypeId,
  city: p.location?.city || '',
  area: p.areaName || '',
  areaId: p.areaId || null,
  district: p.location?.street || '',
  // Carried through so an edit does not silently blank them. The form merges the patch onto
  // THIS object and sends the whole record back, so a field missing here is a field wiped on
  // every save — that is how locState became a copy of the city and locDescription vanished.
  locCountry: p.location?.country || 'Qatar',
  locState: p.location?.state || '',
  locDescription: p.location?.description || '',
  // Payment terms, likewise. They were rebuilt from constants on every save, so an
  // installment plan turned into Cash and a 24-month contract became 12.
  paymentMethodValue: p.sale?.paymentMethod || null,
  contractDuration: p.rent?.contractDurationMonths || null,
  bedrooms: p.specs?.numberOfRooms ?? 0,
  bathrooms: p.specs?.bathrooms ?? 0,
  sizeSqm: Number(p.specs?.areaInSquareMeters) || 0,
  price: p.priceOnRequest ? null : (p.offerPrice ?? p.sale?.amount ?? p.rent?.amount ?? 0),
  originalPrice: p.offerPrice != null ? (p.sale?.amount ?? p.rent?.amount) : null,
  currency: p.sale?.currency || p.rent?.currency || 'QAR',
  // A listing always carries terms (the domain requires them for its ListingKind); this
  // flag is what decides whether the figure is shown publicly or replaced by "on request".
  priceOnRequest: !!p.priceOnRequest,
  paymentMethod: p.sale?.paymentMethod || null,
  contractDurationMonths: p.rent?.contractDurationMonths || null,
  exclusive: !!p.isFeatured,
  offPlan: !!p.isOffPlan,
  viewsCount: p.viewsCount,
  // null whenever the backend could not parse a usable coordinate pair; the
  // detail page hides the whole Location block rather than showing a map of nowhere.
  lat: p.latitude ?? null,
  lng: p.longitude ?? null,
  images: [...(p.media || [])].sort((a, b) => a.order - b.order).map(m => resolveMediaUrl(m.url)),
  // Full objects for the admin media manager. `url` is kept EXACTLY as stored (the reorder
  // and remove endpoints match on the stored value), and `displayUrl` is the one to render.
  media: (p.media || []).map(m => ({ ...m, displayUrl: resolveMediaUrl(m.url) })),
  amenities: (p.features || []).map(f => f.name),
  features: p.features || [],                 // full objects, for the admin feature editor
  // Both live in the Features catalog — read back here so the pages that ask for
  // `balcony` / `furnishing` keep working without a second storage location.
  balcony: (p.features || []).some(f => f.name === NAMED_FEATURES.BALCONY),
  furnishing: featureValue(p.features, NAMED_FEATURES.FURNISHING),
  agentId: p.agent?.id || null,
  // Full "Listed by" card data straight from the details DTO (live mode). Mock mode has
  // no p.agent — the details page falls back to looking the agent up by agentId.
  agent: p.agent
    ? {
        id: p.agent.id, name: p.agent.name, title: p.agent.jobTitle,
        photo: p.agent.photoUrl, slug: p.agent.slug,
        phone: p.agent.phone, whatsapp: p.agent.whatsApp,
      }
    : null,
  addedOn: '',
})

// ---- UI → backend body builders -------------------------------------------------------

// The inverse of resolveMediaUrl: what the browser is SHOWING → what should be STORED.
// Our own media URLs go back to a relative path; anything external is stored as-is.
export const toStoredMediaUrl = (url) => {
  if (!url) return url
  if (API_URL && url.startsWith(`${API_URL}/api/media/images/`)) return url.slice(API_URL.length)
  // Also handles a value stored absolutely before this change, on whatever origin.
  const match = /^https?:\/\/[^/]+(\/api\/media\/images\/.+)$/i.exec(url)
  return match ? match[1] : url
}


const agentBody = (f) => ({
  // toStoredMediaUrl, not f.photo: rendering resolves a relative path to an absolute URL, and
  // sending that back would store the absolute one again — the very thing we moved away from.
  name: f.name, jobTitle: f.title, photoUrl: toStoredMediaUrl(f.photo), slug: f.slug || null,
  phone: f.phone || null, whatsApp: f.whatsapp || null, email: f.email || null,
  rating: Number(f.rating) || 0, bio: f.bio || null,
})

const areaBody = (f) => ({
  name: f.name, photoUrl: toStoredMediaUrl(f.photo), slug: f.slug || null, intro: f.intro || null,
})

const developmentBody = (f) => ({
  name: f.name,
  // Same LocationInput the property commands use. X = LONGITUDE, Y = LATITUDE.
  location: {
    country: f.locCountry || 'Qatar',
    city: f.city || 'Doha',
    street: f.street || f.district || f.area || f.city || 'Doha',
    postalCode: '00000',
    state: f.locState || f.city || 'Doha',
    x: f.x !== undefined && f.x !== '' && f.x !== null ? String(f.x) : '0',
    y: f.y !== undefined && f.y !== '' && f.y !== null ? String(f.y) : '0',
    description: f.locDescription || null,
  },
  deliveryYear: Number(f.deliveryYear) || new Date().getFullYear(),
  coverImageUrl: toStoredMediaUrl(f.coverImage), slug: f.slug || null, description: f.description || null,
  unitsCount: Number(f.unitsCount) || 0, developerName: f.developer || f.developerName || null,
  startingPrice: Number(f.startingPrice) || 0, paymentPlan: f.paymentPlan || null,
})

const jobBody = (f) => ({
  title: f.title, department: f.department, employmentType: f.type,
  location: f.location, description: f.description,
})

// The admin property form speaks the mock dialect (purpose/type/area names, flat fields).
// The API speaks the domain dialect (ListingKind, PropertyTypeId, LocationInput, terms).
// typeIdByName / areaIdByName come from the catalogs, loaded by DataContext.
export const propertyCommand = (f, typeIdByName, areaIdByName) => {
  const money = { amount: Number(f.price) || 0, currency: f.currency || 'QAR' }
  const isSale = f.purpose === 'buy'
  return {
    title: f.title,
    description: f.description,
    propertyTypeId: typeIdByName[f.type],   // undefined → 400 from the API, surfaced to the form
    listingKind: purposeToKind(f.purpose),
    location: {
      country: f.locCountry || 'Qatar',
      city: f.city || 'Doha',
      street: f.district || f.area || f.city || 'Doha',
      postalCode: f.postalCode || '00000',
      // Falls back to the city only when the record genuinely has no state — it used to
      // OVERWRITE a real state with the city name on every save.
      state: f.locState || f.city || 'Doha',
      // From the LocationPicker. Convention everywhere: X = LONGITUDE, Y = LATITUDE
      // (same as the backend Location value object). '0' only as a legacy fallback for
      // records saved before the picker existed.
      x: f.x !== undefined && f.x !== '' && f.x !== null ? String(f.x) : '0',
      y: f.y !== undefined && f.y !== '' && f.y !== null ? String(f.y) : '0',
      description: f.locDescription || null,
    },
    // Payment terms are CARRIED, not re-invented. These were hardcoded — 'Cash', no
    // installment plan, a 12-month contract — and the admin form sends the whole record on
    // every save, so editing a photo turned an installment plan into a cash sale and a
    // 24-month lease into a 12-month one.
    sale: isSale
      ? {
          price: money,
          paymentMethod: f.paymentMethodValue || 'Cash',
          installment: f.installment ?? null,
        }
      : null,
    rent: isSale
      ? null
      : { price: money, contractDurationMonths: Number(f.contractDuration) || 12 },
    specs: {
      numberOfRooms: Number(f.bedrooms) || 0,
      areaInSquareMeters: Number(f.sizeSqm) || 0,
      bathrooms: Number(f.bathrooms) || 0,
    },
    areaId: areaIdByName[f.area] || null,
    agentId: f.agentId || null,
    // Two booleans the domain already models on Property. The listing keeps its real
    // figure either way — PriceOnRequest only decides whether the site prints it.
    // "Exclusive" is deliberately NOT here: it is IsFeatured, and the backend guards it
    // behind its own endpoint because only a published listing may be featured.
    isOffPlan: !!f.offPlan,
    priceOnRequest: !!f.priceOnRequest,
  }
}

// ---- public site ----------------------------------------------------------------------

export const catalogApi = {
  propertyTypes: () => http('/api/catalog/property-types', { auth: false }),
  features: () => http('/api/catalog/features', { auth: false }),
}

export const publicApi = {
  async searchProperties(filters = {}) {
    const page = await http(`/api/properties${qs(filters)}`, { auth: false })
    return { ...page, items: (page?.items || []).map(mapPropertyListItem) }
  },
  async featuredProperties(take = 8) {
    const items = await http(`/api/properties/featured${qs({ take })}`, { auth: false })
    return (items || []).map(mapPropertyListItem)
  },
  async propertyDetails(id) {
    return mapPropertyDetails(await http(`/api/properties/${id}`, { auth: false }))
  },
  async relatedProperties(id, take = 4) {
    const items = await http(`/api/properties/${id}/related${qs({ take })}`, { auth: false })
    return (items || []).map(mapPropertyListItem)
  },
  // Bounds are REQUIRED by the endpoint -- the handler validates them -- so the caller
  // always passes a viewport, never an open query.
  async propertiesForMap({ minLat, maxLat, minLng, maxLng, listingKind, propertyTypeId, minPrice, maxPrice, take } = {}) {
    const items = await http(
      `/api/properties/map${qs({ minLat, maxLat, minLng, maxLng, listingKind, propertyTypeId, minPrice, maxPrice, take })}`,
      { auth: false })
    return (items || []).map(mapPropertyMapItem)
  },
  recordView(id) {
    // fire-and-forget — a failed view ping must never surface in the UI
    return http(`/api/properties/${id}/views`, { method: 'POST', auth: false }).catch(() => {})
  },

  async agents() { return (await http('/api/agents', { auth: false }) || []).map(mapAgent) },
  async agentBySlug(slug) { return mapAgent(await http(`/api/agents/${slug}`, { auth: false })) },

  async areas() { return (await http('/api/areas', { auth: false }) || []).map(mapArea) },
  async areaBySlug(slug) { return mapArea(await http(`/api/areas/${slug}`, { auth: false })) },

  async developments() { return (await http('/api/developments', { auth: false }) || []).map(mapDevelopment) },
  async developmentBySlug(slug) { return mapDevelopment(await http(`/api/developments/${slug}`, { auth: false })) },

  async jobs(department) { return (await http(`/api/jobs${qs({ department })}`, { auth: false }) || []).map(mapJob) },
  async jobDepartments() { return await http('/api/jobs/departments', { auth: false }) || [] },
}

// ---- admin panel ----------------------------------------------------------------------
// Thin wrappers: each returns backend data mapped to the UI dialect. The toggle-active
// endpoints exist separately from update so a text edit can never close/hide a record.

export const agentsAdminApi = {
  async list() { return (await http('/api/admin/agents') || []).map(mapAgent) },
  create: (f) => http('/api/admin/agents', { method: 'POST', body: agentBody(f) }),
  update: (id, f) => http(`/api/admin/agents/${id}`, { method: 'PUT', body: agentBody(f) }),
  toggleActive: (id, active) => http(`/api/admin/agents/${id}/active`, { method: 'PUT', body: { isActive: active } }),
  remove: (id) => http(`/api/admin/agents/${id}`, { method: 'DELETE' }),
}

export const areasAdminApi = {
  async list() { return (await http('/api/admin/areas') || []).map(mapArea) },
  create: (f) => http('/api/admin/areas', { method: 'POST', body: areaBody(f) }),
  update: (id, f) => http(`/api/admin/areas/${id}`, { method: 'PUT', body: areaBody(f) }),
  remove: (id) => http(`/api/admin/areas/${id}`, { method: 'DELETE' }),   // 409 Area.InUse if listings still filed under it
}

export const developmentsAdminApi = {
  async list() { return (await http('/api/admin/developments') || []).map(mapDevelopment) },
  create: (f) => http('/api/admin/developments', { method: 'POST', body: developmentBody(f) }),
  update: (id, f) => http(`/api/admin/developments/${id}`, { method: 'PUT', body: developmentBody(f) }),
  remove: (id) => http(`/api/admin/developments/${id}`, { method: 'DELETE' }),
}

export const jobsAdminApi = {
  async list(department) { return (await http(`/api/admin/jobs${qs({ department })}`) || []).map(mapJob) },
  create: (f) => http('/api/admin/jobs', { method: 'POST', body: jobBody(f) }),
  update: (id, f) => http(`/api/admin/jobs/${id}`, { method: 'PUT', body: jobBody(f) }),
  toggleActive: (id, active) => http(`/api/admin/jobs/${id}/active`, { method: 'PUT', body: { isActive: active } }),
  remove: (id) => http(`/api/admin/jobs/${id}`, { method: 'DELETE' }),
}

// Admin table row from the ADMIN list DTO — includes drafts/archived (the public search
// only ever returns published listings) plus the aggregate view counter.
export const mapAdminPropertyRow = (p) => ({
  id: p.id,
  referenceNo: `QP-${String(p.id).slice(0, 8).toUpperCase()}`,
  title: p.title,
  purpose: kindToPurpose(p.listingKind),
  status: statusToUi(p.status),
  exclusive: !!p.isFeatured,
  active: p.isActive !== false,
  price: p.price ?? 0,
  currency: p.currency || 'QAR',
  priceOnRequest: !!p.priceOnRequest,
  offPlan: !!p.isOffPlan,
  city: p.city || '', area: p.area || '', district: '',
  type: p.propertyType || '',
  images: p.coverImageUrl ? [p.coverImageUrl] : [],
  viewsCount: p.viewsCount ?? 0,
  amenities: [], bedrooms: 0, bathrooms: 0, sizeSqm: 0,
  agentId: p.agentId || null,
  agentName: p.agentName || null,     // joined in the admin projection — no client lookup
  addedOn: String(p.createdOnUtc || '').slice(0, 10),
})

// ---- Leads -----------------------------------------------------------------------------
const LEAD_STATUS_UI = { New: 'New', Contacted: 'Contacted', Qualified: 'Qualified', Converted: 'Converted', Lost: 'Lost', Archived: 'Archived' }
const LEAD_TYPE_UI = { PropertyInquiry: 'Property Inquiry', ListingRequest: 'Listing Request', GeneralInquiry: 'General Inquiry' }

export const mapLead = (l) => ({
  id: l.id,
  name: l.fullName, phone: l.phone, email: l.email,
  message: l.message || '',
  type: l.type,                                 // backend enum name
  typeLabel: LEAD_TYPE_UI[l.type] || l.type,
  status: LEAD_STATUS_UI[l.status] || l.status,
  source: l.source || '',
  propertyId: l.propertyId || null,
  propertyTitle: l.propertyTitle || null,
  agentId: null,
  // listing-request extras
  propertyTypeName: l.propertyTypeName || null,
  purpose: l.listingKind ? kindToPurpose(l.listingKind) : null,
  locationLabel: [l.locationStreet, l.locationCity].filter(Boolean).join(', ') || null,
  date: String(l.createdOnUtc || '').slice(0, 10),
})

export const mapLeadDetails = (l) => ({
  ...mapLead(l),
  agentName: l.agentName || null,
  property: l.property ? {
    id: l.property.id, title: l.property.title, city: l.property.city,
    purpose: kindToPurpose(l.property.listingKind),
    price: l.property.price, currency: l.property.currency,
    coverImage: l.property.coverImageUrl || '', type: l.property.propertyType || '',
  } : null,
  location: l.location ? {
    country: l.location.country, city: l.location.city, street: l.location.street,
    state: l.location.state, description: l.location.description || '',
    // X = longitude, Y = latitude — the one convention, everywhere.
    lat: Number(l.location.y), lng: Number(l.location.x),
  } : null,
})

// PUBLIC intake — the only lead operations an anonymous visitor can perform.
export const leadsApi = {
  createInquiry: (f) => http('/api/leads/inquiry', { method: 'POST', auth: false, body: {
    fullName: f.name, phone: f.phone, email: f.email, message: f.message || null,
    propertyId: f.propertyId || null, agentId: f.agentId || null, source: f.source || null,
  } }),
  createListingRequest: (f) => http('/api/leads/listing-request', { method: 'POST', auth: false, body: {
    fullName: f.name, phone: f.phone, email: f.email, message: f.message || null,
    propertyTypeName: f.type, listingKind: f.purpose === 'rent' ? 'Rent' : 'Sale',
    location: {
      country: f.locCountry || 'Qatar', city: f.city || 'Doha',
      street: f.street || f.city || 'Doha', postalCode: '00000',
      state: f.locState || f.city || 'Doha',
      x: String(f.x), y: String(f.y),
      description: f.locDescription || null,
    },
    source: 'List your property',
  } }),
}

export const leadsAdminApi = {
  async list(filters = {}) {
    const page = await http(`/api/admin/leads${qs(filters)}`)
    return { ...page, items: (page?.items || []).map(mapLead) }
  },
  async byId(id) { return mapLeadDetails(await http(`/api/admin/leads/${id}`)) },
  setStatus: (id, status) => http(`/api/admin/leads/${id}/status`, { method: 'PUT', body: { status } }),
  remove: (id) => http(`/api/admin/leads/${id}`, { method: 'DELETE' }),
}

export const propertiesAdminApi = {
  list: (filters = {}) => http(`/api/admin/properties${qs(filters)}`),
  // Monthly platform statistics for one year — real data, grouped in SQL.
  dashboardStatistics: (year) => http(`/api/admin/properties/dashboard-statistics${qs({ year })}`),
  // Dashboard analytics. All-time only: the backend keeps ONE aggregate counter per
  // property (Properties.ViewsCount) — no per-view timeline exists to range-filter yet.
  async mostViewed(take = 5) {
    const d = await http(`/api/admin/properties/most-viewed${qs({ take })}`)
    return {
      totalViews: d?.totalViews ?? 0,
      items: (d?.items || []).map(p => ({
        id: p.id, title: p.title, city: p.city || '',
        purpose: kindToPurpose(p.listingKind), status: statusToUi(p.status),
        price: p.price, currency: p.currency, thumb: p.coverImageUrl || '',
        views: p.viewsCount ?? 0,
      })),
    }
  },
  // The ADMIN details read. The public endpoint now serves published, active listings only
  // (that is what unpublishing means) and withholds the figure behind "price on request" —
  // the edit form needs a draft to open and the real price to save back, so it asks here.
  async details(id) { return mapPropertyDetails(await http(`/api/admin/properties/${id}`)) },
  create: (command) => http('/api/admin/properties', { method: 'POST', body: command }),
  update: (id, command) => http(`/api/admin/properties/${id}`, { method: 'PUT', body: command }),
  addMedia: (id, items) => http(`/api/admin/properties/${id}/media`, {
    method: 'POST',
    body: { items: items.map(m => ({ ...m, url: toStoredMediaUrl(m.url) })) },
  }),
  // The gallery order the admin arranged; the first id becomes the cover.
  reorderMedia: (id, mediaIds) => http(`/api/admin/properties/${id}/media/order`, {
    method: 'PUT', body: { mediaIds },
  }),
  removeMedia: (id, mediaId) => http(`/api/admin/properties/${id}/media/${mediaId}`, { method: 'DELETE' }),
  setFeatures: (id, features) => http(`/api/admin/properties/${id}/features`, { method: 'PUT', body: { features } }),
  setOffer: (id, offer) => http(`/api/admin/properties/${id}/offer`, { method: 'PUT', body: { offer } }),
  // "Exclusive" toggle → the domain's IsFeatured. Only a published listing can be
  // featured (backend enforces it); unfeaturing always works.
  setFeatured: (id, isFeatured) => http(`/api/admin/properties/${id}/featured`, { method: 'PUT', body: { isFeatured } }),
  publication: (id, action, reason = null) => http(`/api/admin/properties/${id}/publication`, { method: 'POST', body: { action, reason } }),
  archive: (id) => http(`/api/admin/properties/${id}/archive`, { method: 'POST' }),
  // PERMANENT delete — distinct from archive. The UI always confirms first.
  remove: (id) => http(`/api/admin/properties/${id}`, { method: 'DELETE' }),
  toggleActive: (id, active) => http(`/api/admin/properties/${id}/active`, { method: 'PUT', body: { isActive: active } }),
  history: (id) => http(`/api/admin/properties/${id}/history`),
}

export const imagesAdminApi = {
  // multipart upload (field name "file", per AdminImagesController) → 201 with the new id.
  // Handle both body shapes ({ id } or a bare guid) so a serializer tweak can't break us.
  async upload(file) {
    const form = new FormData()
    form.append('file', file)
    const res = await http('/api/admin/media/images', { method: 'POST', body: form })
    return res?.id ?? res
  },
  remove: (id) => http(`/api/admin/media/images/${id}`, { method: 'DELETE' }),
}

// What gets STORED in Property media, Agent.PhotoUrl, Area.PhotoUrl and
// Development.CoverImageUrl: a RELATIVE path, so the photo keeps working when the site
// changes address (http://<ip> → https://<domain>). Use resolveMediaUrl to render it.
export const imageUrl = (id) => `/api/media/images/${id}`

// ---- feature (amenity) catalog management ---------------------------------------------

export const mapFeature = (f) => ({
  id: f.id, name: f.name, valueType: f.valueType, icon: f.icon,
  active: f.isActive ?? true,          // the public catalog omits the flag: it's always active
})

const featureBody = (f) => ({
  name: f.name, valueType: f.valueType || 'Boolean', icon: f.icon || null,
})

export const featuresAdminApi = {
  async list() { return (await http('/api/admin/features') || []).map(mapFeature) },
  create: (f) => http('/api/admin/features', { method: 'POST', body: featureBody(f) }),
  update: (id, f) => http(`/api/admin/features/${id}`, { method: 'PUT', body: featureBody(f) }),
  toggleActive: (id, active) => http(`/api/admin/features/${id}/active`, { method: 'PUT', body: { isActive: active } }),
  remove: (id) => http(`/api/admin/features/${id}`, { method: 'DELETE' }),   // 409 Feature.InUse if assigned
}
