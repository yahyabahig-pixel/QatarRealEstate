// Data/Queries/PropertyQueries.cs
using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Properties.Admin.ListPropertiesForAdmin;
using RealEstate.Application.Properties.Admin.Queries.GetPropertyStatusHistory;
using RealEstate.Application.Properties.Admin.Queries.ListPropertiesForAdmin.Inputs;
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
                _db.Areas.Where(a => a.Id == p.AreaId).Select(a => a.Name).FirstOrDefault()))
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