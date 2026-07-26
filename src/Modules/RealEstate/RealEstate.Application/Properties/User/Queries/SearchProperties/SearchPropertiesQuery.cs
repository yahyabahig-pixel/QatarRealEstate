using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Domain.Enums;
namespace RealEstate.Application.Properties.User.Queries.SearchProperties;

public sealed record SearchPropertiesQuery(
    string? Q = null,
    ListingKind? ListingKind = null,
    Guid? PropertyTypeId = null,
    string? City = null,
    int? MinRooms = null,
    int? MinBathrooms = null,
    decimal? MinArea = null,
    decimal? MaxArea = null,
    decimal? MinPrice = null,
    decimal? MaxPrice = null,
    PropertySortBy Sort = PropertySortBy.Relevance,
    int Page = 1,
    int PageSize = 24) : IQuery<PagedResult<PropertyListItem>>;