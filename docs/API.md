# API Reference

> Generated from the controllers, not from a running instance. Every route, permission and status code below is traceable to a `[Http*]` attribute and the `Result<T>` extension the action returns.

- [Conventions](#conventions)
- [Errors](#errors)
- [Authentication](#authentication)
- [Public endpoints](#public-endpoints) — 21
- [Admin endpoints — RealEstate](#admin-endpoints--realestate) — 34
- [Admin endpoints — Auth](#admin-endpoints--auth) — 15
- [Permission catalogue](#permission-catalogue)
- [Known API gaps](#known-api-gaps)

---

## Conventions

| | |
|---|---|
| Base path | `/api` |
| Content type | `application/json` (except image upload — `multipart/form-data`) |
| Property naming | camelCase (ASP.NET Core default) |
| Enums | **Serialised as PascalCase strings** — `"Sale"`, `"Published"`, `"New"` — via `JsonStringEnumConverter` |
| Nulls | Serialised, not omitted |
| Auth | `Authorization: Bearer <jwt>` |
| Versioning | **None.** No `Asp.Versioning`, no version segment in any route |
| OpenAPI | `/openapi/v1.json` — **Development environment only** |

### Status codes

Derived from the mapper each action uses:

| Helper | Code | Body |
|---|---|---|
| `ToOk()` | `200` | the value |
| `ToNoContent()` | `204` | empty |
| `ToCreatedAtRoute()` | `201` | `{ "id": "<guid>" }` + `Location` header |

### Pagination

Paged endpoints take `?page=` and `?pageSize=` and return:

```json
{
  "items": [ … ],
  "page": 1,
  "pageSize": 24,
  "totalCount": 49,
  "totalPages": 3,
  "hasPreviousPage": false,
  "hasNextPage": true
}
```

Defaults differ by endpoint: `pageSize=24` for property search and admin properties, `50` for leads. Non-paged "top N" endpoints use `?take=` instead (`featured`=8, `related`=4, `most-viewed`=5, `map`=300).

> **Caveat.** No upper bound is enforced on `pageSize` or `take` at the binding layer. Handlers clamp some of them (`featured` 1–20, `related` 1–12, `map` ≤500, search `pageSize` 1–100 via its validator) but several list endpoints are unbounded.

---

## Errors

All failures use RFC 9457 `ProblemDetails`.

**Validation** — when every error is a validation error:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Validation failed",
  "status": 400,
  "errors": {
    "Title":    ["Title must be at least 10 characters."],
    "Location": ["'Location' must not be empty."]
  }
}
```

**Everything else** — the *first* error decides the status:

```json
{
  "title": "Not Found",
  "status": 404,
  "errors": [ { "code": "Property.NotFound", "description": "Property was not found." } ]
}
```

| `ErrorKind` | HTTP |
|---|---|
| `Validation` | 400 |
| `Unauthorized` | 401 |
| `Forbidden` | 403 |
| `NotFound` | 404 |
| `Conflict` | 409 |
| `Failure`, `Unexpected` | 500 |

Unhandled exceptions return 500 with `"An unexpected error occurred."` — the real message appears only in Development.

> Only the first error is returned for non-validation failures; any others are dropped.

---

## Authentication

### `POST /api/auth/login` — anonymous

```json
{ "email": "admin@example.com", "password": "…" }
```

**200**

```json
{ "accessToken": "eyJhbGciOi…", "expiresAtUtc": "2026-07-30T12:00:00Z" }
```

**401** for wrong credentials, a locked account (5 failures → 5 minutes) or a deactivated account. Unknown email and wrong password return the same error, so the endpoint does not leak which accounts exist.

The token carries: user id, email, full name, `jti`, role claims, one `auth:permission` claim per granted permission, and `auth:main_admin` when applicable. Default lifetime 60 minutes.

> **There is no refresh token, no logout and no revocation.** A token remains valid until it expires, even if the admin is deactivated or their permissions are removed.

### `GET /api/auth/me` — `[Authorize]`

**200** → `{ id, email, fullName, isMainAdmin, positionName, roles[], permissions[] }`

---

## Public endpoints

No `[Authorize]` attribute, and there is no global fallback policy — these are anonymous.

### Properties

| Verb | Route | Query parameters | Returns |
|---|---|---|---|
| GET | `/api/properties` | `q` · `kind` · `propertyTypeId` · `city` · `minRooms` · `minBathrooms` · `minArea` · `maxArea` · `minPrice` · `maxPrice` · `sort` · `page` · `pageSize` | `PagedResult<PropertyListItem>` |
| GET | `/api/properties/map` | `minLat` · `maxLat` · `minLng` · `maxLng` · `kind` · `propertyTypeId` · `minPrice` · `maxPrice` · `take` | `PropertyMapItem[]` |
| GET | `/api/properties/featured` | `take` (default 8, clamped 1–20) | `PropertyListItem[]` |
| GET | `/api/properties/{id}` | — | `PropertyDetailsDto` |
| GET | `/api/properties/{id}/related` | `take` (default 4, clamped 1–12) | `PropertyListItem[]` |
| POST | `/api/properties/{id}/views` | — | `204` |

`sort` accepts `Relevance` · `PriceAsc` · `PriceDesc` · `Newest` · `Oldest`. Relevance degrades to featured-then-newest — there is no full-text index.

Search, map and featured all filter on `Status == Published && IsActive`.

> **`GET /api/properties/{id}` does not.** A Draft or Archived listing is retrievable by id, anonymously, with full details including the agent's phone number. See [ARCHITECTURE.md §15](ARCHITECTURE.md#15-known-limitations-and-engineering-backlog).

<details>
<summary><code>PropertyListItem</code></summary>

```json
{
  "id": "…", "title": "…", "kind": "Sale", "status": "Published",
  "price": 2450000, "offerPrice": null, "currency": "QAR",
  "city": "Doha", "coverImageUrl": "/api/media/images/…",
  "rooms": 3, "bathrooms": 4, "area": 240,
  "isFeatured": true, "isOffPlan": false, "priceOnRequest": false
}
```
</details>

<details>
<summary><code>PropertyDetailsDto</code></summary>

Adds `description`, `location` (country, city, street, postalCode, state, coordinates, description), `sale`/`rent` terms, `specs`, `media[]` ordered by `order`, `features[]` (`id`, `name`, `value`, `icon`), `latitude`, `longitude`, `agent` (`id`, `name`, `jobTitle`, `photoUrl`, `phone`, `whatsApp`, `email`), `isOffPlan`, `priceOnRequest`.
</details>

### Catalogue and content

| Verb | Route | Returns |
|---|---|---|
| GET | `/api/agents` | `AgentDto[]` — active only |
| GET | `/api/agents/{slug}` | `AgentDto` |
| GET | `/api/areas` | `AreaDto[]` — includes a published-property count per area |
| GET | `/api/areas/{slug}` | `AreaDto` |
| GET | `/api/developments` | `DevelopmentDto[]` — ordered by delivery year, then name |
| GET | `/api/developments/{slug}` | `DevelopmentDto` |
| GET | `/api/catalog/property-types` | `PropertyTypeDto[]` |
| GET | `/api/catalog/features` | `FeatureCatalogItemDto[]` — active only |
| GET | `/api/jobs` | `JobDto[]` — open roles; optional `?department=` |
| GET | `/api/jobs/departments` | `string[]` |

### Leads

| Verb | Route | Body | Returns |
|---|---|---|---|
| POST | `/api/leads/inquiry` | `fullName`, `phone`, `email`, `message?`, `propertyId?`, `agentId?`, `source?` | **200** + new id |
| POST | `/api/leads/listing-request` | the above plus `propertyTypeName`, `listingKind`, `location` | **200** + new id |

Validation: name 2–150, phone 5–30, email required and ≤200, message ≤2000. The lead type is inferred — `PropertyInquiry` when a `propertyId` is supplied, otherwise `GeneralInquiry`. Every lead is created with status `New`.

> These two return **200**, not 201, unlike every other create in the API.

### Media

| Verb | Route | Returns |
|---|---|---|
| GET | `/api/media/images/{id}` | the image bytes with its stored content type, `Cache-Control: public, max-age=31536000, immutable` |

Safe to cache forever because `StoredImage` has no update path — the bytes at an id can never change.

---

## Admin endpoints — RealEstate

All under `[Authorize]` plus a per-action `[HasPermission]`.

### Properties — `/api/admin/properties`

| Verb | Route | Permission | Body | Code |
|---|---|---|---|---|
| GET | `/` | `Property.Read` | *(query)* `q`, `status`, `kind`, `isFeatured`, `isActive`, `page`, `pageSize` | 200 |
| GET | `/dashboard-statistics` | `Property.Read` | *(query)* `year` | 200 |
| GET | `/most-viewed` | `Property.Read` | *(query)* `take` | 200 |
| GET | `/{id}/history` | `Property.Read` | — | 200 |
| POST | `/` | `Property.Create` | `CreatePropertyCommand` | **201** → `Location: /api/properties/{id}` |
| PUT | `/{id}` | `Property.Update` | `UpdatePropertyRequest` | 204 |
| DELETE | `/{id}` | `Property.Delete` | — | 204 (hard delete, cascades media + features) |
| POST | `/{id}/media` | `Property.Update` | `{ items: MediaInput[] }` | 204 |
| DELETE | `/{id}/media/{mediaId}` | `Property.Update` | — | 204 |
| PUT | `/{id}/features` | `Property.Update` | `{ features: FeatureSelectionInput[] }` | 204 |
| PUT | `/{id}/offer` | `Property.Update` | `{ offer: MoneyInput \| null }` | 204 |
| PUT | `/{id}/active` | `Property.Update` | `{ isActive: bool }` | 204 |
| POST | `/{id}/publication` | `Property.Publish` | `{ action, reason? }` | 204 |
| PUT | `/{id}/featured` | `Property.Publish` | `{ isFeatured: bool }` | 204 |
| POST | `/{id}/archive` | `Property.Publish` | — | 204 |

`action` is `Publish` · `Unpublish` · `MarkSold` · `MarkRented`.

> Two caveats. **`reason` is accepted, validated (≤500 chars) and then discarded** — no status-history row is written. And `/{id}/history` returns only seeded rows, because nothing writes to that table at runtime. The dashboard's Published/Sold/Rented series are built from the same table and are therefore zero for all real activity.

Non-privileged roles see only listings where `CreatedBy` is their own user id, on the list, dashboard-statistics and most-viewed endpoints. Because seeded listings have `CreatedBy = null`, none of the 49 demo listings is visible to a scoped admin.

### Agents · Areas · Developments · Features · Jobs

Uniform CRUD. Replace `{resource}` and `{Perm}` from the table:

| Verb | Route | Permission | Code |
|---|---|---|---|
| GET | `/api/admin/{resource}` | `{Perm}.Read` | 200 |
| GET | `/api/admin/{resource}/{id}` | `{Perm}.Read` | 200 |
| POST | `/api/admin/{resource}` | `{Perm}.Create` | 201 |
| PUT | `/api/admin/{resource}/{id}` | `{Perm}.Update` | 204 |
| DELETE | `/api/admin/{resource}/{id}` | `{Perm}.Delete` | 204 |
| PUT | `/api/admin/{resource}/{id}/active` | `{Perm}.Update` | 204 |

| Resource | Permission group | `/active` toggle | Notes |
|---|---|---|---|
| `agents` | `Agent` | ✅ | slug unique; auto-derived from name if omitted |
| `areas` | `Area` | ❌ | delete blocked with **409** if any property references it |
| `developments` | `Development` | ❌ | `?department=` not applicable |
| `features` | `Feature` | ✅ | delete blocked with **409** if in use; `icon` must be a key in `FeatureIconCatalog`. **`POST` returns 200, not 201** |
| `jobs` | `Job` | ✅ | list accepts `?department=` |

`GET /api/admin/areas` and `GET /api/admin/developments` reuse the public query handler, so admin and public see identical data for those two resources.

### Media — `/api/admin/media/images`

| Verb | Route | Permission | Body | Code |
|---|---|---|---|---|
| POST | `/` | `Media.Upload` | `multipart/form-data`, field name **`file`** | **201** → `Location: /api/media/images/{id}` |
| DELETE | `/{id}` | `Media.Delete` | — | 204 |

| Constraint | Value | Enforced by |
|---|---|---|
| Max size | 10 MB | `StoredImage.MaxSizeBytes`, checked in the aggregate *and* the validator |
| Transport limit | 11 MiB | `[RequestSizeLimit]` (multipart framing headroom) |
| Edge limit | 25 MB | `client_max_body_size` in `docker/nginx/default.conf` |
| Content types | `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif` | `StoredImage.AllowedContentTypes` |

The content type is taken from the client and **not verified against the file's magic bytes**. An empty or absent file is routed through the same pipeline so the caller gets a validation `ProblemDetails` rather than an ad-hoc 400.

Deletion is a hard delete with **no referential integrity** — `Media.Url` and `Agent.PhotoUrl` are plain strings, so deleting a referenced image leaves a URL that 404s.

### Leads — `/api/admin/leads`

| Verb | Route | Permission | Code |
|---|---|---|---|
| GET | `/` | ⚠️ `[Authorize]` only | 200 |
| GET | `/{id}` | ⚠️ `[Authorize]` only | 200 |
| PUT | `/{id}/status` | ⚠️ `[Authorize]` only | 204 |
| DELETE | `/{id}` | ⚠️ `[Authorize]` only | 204 |

> **No permission gate exists**, because no `Lead.*` entry exists in `AppPermissions.Catalog`. Any authenticated principal — including the least-privileged position — can read, re-status and delete every lead. There is also no owner scoping on the list. This is the highest-severity authorization gap in the API.

Filters: `?type=`, `?status=`, `?q=` (name/email/phone), `?page=`, `?pageSize=` (default 50). Status transitions are unconstrained by design.

---

## Admin endpoints — Auth

See [MODULES.md § Auth API](MODULES.md#api) for the full table. Summary:

| Group | Routes | Permissions |
|---|---|---|
| Admins | `/api/admins` (+ `/{id}`, `/{id}/activate`, `/{id}/deactivate`, `/{id}/position`) | `Admin.Read/Create/Update/Delete/AssignPosition` |
| Positions | `/api/positions` (+ `/{id}`, `/{id}/permissions`) | `Position.Read/Create/Update/Delete`, `Permission.Read/Assign` |
| Permissions | `/api/permissions` | `Permission.Read` |

Any action targeting the Main Admin returns **403** `Admin.MainAdminProtected`. Deleting a position that is assigned to any admin returns **409** `Position.InUse`.

---

## Permission catalogue

41 constants in `BuildingBlocks.Authorization.AppPermissions`. `GET /api/permissions` returns exactly this list.

| Group | Permissions |
|---|---|
| `Property` | `Read` `Create` `Update` `Delete` `Publish` |
| `Agent` | `Read` `Create` `Update` `Delete` |
| `Development` | `Read` `Create` `Update` `Delete` |
| `Area` | `Read` `Create` `Update` `Delete` |
| `Feature` | `Read` `Create` `Update` `Delete` |
| `Job` | `Read` `Create` `Update` `Delete` |
| `Media` | `Upload` `Delete` |
| `User` | `Read` `Update` `Delete` — ⚠️ granted by seeded positions but **enforced by no endpoint** |
| `Admin` | `Read` `Create` `Update` `Delete` `AssignPosition` |
| `Position` | `Read` `Create` `Update` `Delete` |
| `Permission` | `Read` `Assign` |

Adding a permission is one constant plus one `[HasPermission]` attribute. No migration, no policy registration — `PermissionPolicyProvider` builds `perm:*` policies on demand.

---

## Known API gaps

| Gap | Impact |
|---|---|
| No `[ProducesResponseType]` anywhere | The OpenAPI document declares only 200 for every action and carries no response schemas. Client generators produce `object` |
| No API versioning | A breaking change has nowhere to go. `VersionInfoTransformer` stamps the document cosmetically only |
| No rate limiting | `/api/auth/login`, `/api/leads/*` and `/api/properties/{id}/views` are all anonymous and unthrottled |
| No health endpoint | Nothing for a load balancer or Compose healthcheck to probe |
| `GET /api/properties/{id}` has no visibility filter | Unpublished listings are publicly readable by id |
| `/api/admin/leads` has no permission gate | Any authenticated user can read and delete all leads |
| Lead creation returns 200 | Inconsistent with every other create, which returns 201 |
| `POST /api/admin/features` returns 200 | Same inconsistency |
| Permission-removal route embeds a dotted string in a path segment | Some proxies treat `Property.Publish` as a file extension |
