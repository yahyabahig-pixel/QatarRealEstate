
using BuildingBlocks.Domain.Common.Results;
using MediatR;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Policies;
using RealEstate.Application.Properties.Admin.Queries.GetPropertyStatusHistory;
namespace RealEstate.Application.Properties.Admin.Queries.GetPropertyStatusHistory;


public sealed record GetPropertyStatusHistoryQuery(Guid PropertyId)
    : IQuery<IReadOnlyList<PropertyStatusHistoryDto>>;

public sealed class GetPropertyStatusHistoryHandler
    : IQueryHandler<GetPropertyStatusHistoryQuery, IReadOnlyList<PropertyStatusHistoryDto>>
{
    private readonly IPropertyQueries _queries;
    private readonly PropertyAuthorizationPolicy _authorization;

    public GetPropertyStatusHistoryHandler(IPropertyQueries queries, PropertyAuthorizationPolicy authorization)
    {
        _queries = queries;
        _authorization = authorization;
    }

    public async Task<Result<IReadOnlyList<PropertyStatusHistoryDto>>> Handle(
        GetPropertyStatusHistoryQuery request, CancellationToken cancellationToken)
    {
        var canAccess = _authorization.CanAccessAdmin();
        if (canAccess.IsError) return canAccess.TopError;

        var history = await _queries.GetStatusHistoryAsync(request.PropertyId, cancellationToken);
        return Result<IReadOnlyList<PropertyStatusHistoryDto>>.Success(history);
    }

}