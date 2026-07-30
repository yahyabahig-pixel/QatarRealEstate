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
    string? Area,
    string? PropertyType,
    string? CoverImageUrl,
    int ViewsCount,
    Guid? CreatedBy,
    DateTime CreatedOnUtc,
    Guid? AgentId = null,
    string? AgentName = null,
    // Presentation flags so the admin grid can round-trip them without a details call.
    // Trailing and defaulted: existing positional construction keeps compiling.
    bool IsOffPlan = false,
    bool PriceOnRequest = false);