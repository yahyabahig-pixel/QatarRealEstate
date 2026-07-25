using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.User.SearchProperties;

public sealed class SearchPropertiesHandler : IQueryHandler<SearchPropertiesQuery, PagedResult<PropertyListItem>>
{
    private readonly IPropertyQueries _queries;
    public SearchPropertiesHandler(IPropertyQueries queries)
    {
        _queries = queries;
    }
    public async Task<BuildingBlocks.Domain.Common.Results.Result<PagedResult<PropertyListItem>>> Handle(SearchPropertiesQuery request, CancellationToken cancellationToken)
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
            Page: request.Page,
            PageSize: request.PageSize);
        return _queries.SearchAsync(criteria, cancellationToken);
    }
}