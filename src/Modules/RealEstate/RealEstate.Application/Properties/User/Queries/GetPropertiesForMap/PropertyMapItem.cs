using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.User.Queries.GetPropertiesForMap;

/// <summary>
/// One pin. Deliberately thinner than PropertyListItem: a viewport can hold hundreds of
/// these and everything here has to survive being drawn as a 60px price bubble.
/// </summary>
public sealed record PropertyMapItem(
    Guid Id,
    string Title,
    string? Area,
    // NULL for a "price on request" listing. The flag below says which of the two kinds of
    // null this is, so the card can print "Price on request" rather than nothing at all.
    decimal? Price,
    string? Currency,
    int Beds,
    int Bathrooms,
    string? PropertyType,
    decimal SizeM2,
    double Lat,
    double Lng,
    string? ThumbUrl,
    bool IsExclusive,
    bool IsOffPlan,
    // Trailing and defaulted so existing construction sites keep compiling. This row used to
    // carry no such flag at all, which is why the map — the DEFAULT view on /buy and /rent —
    // printed the asking price of every listing whose price was supposed to be hidden.
    bool PriceOnRequest = false);

/// <summary>
/// The viewport, already validated and clamped by the handler. Kept separate from the query
/// for the same reason PropertySearchCriteria is: the persistence layer should not have to
/// know what a MediatR request looks like.
/// </summary>
public sealed record MapViewportCriteria(
    double MinLat,
    double MaxLat,
    double MinLng,
    double MaxLng,
    ListingKind? ListingKind,
    Guid? PropertyTypeId,
    decimal? MinPrice,
    decimal? MaxPrice,
    int Take);
