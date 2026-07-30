using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.User.Queries.GetPropertiesForMap;

/// <summary>
/// Published listings whose coordinates fall inside a map viewport. Bound straight from the
/// query string, so the "Search this area" button is nothing more than a re-issue of this
/// request with the map's new bounds.
/// </summary>
public sealed record GetPropertiesForMapQuery(
    double MinLat = 0,
    double MaxLat = 0,
    double MinLng = 0,
    double MaxLng = 0,
    ListingKind? ListingKind = null,
    Guid? PropertyTypeId = null,
    decimal? MinPrice = null,
    decimal? MaxPrice = null,
    int Take = 300) : IQuery<IReadOnlyList<PropertyMapItem>>;
