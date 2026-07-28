using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Catalog.User.Queries.GetFeatureCatalog;

public sealed class GetFeatureCatalogHandler
    : IQueryHandler<GetFeatureCatalogQuery, IReadOnlyList<FeatureCatalogItemDto>>
{
    private readonly ICatalogQueries _queries;
    public GetFeatureCatalogHandler(ICatalogQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<FeatureCatalogItemDto>>> Handle(
        GetFeatureCatalogQuery request, CancellationToken cancellationToken)
    {
        var items = await _queries.ListFeaturesAsync(cancellationToken);
        return Result<IReadOnlyList<FeatureCatalogItemDto>>.Success(items);
    }
}
