using RealEstate.Domain.Enums;
namespace RealEstate.Application.Properties.User.Queries.GetPropertyDetails.Dtos;

public sealed record PropertyDetailsDto(
    Guid Id,
    string Title,
    string Description,
    ListingKind ListingKind,
    PropertyStatus Status,
    Guid PropertyTypeId,
    string PropertyTypeName,
    LocationDto Location,
    PriceDto? Sale,
    RentDto? Rent,
    decimal? OfferPrice,
    SpecsDto Specs,
    bool IsFeatured,
    bool IsActive,
    int ViewsCount,
    IReadOnlyList<MediaDto> Media,
    IReadOnlyList<FeatureDto> Features,
    Guid? AreaId = null,          // catalog Area link (null = not filed under an area)
    string? AreaName = null)
{
    // Numeric mirror of Location.Y / Location.X, carried on Property itself and set on every
    // write. Declared as init members rather than positional parameters so the EF projection
    // can fill them with an object initialiser without disturbing any existing call site.
    //
    // Both null means "we do not know where this is" -- half a coordinate is treated as none
    // at all -- and the detail page hides its whole map block on exactly that signal, rather
    // than dropping a pin somewhere plausible and wrong.
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
}
