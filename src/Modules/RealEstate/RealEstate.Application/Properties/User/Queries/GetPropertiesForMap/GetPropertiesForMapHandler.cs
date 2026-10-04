using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Properties.User.Queries.GetPropertiesForMap;

public sealed class GetPropertiesForMapHandler
    : IQueryHandler<GetPropertiesForMapQuery, IReadOnlyList<PropertyMapItem>>
{
    // A viewport is user input from a map the user can zoom all the way out on. Cap the page
    // so "show me the whole planet" cannot turn into a full table read serialised to JSON.
    private const int MaxPins = 500;

    private readonly IPropertyQueries _queries;
    public GetPropertiesForMapHandler(IPropertyQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<PropertyMapItem>>> Handle(
        GetPropertiesForMapQuery request, CancellationToken cancellationToken)
    {
        // NaN and Infinity have to be rejected explicitly, and FIRST. They are valid doubles,
        // so model binding accepts ?minLat=NaN happily — and then every comparison below is
        // false by IEEE rules, so NaN slipped past all of the range checks and reached SQL
        // Server, which answered with a 500. A bad viewport is a bad request.
        if (!IsFinite(request.MinLat) || !IsFinite(request.MaxLat) ||
            !IsFinite(request.MinLng) || !IsFinite(request.MaxLng))
            return Error.Validation(
                "Property.Map.InvalidBounds",
                "Map bounds must be finite numbers.");

        if (request.MinLat < -90 || request.MaxLat > 90 || request.MinLat >= request.MaxLat)
            return Error.Validation(
                "Property.Map.InvalidLatitudeBounds",
                "minLat and maxLat must lie between -90 and 90, and minLat must be less than maxLat.");

        // Rejected rather than wrapped: a viewport that straddles the antimeridian needs two
        // range predicates, not one, and nothing in Qatar is anywhere near 180 degrees. If the
        // portal ever goes global this is the line that has to change, and it will say so.
        if (request.MinLng < -180 || request.MaxLng > 180 || request.MinLng >= request.MaxLng)
            return Error.Validation(
                "Property.Map.InvalidLongitudeBounds",
                "minLng and maxLng must lie between -180 and 180, and minLng must be less than maxLng.");

        if (request.MinPrice is { } min && min < 0)
            return Error.Validation("Property.Map.InvalidPrice", "minPrice must not be negative.");

        if (request.MinPrice is { } lo && request.MaxPrice is { } hi && lo > hi)
            return Error.Validation(
                "Property.Map.InvalidPriceRange",
                "minPrice must not be greater than maxPrice.");

        var criteria = new MapViewportCriteria(
            request.MinLat, request.MaxLat, request.MinLng, request.MaxLng,
            request.ListingKind, request.PropertyTypeId,
            request.MinPrice, request.MaxPrice,
            Math.Clamp(request.Take, 1, MaxPins));

        var items = await _queries.GetForMapAsync(criteria, cancellationToken);

        return Result<IReadOnlyList<PropertyMapItem>>.Success(items);
    }

    private static bool IsFinite(double value) => !double.IsNaN(value) && !double.IsInfinity(value);
}
