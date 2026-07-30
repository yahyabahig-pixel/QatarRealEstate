using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Contracts.Responses;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.GetPosition;

public sealed record GetPositionQuery(Guid PositionId) : IQuery<PositionDto>;

public sealed class GetPositionHandler : IQueryHandler<GetPositionQuery, PositionDto>
{
    private readonly IPositionQueries _queries;

    public GetPositionHandler(IPositionQueries queries) => _queries = queries;

    public async Task<Result<PositionDto>> Handle(GetPositionQuery request, CancellationToken ct)
    {
        var dto = await _queries.GetByIdAsync(request.PositionId, ct);
        return dto is null ? PositionErrors.NotFound : dto;
    }
}
