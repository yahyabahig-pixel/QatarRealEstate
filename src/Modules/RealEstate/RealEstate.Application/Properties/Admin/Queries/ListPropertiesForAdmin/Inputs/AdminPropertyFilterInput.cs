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
    int PageSize);