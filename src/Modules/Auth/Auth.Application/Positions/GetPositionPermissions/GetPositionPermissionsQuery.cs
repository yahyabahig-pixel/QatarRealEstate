using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.GetPositionPermissions;

public sealed record GetPositionPermissionsQuery(Guid PositionId) : IQuery<IReadOnlyList<string>>;

public sealed class GetPositionPermissionsHandler
    : IQueryHandler<GetPositionPermissionsQuery, IReadOnlyList<string>>
{
    private readonly IPositionQueries _queries;
    private readonly IPositionRepository _positions;

    public GetPositionPermissionsHandler(IPositionQueries queries, IPositionRepository positions)
    {
        _queries = queries;
        _positions = positions;
    }

    public async Task<Result<IReadOnlyList<string>>> Handle(
        GetPositionPermissionsQuery request, CancellationToken ct)
    {
        // 404 for an unknown position; an existing position with zero permissions is a 200 [].
        var position = await _positions.GetByIdAsync(request.PositionId, ct);
        if (position is null) return PositionErrors.NotFound;

        var permissions = await _queries.GetPermissionsAsync(request.PositionId, ct);
        return Result<IReadOnlyList<string>>.Success(permissions);
    }
}
