using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Catalog.User.Queries.GetPropertyTypes;

public sealed class GetPropertyTypesHandler
    : IQueryHandler<GetPropertyTypesQuery, IReadOnlyList<PropertyTypeDto>>
{
    private readonly ICatalogQueries _queries;
    public GetPropertyTypesHandler(ICatalogQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<PropertyTypeDto>>> Handle(
        GetPropertyTypesQuery request, CancellationToken cancellationToken)
    {
        var items = await _queries.ListPropertyTypesAsync(cancellationToken);
        return Result<IReadOnlyList<PropertyTypeDto>>.Success(items);
    }
}
