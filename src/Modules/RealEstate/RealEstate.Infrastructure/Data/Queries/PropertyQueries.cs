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

public sealed class PropertyQueries : IPropertyQueries
{
    private readonly RealEstateDbContext _db;
    public PropertyQueries(RealEstateDbContext db) => _db = db;

    // Effective price used for filtering/sorting: the offer wins; otherwise sale or rent price.
    // Written inline in expressions below so EF translates it to SQL (COALESCE/CASE).

    public async Task<PagedResult<PropertyListItem>> SearchAsync(
        PropertySearchCriteria criteria, CancellationToken ct = default)
    {
        IQueryable<Property> query = _db.Properties
            .AsNoTracking()
            .Where(p => p.Status == PropertyStatus.Published && p.IsActive);

        // ---- dynamic filters --------------------------------------------------------
        if (!string.IsNullOrWhiteSpace(criteria.Text))
        {
            // SQL Server LIKE-based search. If you later add a full-text index, swap this
            // for EF.Functions.FreeText / Contains — that's the only line that changes.
            var pattern = $"%{criteria.Text}%";
            query = query.Where(p =>
                EF.Functions.Like(p.Title, pattern) ||
                EF.Functions.Like(p.Description, pattern) ||
                EF.Functions.Like(p.Location.CityName, pattern));
        }

        if (criteria.ListingKind.HasValue)
            query = query.Where(p => p.ListingKind == criteria.ListingKind.Value);

        if (criteria.PropertyTypeId.HasValue)
            query = query.Where(p => p.PropertyTypeId == criteria.PropertyTypeId.Value);

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

        if (criteria.MinPrice.HasValue)
            query = query.Where(p =>
                (p.Offer != null ? p.Offer.Amount
                 : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                 : p.RentTerms != null ? p.RentTerms.Price.Amount : 0) >= criteria.MinPrice.Value);

        if (criteria.MaxPrice.HasValue)
            query = query.Where(p =>
                (p.Offer != null ? p.Offer.Amount
                 : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                 : p.RentTerms != null ? p.RentTerms.Price.Amount : 0) <= criteria.MaxPrice.Value);

        // ---- count BEFORE paging ----------------------------------------------------
        var totalCount = await query.CountAsync(ct);
        if (totalCount == 0)
            return PagedResult<PropertyListItem>.Empty(criteria.Page, criteria.PageSize);

        // ---- sorting ------------------------------------------------------------------
        query = criteria.SortBy switch
        {
            PropertySortBy.PriceAsc => query
                .OrderBy(p => p.Offer != null ? p.Offer.Amount
                            : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                            : p.RentTerms != null ? p.RentTerms.Price.Amount : 0)
                .ThenByDescending(p => p.CreatedAtUtc),
            PropertySortBy.PriceDesc => query
                .OrderByDescending(p => p.Offer != null ? p.Offer.Amount
                            : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                            : p.RentTerms != null ? p.RentTerms.Price.Amount : 0)
                .ThenByDescending(p => p.CreatedAtUtc),
            PropertySortBy.Oldest => query.OrderBy(p => p.CreatedAtUtc),
            PropertySortBy.Newest => query.OrderByDescending(p => p.CreatedAtUtc),
            // Relevance without a full-text index = editorial order: featured first, newest next.
            _ => query.OrderByDescending(p => p.IsFeatured).ThenByDescending(p => p.CreatedAtUtc),
        };

        // ---- page + project (single SQL statement, no entities materialized) -----------
        var items = await query
            .Skip((criteria.Page - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(ProjectToListItem())
            .ToListAsync(ct);

        return new PagedResult<PropertyListItem>(items, criteria.Page, criteria.PageSize, totalCount);
    }

    // Pins inside a map viewport. The bounding box runs against the real float columns on
    // Properties, not against Location_X / Location_Y: those are nvarchar and a range
    // predicate over them would parse every row in the table on every pan of the map.
    public async Task<IReadOnlyList<PropertyMapItem>> GetForMapAsync(
        MapViewportCriteria criteria, CancellationToken ct = default)
    {
        var query = _db.Properties
            .AsNoTracking()
            // Same visibility rule as the public search. A pin the user cannot open is worse
            // than no pin at all.
            .Where(p => p.Status == PropertyStatus.Published && p.IsActive)
            // Null coordinates mean the address was never geocoded. Excluding them is also
            // what keeps IX_Properties_LatLng seekable instead of scanned.
            .Where(p => p.Latitude != null && p.Longitude != null)
            .Where(p => p.Latitude >= criteria.MinLat && p.Latitude <= criteria.MaxLat)
            .Where(p => p.Longitude >= criteria.MinLng && p.Longitude <= criteria.MaxLng);

        if (criteria.ListingKind is { } kind)
            query = query.Where(p => p.ListingKind == kind);

        if (criteria.PropertyTypeId is { } typeId)
            query = query.Where(p => p.PropertyTypeId == typeId);

        // Effective price, same coalesce the search query uses: an accepted offer wins over
        // the asking price, otherwise sale or rent, whichever the listing carries.
        if (criteria.MinPrice is { } minPrice)
            query = query.Where(p => (p.Offer != null ? p.Offer.Amount
                                    : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                                    : p.RentTerms != null ? p.RentTerms.Price.Amount : 0) >= minPrice);

        if (criteria.MaxPrice is { } maxPrice)
            query = query.Where(p => (p.Offer != null ? p.Offer.Amount
                                    : p.SaleTerms != null ? p.SaleTerms.Price.Amount
                                    : p.RentTerms != null ? p.RentTerms.Price.Amount : 0) <= maxPrice);

        return await query
            // Take() has to cut something when a viewport holds more than MaxPins listings.
            // Ordering first makes that cut deliberate -- exclusives survive it -- rather
            // than whatever the storage engine happened to hand back.
            .OrderByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.CreatedAtUtc)
            .Take(criteria.Take)
            .Select(p => new PropertyMapItem(
                p.Id,
                p.Title,
                _db.Areas.Where(a => a.Id == p.AreaId).Select(a => a.Name).FirstOrDefault()
                    ?? p.Location.CityName,
                p.Offer != null ? (decimal?)p.Offer.Amount
                    : p.SaleTerms != null ? (decimal?)p.SaleTerms.Price.Amount
                    : p.RentTerms != null ? (decimal?)p.RentTerms.Price.Amount : null,
                p.SaleTerms != null ? p.SaleTerms.Price.Currency
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
                p.IsOffPlan))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<PropertyListItem>> GetFeaturedAsync(int take, CancellationToken ct = default) =>
        await _db.Properties
            .AsNoTracking()
            .Where(p => p.Status == PropertyStatus.Published && p.IsActive && p.IsFeatured)
            .OrderByDescending(p => p.CreatedAtUtc)
            .Take(take)
            .Select(ProjectToListItem())
            .ToListAsync(ct);

    public async Task<PropertyDetailsDto?> GetDetailsAsync(Guid id, CancellationToken ct = default)
    {
        // Read-only projection; view counting is RecordPropertyView's job, never done here.
        return await _db.Properties
            .AsNoTracking()
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
                p.SaleTerms != null
                    ? new PriceDto(p.SaleTerms.Price.Amount, p.SaleTerms.Price.Currency,
                                   p.SaleTerms.PaymentMethod.ToString())
                    : null,
                p.RentTerms != null
                    ? new RentDto(p.RentTerms.Price.Amount, p.RentTerms.Price.Currency,
                                  p.RentTerms.ContractDurationMonths)
                    : null,
                p.Offer != null ? (decimal?)p.Offer.Amount : null,
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
                    .Join(_db.Features, pf => pf.FeatureId, f => f.Id,
                          (pf, f) => new FeatureDto(f.Id, f.Name, f.Icon, pf.Value))
                    .ToList(),
                p.AreaId,
                _db.Areas.Where(a => a.Id == p.AreaId).Select(a => a.Name).FirstOrDefault())
            {
                // Object initialiser, not constructor arguments: Latitude/Longitude are init
                // members on the record so adding them here changed no existing call site.
                Latitude = p.Latitude,
                Longitude = p.Longitude,
            })
            .FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<PropertyListItem>> GetRelatedAsync(Guid id, int take, CancellationToken ct = default)
    {
        // Anchor values first (tiny query), then one related query — mirrors the doc's algorithm:
        // same ListingKind AND (same type OR same city), published, excluding self.
        var anchor = await _db.Properties
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new { p.ListingKind, p.PropertyTypeId, City = p.Location.CityName })
            .FirstOrDefaultAsync(ct);

        if (anchor is null) return Array.Empty<PropertyListItem>();

        return await _db.Properties
            .AsNoTracking()
            .Where(p => p.Id != id
                     && p.Status == PropertyStatus.Published
                     && p.IsActive
                     && p.ListingKind == anchor.ListingKind
                     && (p.PropertyTypeId == anchor.PropertyTypeId || p.Location.CityName == anchor.City))
            .OrderByDescending(p => p.CreatedAtUtc)
            .Take(take)
            .Select(ProjectToListItem())
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
        // publication commands already write — never inferred from CreatedAtUtc.
        IQueryable<PropertyStatusHistory> hist = _db.PropertyStatusHistories.AsNoTracking();
        if (ownerScopeUserId.HasValue)
            hist = hist.Where(h => _db.Properties.Any(
                p => p.Id == h.PropertyId && p.CreatedBy == ownerScopeUserId.Value));

        var events = await hist
            .Where(h => h.CreatedAtUtc.Year == year)
            .GroupBy(h => new { h.CreatedAtUtc.Month, h.NewStatus })
            .Select(g => new { g.Key.Month, g.Key.NewStatus, Count = g.Count() })
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
            EventCount(m, PropertyStatus.Archived))).ToList();

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
            var pattern = $"%{filter.Text}%";
            query = query.Where(p => EF.Functions.Like(p.Title, pattern));
        }

        if (filter.Status.HasValue) query = query.Where(p => p.Status == filter.Status.Value);
        if (filter.ListingKind.HasValue) query = query.Where(p => p.ListingKind == filter.ListingKind.Value);
        if (filter.IsFeatured.HasValue) query = query.Where(p => p.IsFeatured == filter.IsFeatured.Value);
        if (filter.IsActive.HasValue) query = query.Where(p => p.IsActive == filter.IsActive.Value);

        // Ownership scoping was DECIDED in Application (handler). Here it is only APPLIED.
        if (filter.OwnerScopeUserId.HasValue)
            query = query.Where(p => p.CreatedBy == filter.OwnerScopeUserId.Value);

        var totalCount = await query.CountAsync(ct);
        if (totalCount == 0)
            return PagedResult<AdminPropertyListItemDto>.Empty(filter.Page, filter.PageSize);

        var items = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(p => new AdminPropertyListItemDto(
                p.Id,
                p.Title,
                p.ListingKind,
                p.Status,
                p.IsFeatured,
                p.IsActive,
                p.SaleTerms != null ? (decimal?)p.SaleTerms.Price.Amount
                    : p.RentTerms != null ? (decimal?)p.RentTerms.Price.Amount : null,
                p.SaleTerms != null ? p.SaleTerms.Price.Currency
                    : p.RentTerms != null ? p.RentTerms.Price.Currency : null,
                p.Location.CityName,
                _db.Areas.Where(a => a.Id == p.AreaId).Select(a => a.Name).FirstOrDefault(),
                _db.PropertyTypes.Where(t => t.Id == p.PropertyTypeId).Select(t => t.Name).FirstOrDefault(),
                p.Media.Where(m => m.IsPrimary).Select(m => m.Url).FirstOrDefault()
                    ?? p.Media.OrderBy(m => m.Order).Select(m => m.Url).FirstOrDefault(),
                p.ViewsCount,
                p.CreatedBy,
                p.CreatedAtUtc.DateTime))
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
                h.CreatedAtUtc.DateTime))                              // ChangedOnUtc ← audit CreatedAtUtc
            .ToListAsync(ct);

    // Shared projection so every list endpoint returns identical shapes.
    // Cover image = primary media, or the first by Order if no primary is set.
    private static System.Linq.Expressions.Expression<Func<Property, PropertyListItem>> ProjectToListItem() =>
        p => new PropertyListItem(
            p.Id,
            p.Title,
            p.ListingKind,
            p.Status,
            p.SaleTerms != null ? (decimal?)p.SaleTerms.Price.Amount
                : p.RentTerms != null ? (decimal?)p.RentTerms.Price.Amount : null,
            p.Offer != null ? (decimal?)p.Offer.Amount : null,
            p.SaleTerms != null ? p.SaleTerms.Price.Currency
                : p.RentTerms != null ? p.RentTerms.Price.Currency : null,
            p.Location.CityName,
            p.Media.Where(m => m.IsPrimary).Select(m => m.Url).FirstOrDefault()
                ?? p.Media.OrderBy(m => m.Order).Select(m => m.Url).FirstOrDefault(),
            p.PropertySpecs.NumberOfRooms,
            p.PropertySpecs.Bathrooms,
            p.PropertySpecs.AreaInSquareMeters,
            p.IsFeatured);
}