using RealEstate.Domain.Enums;
namespace RealEstate.Application.Properties.Admin.Queries.ListPropertiesForAdmin.Inputs;

public sealed record AdminPropertyFilter(
    string? Text,
    PropertyStatus? Status,
    ListingKind? ListingKind,
    bool? IsFeatured,
    bool? IsActive,
    Guid? OwnerScopeUserId,
    int Page,
    int PageSize,
    // The admin grid's own filters, answered in SQL. They used to be applied in the browser
    // against whatever page the grid happened to be holding, which quietly made them wrong the
    // moment the portfolio outgrew one page.
    Guid? AreaId = null,
    Guid? AgentId = null,
    Guid? PropertyTypeId = null);
