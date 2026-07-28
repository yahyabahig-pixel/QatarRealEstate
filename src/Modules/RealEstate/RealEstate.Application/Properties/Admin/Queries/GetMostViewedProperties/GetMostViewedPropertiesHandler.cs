using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Authentication;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Common;
using RealEstate.Application.Properties.Admin.Policies;

namespace RealEstate.Application.Properties.Admin.Queries.GetMostViewedProperties;

public sealed class GetMostViewedPropertiesHandler
    : IQueryHandler<GetMostViewedPropertiesQuery, MostViewedPropertiesDto>
{
    private readonly IPropertyQueries _queries;
    private readonly ICurrentUser _user;
    private readonly PropertyAuthorizationPolicy _authorization;

    public GetMostViewedPropertiesHandler(
        IPropertyQueries queries, ICurrentUser user, PropertyAuthorizationPolicy authorization)
    {
        _queries = queries;
        _user = user;
        _authorization = authorization;
    }

    public async Task<Result<MostViewedPropertiesDto>> Handle(
        GetMostViewedPropertiesQuery request, CancellationToken cancellationToken)
    {
        var canAccess = _authorization.CanAccessAdmin();
        if (canAccess.IsError) return canAccess.TopError;

        // Same ownership scoping the admin list applies: elevated roles see the whole
        // portfolio's analytics; an Agent sees the analytics of their own listings.
        Guid? ownerScope = (_user.IsInRole(AppRoles.SuperAdmin) || _user.IsInRole(AppRoles.Admin))
            ? null
            : _user.UserId;

        var take = Math.Clamp(request.Take, 1, 50);
        return await _queries.GetMostViewedAsync(take, ownerScope, cancellationToken);
    }
}
