// Data/Queries/PropertyQueries.cs
using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Properties.Admin.ListPropertiesForAdmin;
using RealEstate.Application.Properties.Admin.Queries.GetPropertyStatusHistory;
using RealEstate.Application.Properties.Admin.Queries.GetDashboardStatistics;
using RealEstate.Application.Properties.Admin.Queries.GetMostViewedProperties;
using RealEstate.Application.Properties.Admin.Queries.ListPropertiesForAdmin.Inputs;
using RealEstate.Application.Properties.User.Queries.GetPropertiesForMap;
using RealEstate.Application.Properties.User.Queries.GetPropertyDetails.Dtos;
using RealEstate.Application.Properties.User.Queries.SearchProperties;
using RealEstate.Domain.Entities;
using RealEstate.Domain.Enums;

namespace RealEstate.Infrastructure.Data.Queries;

// ---------------------------------------------------------------------------------------------
//  TWO AUDIENCES, TWO RULES — and the difference is enforced HERE, in SQL, not in the client.
//
//  PUBLIC (search, featured, related, map, details-for-a-visitor)
//      * Published + IsActive only. A draft, an archived or a deactivated listing does not
//        exist as far as the public API is concerned — including by direct id, which is how
//        an unpublished listing used to stay reachable through its old link.
//      * A "price on request" listing returns NO price. Masking it in the projection is the
//        difference between hiding a number and not sending it: a figure that reaches the
//        browser is published, whatever the page chooses to draw with it.
//
//  ADMIN (the admin list, the admin details, the dashboards)
//      * Every status, and the real figures. Authorisation happens in the handlers.
// ---------------------------------------------------------------------------------------------
public sealed class PropertyQueries : IPropertyQueries
{
    private readonly RealEstateDbContext _db;
    public PropertyQueries(RealEstateDbContext db) => _db = db;

    /// <summary>Everything a visitor is allowed to see, and nothing else.</summary>
    private IQueryable<Property> PubliclyVisible() =>
        _db.Properties.AsNoTracking().Where(p => p.Status == PropertyStatus.Published && p.IsActive);

    public async Task<PagedResult<PropertyListItem>> SearchAsync(
        PropertySearchCriteria criteria, CancellationToken ct = default)
    {
        var query = PubliclyVisible();

        // ---- dynamic filters --------------------------------------------------------
        if (!string.IsNullOrWhiteSpace(criteria.Text))
        {
            // SQL Server LIKE-based search. If you later add a full-text index, swap this
            // for EF.Functions.FreeText / Contains — that's the only line that changes.
            // EscapeLikePattern keeps a literal % or _ in a visitor's query from turning into
            // a wildcard (and "%%%%" from scanning the table for nothing).
            var pattern = $"%{EscapeLikePattern(criteria.Text)}%";
            query = query.Where(p =>
                EF.Functions.Like(p.Title, pattern, LikeEscapeCharacter) ||
                EF.Functions.Like(p.Description, pattern, LikeEscapeCharacter) ||
                EF.Functions.Like(p.Location.CityName, pattern, LikeEscapeCharacter));
        }

        if (criteria.ListingKind.HasValue)
            query = query.Where(p => p.ListingKind == criteria.ListingKind.Value);

        if (criteria.PropertyTypeId.HasValue)
            query = query.Where(p => p.PropertyTypeId == criteria.PropertyTypeId.Value);

        // The three filters the area page, the agent page and the amenity drawer need. They
        // used to be done in the browser against a list DTO that carried none of these fields,
        // so they matched nothing at all.
        if (criteria.AreaId.HasValue)
            query = query.Where(p => p.AreaId == criteria.AreaId.Value);

        if (criteria.AgentId.HasValue)
            query = query.Where(p => p.AgentId == criteria.AgentId.Value);

        if (criteria.FeatureIds is { Count: > 0 } featureIds)
        {
            // ALL of them, not any: ticking "Pool" and "Gym" means a listing with both.
            // One EXISTS per feature, which SQL Server handles on the unique
            // (PropertyId, FeatureId) index.
            foreach (var featureId in featureIds)
            {
                var wanted = featureId;
                query = query.Where(p => p.PropertyFeatures.Any(pf => pf.FeatureId == wanted));
            }
        }

        if (!string.IsNullOrWhiteSpace(criteria.Furnishing))
        {
            var furnishing = criteria.Furnishing;
            query = query.Where(p => p.PropertyFeatures.Any(pf =>
                pf.Value == furnishing &&
                _db.Features.Any(f => f.Id == pf.FeatureId && f.Name == FurnishingFeatureName)));
        }

        if (!string.IsNullOrWhiteSpace(criteria.City))
            query = query.Where(p => p.Location.CityName == criteria.City);

        if (criteria.MinRooms.HasValue)
            query = query.Where(p => p.PropertySpecs.NumberOfRooms >= criteria.MinRooms.Value);

        if (criteria.MinBathrooms.HasValue)
            query = query.Where(p => p.PropertySpecs.Bathrooms >= criteria.MinBathrooms.Value);

        if (criteria.MinArea.HasValue)
            query = query.Where(p => p.PropertySpecs.AreaInSquareMeters >= criteria.MinArea.Value);

        if (criteria.MaxArea.HasValue)
            query = query.Where(p => p.PropertySpecs.AreaInSquareMeters <= criteria.MaxArea.Value);

        // A price filter cannot be answered for a listing whose price is not public: matching
        // one either leaks the figure by inference ("it came back for 3–4M") or hides it
        // dishonestly. Such listings are simply not part of a price-filtered search.
        if (criteria.MinPrice.HasValue)
            query = query.Where(p => !p.PriceOnRequest && (p.Offer != null ? p.Offer.Amount
                     : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                         : p.RentTerms != null ? p.RentTerms.Price.Amount : 0) >= criteria.MinPrice.Value);

        if (criteria.MaxPrice.HasValue)
            query = query.Where(p => !p.PriceOnRequest && (p.Offer != null ? p.Offer.Amount
                     : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                         : p.RentTerms != null ? p.RentTerms.Price.Amount : 0) <= criteria.MaxPrice.Value);

        // ---- count BEFORE paging ----------------------------------------------------
        var totalCount = await query.CountAsync(ct);
        if (totalCount == 0)
            return PagedResult<PropertyListItem>.Empty(criteria.Page, criteria.PageSize);

        // ---- sorting ------------------------------------------------------------------
        // Every ordering ends with ThenBy(p => p.Id). Without a unique tie-breaker, rows that
        // share the leading key (the demo listings were all written in the same instant) have
        // no defined order between pages, so the same listing can appear on page 1 and page 2
        // while another never appears at all.
        query = criteria.SortBy switch
        {
            // "On request" sorts last in both directions: it has no price to rank by, and
            // putting it first in an ascending sort would read as "cheapest".
            PropertySortBy.PriceAsc => query
                .OrderBy(p => p.PriceOnRequest)
                .ThenBy(p => (p.Offer != null ? p.Offer.Amount
                     : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                         : p.RentTerms != null ? p.RentTerms.Price.Amount : 0))
                .ThenByDescending(p => p.CreatedAtUtc)
                .ThenBy(p => p.Id),
            PropertySortBy.PriceDesc => query
                .OrderBy(p => p.PriceOnRequest)
                .ThenByDescending(p => (p.Offer != null ? p.Offer.Amount
                     : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                         : p.RentTerms != null ? p.RentTerms.Price.Amount : 0))
                .ThenByDescending(p => p.CreatedAtUtc)
                .ThenBy(p => p.Id),
            PropertySortBy.Oldest => query.OrderBy(p => p.CreatedAtUtc).ThenBy(p => p.Id),
            PropertySortBy.Newest => query.OrderByDescending(p => p.CreatedAtUtc).ThenBy(p => p.Id),
            // Relevance without a full-text index = editorial order: featured first, newest next.
            _ => query.OrderByDescending(p => p.IsFeatured)
                      .ThenByDescending(p => p.CreatedAtUtc)
                      .ThenBy(p => p.Id),
        };

        // ---- page + project (single SQL statement, no entities materialized) -----------
        var items = await query
            .Skip((criteria.Page - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(PublicListItem)
            .ToListAsync(ct);

        return new PagedResult<PropertyListItem>(items, criteria.Page, criteria.PageSize, totalCount);
    }

    // Pins inside a map viewport. The bounding box runs against the real float columns on
    // Properties, not against Location_X / Location_Y: those are nvarchar and a range
    // predicate over them would parse every row in the table on every pan of the map.
    public async Task<IReadOnlyList<PropertyMapItem>> GetForMapAsync(
        MapViewportCriteria criteria, CancellationToken ct = default)
    {
        var query = PubliclyVisible()
            // Null coordinates mean the address was never geocoded. Excluding them is also
            // what keeps IX_Properties_LatLng seekable instead of scanned.
            .Where(p => p.Latitude != null && p.Longitude != null)
            .Where(p => p.Latitude >= criteria.MinLat && p.Latitude <= criteria.MaxLat)
            .Where(p => p.Longitude >= criteria.MinLng && p.Longitude <= criteria.MaxLng);

        if (criteria.ListingKind is { } kind)
            query = query.Where(p => p.ListingKind == kind);

        if (criteria.PropertyTypeId is { } typeId)
            query = query.Where(p => p.PropertyTypeId == typeId);

        // Same rule as the list: a hidden price cannot take part in a price filter.
        if (criteria.MinPrice is { } minPrice)
            query = query.Where(p => !p.PriceOnRequest && (p.Offer != null ? p.Offer.Amount
                     : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                         : p.RentTerms != null ? p.RentTerms.Price.Amount : 0) >= minPrice);

        if (criteria.MaxPrice is { } maxPrice)
            query = query.Where(p => !p.PriceOnRequest && (p.Offer != null ? p.Offer.Amount
                     : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                         : p.RentTerms != null ? p.RentTerms.Price.Amount : 0) <= maxPrice);

        return await query
            // Take() has to cut something when a viewport holds more than MaxPins listings.
            // Ordering first makes that cut deliberate -- exclusives survive it -- rather
            // than whatever the storage engine happened to hand back.
            .OrderByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.CreatedAtUtc)
            .ThenBy(p => p.Id)
            .Take(criteria.Take)
            .Select(p => new PropertyMapItem(
                p.Id,
                p.Title,
                _db.Areas.Where(a => a.Id == p.AreaId).Select(a => a.Name).FirstOrDefault()
                    ?? p.Location.CityName,
                // Masked in SQL, exactly as in the list projection.
                p.PriceOnRequest ? null
                    : (p.Offer != null ? (decimal?)p.Offer.Amount
                    : p.SaleTerms != null ? (decimal?)p.SaleTerms.Price.Amount
                        : p.RentTerms != null ? (decimal?)p.RentTerms.Price.Amount : null),
                p.PriceOnRequest
                    ? null
                    : p.SaleTerms != null ? p.SaleTerms.Price.Currency
                        : p.RentTerms != null ? p.RentTerms.Price.Currency : null,
                p.PropertySpecs.NumberOfRooms,
                p.PropertySpecs.Bathrooms,
                _db.PropertyTypes.Where(t => t.Id == p.PropertyTypeId).Select(t => t.Name).FirstOrDefault(),
                p.PropertySpecs.AreaInSquareMeters,
                p.Latitude!.Value,
                p.Longitude!.Value,
                p.Media.Where(m => m.IsPrimary).Select(m => m.Url).FirstOrDefault()
                    ?? p.Media.OrderBy(m => m.Order).Select(m => m.Url).FirstOrDefault(),
                p.IsFeatured,
                p.IsOffPlan,
                p.PriceOnRequest))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<PropertyListItem>> GetFeaturedAsync(int take, CancellationToken ct = default) =>
        await PubliclyVisible()
            .Where(p => p.IsFeatured)
            .OrderByDescending(p => p.CreatedAtUtc)
            .ThenBy(p => p.Id)
            .Take(take)
            .Select(PublicListItem)
            .ToListAsync(ct);

    /// <summary>
    /// One listing's full record.
    ///
    /// <paramref name="adminView"/> is the whole difference between the two audiences:
    ///   false — a visitor. Published + active only (so an unpublished listing 404s instead of
    ///           staying reachable through its old link), and "price on request" comes back
    ///           with no figure at all.
    ///   true  — the admin panel. Any status, real figures, because that is what the edit form
    ///           has to load and save back.
    /// </summary>
    public async Task<PropertyDetailsDto?> GetDetailsAsync(
        Guid id, bool adminView = false, CancellationToken ct = default)
    {
        // Read-only projection; view counting is RecordPropertyView's job, never done here.
        var source = adminView ? _db.Properties.AsNoTracking() : PubliclyVisible();

        return await source
            .Where(p => p.Id == id)
            .Select(p => new PropertyDetailsDto(
                p.Id,
                p.Title,
                p.Description,
                p.ListingKind,
                p.Status,
                p.PropertyTypeId,
                _db.PropertyTypes.Where(t => t.Id == p.PropertyTypeId).Select(t => t.Name).FirstOrDefault() ?? "",
                new LocationDto(
                    p.Location.CountryName, p.Location.CityName, p.Location.StreetName,
                    p.Location.State, p.Location.PostalCode,
                    p.Location.XCoordinate, p.Location.YCoordinate, p.Location.Description),
                // The mask is applied in SQL. NOTE: `adminView` is a captured parameter, so EF
                // PARAMETERISES it rather than folding it away — the price columns are still
                // in the SELECT list and the CASE decides what comes back. The DTO a public
                // caller receives is correctly null either way, which is what matters; but
                // this is not the "the column is never read" guarantee an earlier version of
                // this comment claimed, and nothing should be built on top of that claim.
                p.SaleTerms != null && (adminView || !p.PriceOnRequest)
                    ? new PriceDto(p.SaleTerms.Price.Amount, p.SaleTerms.Price.Currency,
                                   p.SaleTerms.PaymentMethod.ToString())
                    : null,
                p.RentTerms != null && (adminView || !p.PriceOnRequest)
                    ? new RentDto(p.RentTerms.Price.Amount, p.RentTerms.Price.Currency,
                                  p.RentTerms.ContractDurationMonths)
                    : null,
                p.Offer != null && (adminView || !p.PriceOnRequest) ? (decimal?)p.Offer.Amount : null,
                new SpecsDto(p.PropertySpecs.NumberOfRooms, p.PropertySpecs.Bathrooms,
                             p.PropertySpecs.AreaInSquareMeters),
                p.IsFeatured,
                p.IsActive,
                p.ViewsCount,
                p.Media
                    .OrderBy(m => m.Order)
                    .Select(m => new MediaDto(m.Id, m.Url, m.MediaType, m.Width, m.Height, m.Order, m.IsPrimary))
                    .ToList(),
                p.PropertyFeatures
                    // FeatureDto is (FeatureId, Name, Value, Icon). The join used to pass
                    // (f.Id, f.Name, f.Icon, pf.Value), which type-checks because both are
                    // strings but puts the icon in Value and the value in Icon -- so every
                    // Text feature (Furnishing, Floor Number, Kitchen Type...) read back the
                    // wrong field. Argument order corrected here.
                    .Join(_db.Features, pf => pf.FeatureId, f => f.Id,
                          (pf, f) => new FeatureDto(f.Id, f.Name, pf.Value, f.Icon))
                    .ToList(),
                p.AreaId,
                _db.Areas.Where(a => a.Id == p.AreaId).Select(a => a.Name).FirstOrDefault())
            {
                // Object initialiser, not constructor arguments: Latitude/Longitude are init
                // members on the record so adding them here changed no existing call site.
                Latitude = p.Latitude,
                Longitude = p.Longitude,
                // The assigned consultant, joined here so the public page needs no second call.
                // A DEACTIVATED agent is withheld from visitors: the public roster hides them,
                // and a contact card is an invitation to phone someone who no longer works here.
                Agent = _db.Agents
                    .Where(a => a.Id == p.AgentId && (adminView || a.IsActive))
                    .Select(a => new PropertyAgentDto(
                        a.Id, a.Name, a.JobTitle, a.PhotoUrl, a.Slug, a.Phone, a.WhatsApp))
                    .FirstOrDefault(),
                IsOffPlan = p.IsOffPlan,
                PriceOnRequest = p.PriceOnRequest,
            })
            .FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<PropertyListItem>> GetRelatedAsync(Guid id, int take, CancellationToken ct = default)
    {
        // Anchor values first (tiny query), then one related query — mirrors the doc's algorithm:
        // same ListingKind AND (same type OR same city), published, excluding self.
        //
        // The anchor is read from the PUBLIC set too: "related to" a listing a visitor cannot
        // see is not something a visitor gets to ask.
        var anchor = await PubliclyVisible()
            .Where(p => p.Id == id)
            .Select(p => new { p.ListingKind, p.PropertyTypeId, City = p.Location.CityName })
            .FirstOrDefaultAsync(ct);

        if (anchor is null) return Array.Empty<PropertyListItem>();

        return await PubliclyVisible()
            .Where(p => p.Id != id
                     && p.ListingKind == anchor.ListingKind
                     && (p.PropertyTypeId == anchor.PropertyTypeId || p.Location.CityName == anchor.City))
            .OrderByDescending(p => p.CreatedAtUtc)
            .ThenBy(p => p.Id)
            .Take(take)
            .Select(PublicListItem)
            .ToListAsync(ct);
    }

    public async Task<DashboardStatisticsDto> GetDashboardStatisticsAsync(
        int year, Guid? ownerScopeUserId, CancellationToken ct = default)
    {
        IQueryable<Property> props = _db.Properties.AsNoTracking();
        if (ownerScopeUserId.HasValue)
            props = props.Where(p => p.CreatedBy == ownerScopeUserId.Value);

        // NEW properties: the month the row was CREATED. Grouped in SQL (DATEPART).
        var created = await props
            .Where(p => p.CreatedAtUtc.Year == year)
            .GroupBy(p => p.CreatedAtUtc.Month)
            .Select(g => new { Month = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        // STATUS events: the month the status CHANGED, from the history trail the
        // publication commands write — never inferred from CreatedAtUtc.
        IQueryable<PropertyStatusHistory> hist = _db.PropertyStatusHistories.AsNoTracking();
        if (ownerScopeUserId.HasValue)
            hist = hist.Where(h => _db.Properties.Any(
                p => p.Id == h.PropertyId && p.CreatedBy == ownerScopeUserId.Value));

        var events = await hist
            .Where(h => h.CreatedAtUtc.Year == year)
            .GroupBy(h => new { h.CreatedAtUtc.Month, h.NewStatus })
            .Select(g => new { g.Key.Month, g.Key.NewStatus, Count = g.Count() })
            .ToListAsync(ct);

        // Leads share the monthly-statistics architecture: grouped in SQL by CreatedAtUtc.
        var leads = await _db.Leads.AsNoTracking()
            .Where(l => l.CreatedAtUtc.Year == year)
            .GroupBy(l => l.CreatedAtUtc.Month)
            .Select(g => new { Month = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var firstYear = await props.MinAsync(p => (int?)p.CreatedAtUtc.Year, ct)
            ?? DateTime.UtcNow.Year;
        var availableYears = Enumerable
            .Range(firstYear, Math.Max(1, DateTime.UtcNow.Year - firstYear + 1))
            .Reverse()
            .ToList();

        int EventCount(int month, PropertyStatus status) =>
            events.FirstOrDefault(e => e.Month == month && e.NewStatus == status)?.Count ?? 0;

        // Always 12 months, zero-filled — an empty month is information, not noise.
        var months = Enumerable.Range(1, 12).Select(m => new MonthlyStatisticsDto(
            m,
            System.Globalization.CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(m),
            created.FirstOrDefault(c => c.Month == m)?.Count ?? 0,
            EventCount(m, PropertyStatus.Published),
            EventCount(m, PropertyStatus.Sold),
            EventCount(m, PropertyStatus.Rented),
            EventCount(m, PropertyStatus.Archived),
            leads.FirstOrDefault(x => x.Month == m)?.Count ?? 0)).ToList();

        return new DashboardStatisticsDto(year, availableYears, months);
    }

    public async Task<MostViewedPropertiesDto> GetMostViewedAsync(
        int take, Guid? ownerScopeUserId, CancellationToken ct = default)
    {
        IQueryable<Property> query = _db.Properties.AsNoTracking();
        if (ownerScopeUserId.HasValue)
            query = query.Where(p => p.CreatedBy == ownerScopeUserId.Value);

        // ViewsCount is the aggregate PropertyViewRecorder maintains with a single UPDATE
        // per view, so "most viewed" is an ORDER BY on an int column and "total" is a SUM —
        // both run entirely in SQL, no view rows ever travel to the app.
        var totalViews = await query.SumAsync(p => (long)p.ViewsCount, ct);

        var items = await query
            .OrderByDescending(p => p.ViewsCount)
            .ThenByDescending(p => p.CreatedAtUtc)
            .ThenBy(p => p.Id)
            .Take(take)
            .Select(p => new MostViewedPropertyItemDto(
                p.Id,
                p.Title,
                p.Location.CityName,
                p.ListingKind,
                p.Status,
                p.SaleTerms != null ? (decimal?)p.SaleTerms.Price.Amount
                    : p.RentTerms != null ? (decimal?)p.RentTerms.Price.Amount : null,
                p.SaleTerms != null ? p.SaleTerms.Price.Currency
                    : p.RentTerms != null ? p.RentTerms.Price.Currency : null,
                p.Media.Where(m => m.IsPrimary).Select(m => m.Url).FirstOrDefault(),
                p.ViewsCount))
            .ToListAsync(ct);

        return new MostViewedPropertiesDto(totalViews, items);
    }

    public async Task<PagedResult<AdminPropertyListItemDto>> ListForAdminAsync(
        AdminPropertyFilter filter, CancellationToken ct = default)
    {
        IQueryable<Property> query = _db.Properties.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Text))
        {
            var pattern = $"%{EscapeLikePattern(filter.Text)}%";
            query = query.Where(p => EF.Functions.Like(p.Title, pattern, LikeEscapeCharacter));
        }

        if (filter.Status.HasValue) query = query.Where(p => p.Status == filter.Status.Value);
        if (filter.ListingKind.HasValue) query = query.Where(p => p.ListingKind == filter.ListingKind.Value);
        if (filter.IsFeatured.HasValue) query = query.Where(p => p.IsFeatured == filter.IsFeatured.Value);
        if (filter.IsActive.HasValue) query = query.Where(p => p.IsActive == filter.IsActive.Value);
        if (filter.AreaId.HasValue) query = query.Where(p => p.AreaId == filter.AreaId.Value);
        if (filter.AgentId.HasValue) query = query.Where(p => p.AgentId == filter.AgentId.Value);
        if (filter.PropertyTypeId.HasValue) query = query.Where(p => p.PropertyTypeId == filter.PropertyTypeId.Value);

        // Ownership scoping was DECIDED in Application (handler). Here it is only APPLIED.
        if (filter.OwnerScopeUserId.HasValue)
            query = query.Where(p => p.CreatedBy == filter.OwnerScopeUserId.Value);

        var totalCount = await query.CountAsync(ct);
        if (totalCount == 0)
            return PagedResult<AdminPropertyListItemDto>.Empty(filter.Page, filter.PageSize);

        var items = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .ThenBy(p => p.Id)                       // stable paging; see SearchAsync
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(p => new AdminPropertyListItemDto(
                p.Id,
                p.Title,
                p.ListingKind,
                p.Status,
                p.IsFeatured,
                p.IsActive,
                // The admin grid shows the real figure whatever the flag says — hiding it from
                // the people who set it would make the flag unmanageable.
                (p.Offer != null ? (decimal?)p.Offer.Amount
                    : p.SaleTerms != null ? (decimal?)p.SaleTerms.Price.Amount
                        : p.RentTerms != null ? (decimal?)p.RentTerms.Price.Amount : null),
                p.SaleTerms != null ? p.SaleTerms.Price.Currency
                    : p.RentTerms != null ? p.RentTerms.Price.Currency : null,
                p.Location.CityName,
                _db.Areas.Where(a => a.Id == p.AreaId).Select(a => a.Name).FirstOrDefault(),
                _db.PropertyTypes.Where(t => t.Id == p.PropertyTypeId).Select(t => t.Name).FirstOrDefault(),
                p.Media.Where(m => m.IsPrimary).Select(m => m.Url).FirstOrDefault()
                    ?? p.Media.OrderBy(m => m.Order).Select(m => m.Url).FirstOrDefault(),
                p.ViewsCount,
                p.CreatedBy,
                p.CreatedAtUtc.DateTime,
                p.AgentId,
                _db.Agents.Where(a => a.Id == p.AgentId).Select(a => a.Name).FirstOrDefault(),
                p.IsOffPlan,
                p.PriceOnRequest)
            {
                AreaId = p.AreaId,
                PropertyTypeId = p.PropertyTypeId,
            })
            .ToListAsync(ct);

        return new PagedResult<AdminPropertyListItemDto>(items, filter.Page, filter.PageSize, totalCount);
    }

    public async Task<IReadOnlyList<PropertyStatusHistoryDto>> GetStatusHistoryAsync(
        Guid propertyId, CancellationToken ct = default) =>
        await _db.PropertyStatusHistories
            .AsNoTracking()
            .Where(h => h.PropertyId == propertyId)
            .OrderByDescending(h => h.CreatedAtUtc)          // newest change first
            .Select(h => new PropertyStatusHistoryDto(
                h.Id,
                h.PropertyId,
                h.OldStatus,
                h.NewStatus,
                h.Reason,
                h.CreatedBy,                                  // ChangedBy  ← audit CreatedBy
                h.CreatedAtUtc.DateTime))                     // ChangedOnUtc ← audit CreatedAtUtc
            .ToListAsync(ct);

    /// <summary>True when the listing exists AND a visitor is allowed to see it.</summary>
    public Task<bool> IsPubliclyVisibleAsync(Guid id, CancellationToken ct = default) =>
        PubliclyVisible().AnyAsync(p => p.Id == id, ct);

    // ---- shared pieces ----------------------------------------------------------------------

    // The catalog feature whose VALUE is the furnishing level ("Furnished", "Unfurnished"…).
    // One name, used by the filter above and by the frontend's form.
    private const string FurnishingFeatureName = "Furnishing";

    // SQL Server LIKE wildcards. Without an ESCAPE clause a visitor typing "50%" searches for
    // "50" followed by anything.
    //
    // A string, not a char: EF.Functions.Like's fourth parameter is `string? escapeCharacter`,
    // and C# has no implicit char → string conversion, so a char here is a compile error at
    // every call site.
    private const string LikeEscapeCharacter = "\\";

    private static string EscapeLikePattern(string value) => value
        .Replace("\\", "\\\\")
        .Replace("%", "\\%")
        .Replace("_", "\\_")
        .Replace("[", "\\[");


    // Shared projection so every PUBLIC list endpoint returns identical shapes — including the
    // price masking, which is the whole point of having one of these.
    // Cover image = primary media, or the first by Order if no primary is set.
    private System.Linq.Expressions.Expression<Func<Property, PropertyListItem>> PublicListItem =>
        p => new PropertyListItem(
            p.Id,
            p.Title,
            p.ListingKind,
            p.Status,
            p.PriceOnRequest ? null
                : p.SaleTerms != null ? (decimal?)p.SaleTerms.Price.Amount
                    : p.RentTerms != null ? (decimal?)p.RentTerms.Price.Amount : null,
            p.PriceOnRequest ? null : p.Offer != null ? (decimal?)p.Offer.Amount : null,
            p.PriceOnRequest ? null
                : p.SaleTerms != null ? p.SaleTerms.Price.Currency
                    : p.RentTerms != null ? p.RentTerms.Price.Currency : null,
            p.Location.CityName,
            p.Media.Where(m => m.IsPrimary).Select(m => m.Url).FirstOrDefault()
                ?? p.Media.OrderBy(m => m.Order).Select(m => m.Url).FirstOrDefault(),
            p.PropertySpecs.NumberOfRooms,
            p.PropertySpecs.Bathrooms,
            p.PropertySpecs.AreaInSquareMeters,
            p.IsFeatured,
            // Card-level presentation flags. Features are deliberately NOT joined here: a list
            // endpoint stays one row per card, so Balcony/Furnishing only appear on the details
            // page, which already loads the full feature set.
            p.IsOffPlan,
            p.PriceOnRequest,
            // The catalog links the cards, the area page and the agent page filter on.
            p.AreaId,
            _db.Areas.Where(a => a.Id == p.AreaId).Select(a => a.Name).FirstOrDefault(),
            p.PropertyTypeId,
            _db.PropertyTypes.Where(t => t.Id == p.PropertyTypeId).Select(t => t.Name).FirstOrDefault(),
            p.AgentId,
            p.Location.StreetName);
}
