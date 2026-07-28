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
  id: a.id, name: a.name, title: a.jobTitle, photo: a.photoUrl, slug: a.slug,
  phone: a.phone, whatsapp: a.whatsApp, email: a.email, rating: a.rating,
  bio: a.bio, active: a.isActive,
})

export const mapArea = (a) => ({
  id: a.id, name: a.name, slug: a.slug, photo: a.photoUrl, intro: a.intro,
  propertyCount: a.propertyCount,          // computed by the backend — no client counting
})

export const mapDevelopment = (d) => ({
  id: d.id, name: d.name, slug: d.slug, area: d.areaName, deliveryYear: d.deliveryYear,
  coverImage: d.coverImageUrl, description: d.description, unitsCount: d.unitsCount,
  developer: d.developerName, startingPrice: d.startingPrice, paymentPlan: d.paymentPlan,
})

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
  price: p.offerPrice ?? p.price ?? 0,
  originalPrice: p.offerPrice != null ? p.price : null,
  currency: p.currency || 'QAR',
  priceOnRequest: p.price == null,
  city: p.city,
  bedrooms: p.numberOfRooms,
  bathrooms: p.bathrooms,
  sizeSqm: Number(p.areaInSquareMeters) || 0,
  images: p.coverImageUrl ? [p.coverImageUrl] : [],
  exclusive: !!p.isFeatured,
  type: '', area: '', district: '', amenities: [], agentId: null,
  offPlan: false, balcony: false, parking: 0, furnishing: '',
  addedOn: '',
})

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
  bedrooms: p.specs?.numberOfRooms ?? 0,
  bathrooms: p.specs?.bathrooms ?? 0,
  sizeSqm: Number(p.specs?.areaInSquareMeters) || 0,
  price: p.offerPrice ?? p.sale?.amount ?? p.rent?.amount ?? 0,
  originalPrice: p.offerPrice != null ? (p.sale?.amount ?? p.rent?.amount) : null,
  currency: p.sale?.currency || p.rent?.currency || 'QAR',
  priceOnRequest: p.sale == null && p.rent == null,
  paymentMethod: p.sale?.paymentMethod || null,
  contractDurationMonths: p.rent?.contractDurationMonths || null,
  exclusive: !!p.isFeatured,
  offPlan: false,
  viewsCount: p.viewsCount,
  images: [...(p.media || [])].sort((a, b) => a.order - b.order).map(m => m.url),
  media: p.media || [],                       // full objects, for the admin media manager
  amenities: (p.features || []).map(f => f.name),
  features: p.features || [],                 // full objects, for the admin feature editor
  parking: 0, balcony: false,
  furnishing: '',
  agentId: null,
  addedOn: '',
})

// ---- UI → backend body builders -------------------------------------------------------

const agentBody = (f) => ({
  name: f.name, jobTitle: f.title, photoUrl: f.photo, slug: f.slug || null,
  phone: f.phone || null, whatsApp: f.whatsapp || null, email: f.email || null,
  rating: Number(f.rating) || 0, bio: f.bio || null,
})

const areaBody = (f) => ({
  name: f.name, photoUrl: f.photo, slug: f.slug || null, intro: f.intro || null,
})

const developmentBody = (f) => ({
  name: f.name, areaName: f.area, deliveryYear: Number(f.deliveryYear) || new Date().getFullYear(),
  coverImageUrl: f.coverImage, slug: f.slug || null, description: f.description || null,
  unitsCount: Number(f.unitsCount) || 0, developerName: f.developer || null,
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
      country: 'Qatar',
      city: f.city || 'Doha',
      street: f.district || f.area || f.city || 'Doha',
      postalCode: '00000',
      state: f.city || 'Doha',
      x: '0', y: '0',
      description: null,
    },
    sale: isSale ? { price: money, paymentMethod: 'Cash', installment: null } : null,
    rent: isSale ? null : { price: money, contractDurationMonths: 12 },
    specs: {
      numberOfRooms: Number(f.bedrooms) || 0,
      areaInSquareMeters: Number(f.sizeSqm) || 0,
      bathrooms: Number(f.bathrooms) || 0,
    },
    areaId: areaIdByName[f.area] || null,
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

export const propertiesAdminApi = {
  list: (filters = {}) => http(`/api/admin/properties${qs(filters)}`),
  details: (id) => publicApi.propertyDetails(id),   // same DTO serves both sides
  create: (command) => http('/api/admin/properties', { method: 'POST', body: command }),
  update: (id, command) => http(`/api/admin/properties/${id}`, { method: 'PUT', body: command }),
  addMedia: (id, items) => http(`/api/admin/properties/${id}/media`, { method: 'POST', body: { items } }),
  removeMedia: (id, mediaId) => http(`/api/admin/properties/${id}/media/${mediaId}`, { method: 'DELETE' }),
  setFeatures: (id, features) => http(`/api/admin/properties/${id}/features`, { method: 'PUT', body: { features } }),
  setOffer: (id, offer) => http(`/api/admin/properties/${id}/offer`, { method: 'PUT', body: { offer } }),
  publication: (id, action, reason = null) => http(`/api/admin/properties/${id}/publication`, { method: 'POST', body: { action, reason } }),
  archive: (id) => http(`/api/admin/properties/${id}/archive`, { method: 'POST' }),
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

// The public URL an uploaded image is served from (GET /api/media/images/{id}) —
// this is what goes into Property media and Agent photo fields.
export const imageUrl = (id) => `${API_URL}/api/media/images/${id}`

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
