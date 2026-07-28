using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Features.Admin.Queries.ListFeaturesForAdmin;

public sealed class ListFeaturesForAdminHandler
    : IQueryHandler<ListFeaturesForAdminQuery, IReadOnlyList<FeatureAdminDto>>
{
    private readonly ICatalogQueries _queries;
    public ListFeaturesForAdminHandler(ICatalogQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<FeatureAdminDto>>> Handle(
        ListFeaturesForAdminQuery request, CancellationToken cancellationToken)
    {
        var items = await _queries.ListFeaturesForAdminAsync(cancellationToken);
        return Result<IReadOnlyList<FeatureAdminDto>>.Success(items);
    }
}
