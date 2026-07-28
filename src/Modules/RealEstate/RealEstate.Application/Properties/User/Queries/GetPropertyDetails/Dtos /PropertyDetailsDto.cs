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
    string? AreaName = null);
