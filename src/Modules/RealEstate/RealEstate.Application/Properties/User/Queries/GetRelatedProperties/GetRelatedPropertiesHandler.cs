using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.User.Queries.SearchProperties;
namespace RealEstate.Application.Properties.User.Queries.GetRelatedProperties;

public sealed class GetRelatedPropertiesHandler
    : IQueryHandler<GetRelatedPropertiesQuery, IReadOnlyList<PropertyListItem>>
{
    private readonly IPropertyQueries _queries;
    public GetRelatedPropertiesHandler(IPropertyQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<PropertyListItem>>> Handle(
        GetRelatedPropertiesQuery request, CancellationToken cancellationToken)
    {
        var take = Math.Clamp(request.Take, 1, 12);
        var items = await _queries.GetRelatedAsync(request.Id, take, cancellationToken);
        return Result<IReadOnlyList<PropertyListItem>>.Success(items);
    }
}