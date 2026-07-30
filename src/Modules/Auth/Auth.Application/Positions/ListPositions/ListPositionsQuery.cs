using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Contracts.Responses;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.ListPositions;

public sealed record ListPositionsQuery : IQuery<IReadOnlyList<PositionDto>>;

public sealed class ListPositionsHandler : IQueryHandler<ListPositionsQuery, IReadOnlyList<PositionDto>>
{
    private readonly IPositionQueries _queries;

    public ListPositionsHandler(IPositionQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<PositionDto>>> Handle(ListPositionsQuery request, CancellationToken ct)
    {
        var items = await _queries.ListAsync(ct);
        return Result<IReadOnlyList<PositionDto>>.Success(items);
    }
}
