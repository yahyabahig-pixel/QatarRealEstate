using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Properties.User.Queries.SearchProperties;
public sealed class SearchPropertiesHandler : IQueryHandler<SearchPropertiesQuery, PagedResult<PropertyListItem>>
{
    private readonly IPropertyQueries _queries;
    public SearchPropertiesHandler(IPropertyQueries queries) => _queries = queries;
    public async Task<Result<PagedResult<PropertyListItem>>> Handle(SearchPropertiesQuery request, CancellationToken cancellationToken)
    {
        var criteria = new PropertySearchCriteria(
            Text: string.IsNullOrWhiteSpace(request.Q) ? null : request.Q.Trim(),
            ListingKind: request.ListingKind,
            PropertyTypeId: request.PropertyTypeId,
            City: request.City,
            MinRooms: request.MinRooms,
            MinBathrooms: request.MinBathrooms,
            MinArea: request.MinArea,
            MaxArea: request.MaxArea,
            MinPrice: request.MinPrice,
            MaxPrice: request.MaxPrice,
            SortBy: request.Sort,
            // Clamped here as well as in the validator. The validator rejects a bad page with a
            // 400, which is the right answer for a typo; this is the belt that stops an
            // unvalidated caller (a future internal one) turning `(page - 1) * pageSize` into
            // an arithmetic overflow and a 500.
            Page: Math.Max(1, request.Page),
            PageSize: Math.Clamp(request.PageSize, 1, 100),
            AreaId: request.AreaId,
            AgentId: request.AgentId,
            FeatureIds: request.FeatureIds is { Length: > 0 } ids ? ids.Distinct().ToList() : null,
            Furnishing: string.IsNullOrWhiteSpace(request.Furnishing) ? null : request.Furnishing.Trim());

        return await _queries.SearchAsync(criteria, cancellationToken);
    }
}
