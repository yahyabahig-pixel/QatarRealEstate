using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Properties.Admin.Policies;

namespace RealEstate.Application.Leads.Admin.Queries.ListLeadsForAdmin;

public sealed class ListLeadsForAdminHandler
    : IQueryHandler<ListLeadsForAdminQuery, PagedResult<LeadAdminListItemDto>>
{
    private readonly ILeadQueries _queries;
    private readonly PropertyAuthorizationPolicy _authorization;

    public ListLeadsForAdminHandler(ILeadQueries queries, PropertyAuthorizationPolicy authorization)
    {
        _queries = queries;
        _authorization = authorization;
    }

    public async Task<Result<PagedResult<LeadAdminListItemDto>>> Handle(
        ListLeadsForAdminQuery request, CancellationToken cancellationToken)
    {
        var canAccess = _authorization.CanAccessAdmin();
        if (canAccess.IsError) return canAccess.TopError;

        var filter = new LeadAdminFilter(
            string.IsNullOrWhiteSpace(request.Q) ? null : request.Q.Trim(),
            request.Type, request.Status,
            Math.Max(1, request.Page), Math.Clamp(request.PageSize, 1, 200));

        return await _queries.ListForAdminAsync(filter, cancellationToken);
    }
}
