using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Properties.Admin.Queries.GetPropertyStatusHistory;
using RealEstate.Application.Properties.Admin.Queries.GetDashboardStatistics;
using RealEstate.Application.Properties.Admin.Queries.GetMostViewedProperties;
using RealEstate.Application.Properties.Admin.Queries.ListPropertiesForAdmin.Inputs;
using RealEstate.Application.Properties.User.Queries.GetPropertiesForMap;
using RealEstate.Application.Properties.User.Queries.GetPropertyDetails.Dtos;
using RealEstate.Application.Properties.User.Queries.SearchProperties;

public interface IPropertyQueries
{
    // ---- public read side: published + active only, prices masked when "on request" --------
    Task<PagedResult<PropertyListItem>> SearchAsync(PropertySearchCriteria criteria, CancellationToken ct = default);
    Task<IReadOnlyList<PropertyListItem>> GetFeaturedAsync(int take, CancellationToken ct = default);
    Task<IReadOnlyList<PropertyListItem>> GetRelatedAsync(Guid id, int take, CancellationToken ct = default);
    Task<IReadOnlyList<PropertyMapItem>> GetForMapAsync(MapViewportCriteria criteria, CancellationToken ct = default);

    /// <summary>
    /// One listing's record. adminView = false is the visitor's view: published and active
    /// only, with no figure for a "price on request" listing. adminView = true is the admin
    /// panel's: any status, real figures. The two are one method because they are one
    /// projection — splitting them is how they drift apart.
    /// </summary>
    Task<PropertyDetailsDto?> GetDetailsAsync(Guid id, bool adminView = false, CancellationToken ct = default);

    /// <summary>True when the listing exists AND a visitor is allowed to see it.</summary>
    Task<bool> IsPubliclyVisibleAsync(Guid id, CancellationToken ct = default);

    // ---- admin read side --------------------------------------------------------------------
    // Admin analytics: 12 zero-filled months of real activity for one year, grouped in
    // SQL (properties by CreatedAtUtc, status events by their history timestamps).
    Task<DashboardStatisticsDto> GetDashboardStatisticsAsync(
        int year, Guid? ownerScopeUserId, CancellationToken ct = default);

    // Admin analytics: top-N by the aggregate ViewsCount, plus the portfolio total.
    // Sorting/aggregation happen in SQL — never by loading properties into memory.
    Task<MostViewedPropertiesDto> GetMostViewedAsync(
        int take, Guid? ownerScopeUserId, CancellationToken ct = default);

    Task<PagedResult<AdminPropertyListItemDto>> ListForAdminAsync(AdminPropertyFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<PropertyStatusHistoryDto>> GetStatusHistoryAsync(Guid propertyId, CancellationToken ct = default);
}
