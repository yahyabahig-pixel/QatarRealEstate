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
    bool PriceOnRequest = false)
{
    // Ids beside the display names, so the grid's Area and Type filters can send an id to the
    // server instead of matching on a name in the browser. Init members for the same reason as
    // the coordinates on PropertyDetailsDto: no existing call site changes.
    public Guid? AreaId { get; init; }
    public Guid? PropertyTypeId { get; init; }
}
