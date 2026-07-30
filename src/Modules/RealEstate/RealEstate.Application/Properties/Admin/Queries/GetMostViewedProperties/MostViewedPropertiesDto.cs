using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.Admin.Queries.GetMostViewedProperties;

// One row of the dashboard's "Most Viewed Properties" table. ViewsCount is the aggregate
// counter PropertyViewRecorder maintains on the Properties row — the single source of
// truth for what a "view" means (one increment per RecordAsync call).
public sealed record MostViewedPropertyItemDto(
    Guid Id,
    string Title,
    string City,
    ListingKind ListingKind,
    PropertyStatus Status,
    decimal? Price,
    string? Currency,
    string? CoverImageUrl,
    int ViewsCount);

public sealed record MostViewedPropertiesDto(
    long TotalViews,
    IReadOnlyList<MostViewedPropertyItemDto> Items);
