using BuildingBlocks.Domain.Common.Results;
using MediatR;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.User.SearchProperties;

namespace RealEstate.Application.Properties.User.Queries.GetFeaturedProperties;


public sealed class GetFeaturedPropertiesHandler
    : IQueryHandler<GetFeaturedPropertiesQuery, IReadOnlyList<PropertyListItem>>
{
    private readonly IPropertyQueries _queries;
    public GetFeaturedPropertiesHandler(IPropertyQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<PropertyListItem>>> Handle(
    GetFeaturedPropertiesQuery request, CancellationToken cancellationToken)
    {
        var take = Math.Clamp(request.Take, 1, 20);

        var items = await _queries.GetFeaturedAsync(take, cancellationToken);

        return Result<IReadOnlyList<PropertyListItem>>.Success(items);
    }
}