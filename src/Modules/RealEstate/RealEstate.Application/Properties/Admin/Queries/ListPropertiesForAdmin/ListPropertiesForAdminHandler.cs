// Properties/Admin/ListPropertiesForAdmin/ListPropertiesForAdminHandler.cs
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Authentication;
using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Common;
using RealEstate.Application.Properties.Admin.Queries.ListPropertiesForAdmin.Inputs;

namespace RealEstate.Application.Properties.Admin.ListPropertiesForAdmin;

public sealed class ListPropertiesForAdminHandler
    : IQueryHandler<ListPropertiesForAdminQuery, PagedResult<AdminPropertyListItemDto>>
{
    private readonly IPropertyQueries _queries;
    private readonly ICurrentUser _user;
    private readonly PropertyAuthorizationPolicy _authorization;

    public ListPropertiesForAdminHandler(
        IPropertyQueries queries, ICurrentUser user, PropertyAuthorizationPolicy authorization)
    {
        _queries = queries;
        _user = user;
        _authorization = authorization;
    }

    public async Task<Result<PagedResult<AdminPropertyListItemDto>>> Handle(
        ListPropertiesForAdminQuery request, CancellationToken cancellationToken)
    {
        var canAccess = _authorization.CanAccessAdmin();
        if (canAccess.IsError) return canAccess.TopError;

        // Elevated roles see everything; an Agent only sees their own listings.
        Guid? ownerScope = (_user.IsInRole(AppRoles.SuperAdmin) || _user.IsInRole(AppRoles.Admin))
            ? null
            : _user.UserId;

        var filter = new AdminPropertyFilter(
            Text: string.IsNullOrWhiteSpace(request.Q) ? null : request.Q.Trim(),
            Status: request.Status,
            ListingKind: request.ListingKind,
            IsFeatured: request.IsFeatured,
            IsActive: request.IsActive,
            OwnerScopeUserId: ownerScope,
            Page: Math.Max(request.Page, 1),
            PageSize: Math.Clamp(request.PageSize, 1, 100));

        return await _queries.ListForAdminAsync(filter, cancellationToken);
    }
}