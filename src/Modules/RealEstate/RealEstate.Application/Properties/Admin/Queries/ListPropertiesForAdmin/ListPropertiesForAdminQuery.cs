using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Queries.ListPropertiesForAdmin.Inputs;
using RealEstate.Domain.Enums;

public sealed record ListPropertiesForAdminQuery(
    string? Q = null,
    PropertyStatus? Status = null,
    ListingKind? ListingKind = null,
    bool? IsFeatured = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 24,
    Guid? AreaId = null,
    Guid? AgentId = null,
    Guid? PropertyTypeId = null) : IQuery<PagedResult<AdminPropertyListItemDto>>;
