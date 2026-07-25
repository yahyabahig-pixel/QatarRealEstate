using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.User.SearchProperties;

public record PropertySearchCriteria(
       string? Text,
    ListingKind? ListingKind,
    Guid? PropertyTypeId,
    string? City,
    int? MinRooms,
    int? MinBathrooms,
    decimal? MinArea,
    decimal? MaxArea,
    decimal? MinPrice,
    decimal? MaxPrice,
    PropertySortBy SortBy,
    int Page,
    int PageSize);

public enum PropertySortBy { Relevance = 0, PriceAsc, PriceDesc, Newest, Oldest }

public sealed record PropertyListItem(
    Guid Id,
    string Title,
    ListingKind ListingKind,
    PropertyStatus Status,
    decimal? Price,
    decimal? OfferPrice,
    string? Currency,
    string City,
    string? CoverImageUrl,
    int NumberOfRooms,
    int Bathrooms,
    decimal AreaInSquareMeters,
    bool IsFeatured);