using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Areas.User.Queries.GetAreas;

public sealed class GetAreasHandler : IQueryHandler<GetAreasQuery, IReadOnlyList<AreaDto>>
{
    private readonly IAreaQueries _queries;
    public GetAreasHandler(IAreaQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<AreaDto>>> Handle(
        GetAreasQuery request, CancellationToken cancellationToken)
    {
        var items = await _queries.ListAsync(cancellationToken);
        return Result<IReadOnlyList<AreaDto>>.Success(items);
    }
}
