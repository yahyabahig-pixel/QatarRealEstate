using RealEstate.Domain.Enums;
namespace RealEstate.Application.Properties.Admin.Queries.ListPropertiesForAdmin.Inputs;

public sealed record AdminPropertyListItemDto(
    Guid Id,
    string Title,
    ListingKind ListingKind,
    PropertyStatus Status,
    bool IsFeatured,
    bool IsActive,
    decimal? Price,
    string? Currency,
    string City,
    int ViewsCount,
    Guid? CreatedBy,
    DateTime CreatedOnUtc);