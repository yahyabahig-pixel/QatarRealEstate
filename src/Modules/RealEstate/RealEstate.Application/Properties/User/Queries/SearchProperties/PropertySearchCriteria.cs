using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.User.Queries.SearchProperties;

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
    int PageSize,
    // Filters the public pages need in SQL rather than in the browser. Before these existed,
    // the area page, the agent page and the amenity filters all worked by filtering the list
    // the browser happened to be holding — and the list DTO carried no area, no type and no
    // agent, so every one of them matched nothing and the pages read "0 properties".
    Guid? AreaId = null,
    Guid? AgentId = null,
    IReadOnlyList<Guid>? FeatureIds = null,   // listing must carry ALL of them
    // …and must carry NONE of these. "بدون مسبح" / "without a pool" is a real condition a
    // visitor states, and until this existed the only thing the site could do with it was
    // stop REQUIRING a pool — which answers "without a pool" with the pools.
    IReadOnlyList<Guid>? ExcludeFeatureIds = null,
    string? Furnishing = null);               // value of the "Furnishing" catalog feature

public enum PropertySortBy { Relevance = 0, PriceAsc, PriceDesc, Newest, Oldest }

public sealed record PropertyListItem(
    Guid Id,
    string Title,
    ListingKind ListingKind,
    PropertyStatus Status,
    // NULL when the listing is marked "price on request". The public endpoints mask it in SQL
    // rather than trusting each client to hide it: a number that reaches the browser is
    // published, whatever the page chooses to draw.
    decimal? Price,
    decimal? OfferPrice,
    string? Currency,
    string City,
    string? CoverImageUrl,
    int NumberOfRooms,
    int Bathrooms,
    decimal AreaInSquareMeters,
    bool IsFeatured,
    // Card badges. Trailing and defaulted so every existing construction site of this
    // positional record keeps compiling untouched.
    bool IsOffPlan = false,
    bool PriceOnRequest = false,
    // Catalog links the cards and the area/agent pages need. One extra join each, and they
    // turn three broken pages into working ones.
    Guid? AreaId = null,
    string? AreaName = null,
    Guid? PropertyTypeId = null,
    string? PropertyTypeName = null,
    Guid? AgentId = null,
    string? District = null);
