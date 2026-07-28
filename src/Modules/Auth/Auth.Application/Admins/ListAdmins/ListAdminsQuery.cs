using Auth.Application.Abstractions.Common;
using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Contracts.Responses;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.ListAdmins;

public sealed record ListAdminsQuery(
    string? Q = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 24) : IQuery<PagedResult<AdminListItemDto>>;

public sealed class ListAdminsHandler : IQueryHandler<ListAdminsQuery, PagedResult<AdminListItemDto>>
{
    private readonly IAdminQueries _queries;

    public ListAdminsHandler(IAdminQueries queries) => _queries = queries;

    public async Task<Result<PagedResult<AdminListItemDto>>> Handle(ListAdminsQuery request, CancellationToken ct)
    {
        var page = Math.Max(request.Page, 1);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var search = string.IsNullOrWhiteSpace(request.Q) ? null : request.Q.Trim();

        return await _queries.ListAsync(search, request.IsActive, page, pageSize, ct);
    }
}
