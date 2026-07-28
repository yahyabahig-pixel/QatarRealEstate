using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Authentication;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Common;
using RealEstate.Application.Properties.Admin.Policies;

namespace RealEstate.Application.Properties.Admin.Queries.GetDashboardStatistics;

public sealed class GetDashboardStatisticsHandler
    : IQueryHandler<GetDashboardStatisticsQuery, DashboardStatisticsDto>
{
    private readonly IPropertyQueries _queries;
    private readonly ICurrentUser _user;
    private readonly PropertyAuthorizationPolicy _authorization;

    public GetDashboardStatisticsHandler(
        IPropertyQueries queries, ICurrentUser user, PropertyAuthorizationPolicy authorization)
    {
        _queries = queries;
        _user = user;
        _authorization = authorization;
    }

    public async Task<Result<DashboardStatisticsDto>> Handle(
        GetDashboardStatisticsQuery request, CancellationToken cancellationToken)
    {
        var canAccess = _authorization.CanAccessAdmin();
        if (canAccess.IsError) return canAccess.TopError;

        // Same scoping as the other admin queries: Agents see their own listings' numbers.
        Guid? ownerScope = (_user.IsInRole(AppRoles.SuperAdmin) || _user.IsInRole(AppRoles.Admin))
            ? null
            : _user.UserId;

        var year = Math.Clamp(request.Year ?? DateTime.UtcNow.Year, 2000, 2100);
        return await _queries.GetDashboardStatisticsAsync(year, ownerScope, cancellationToken);
    }
}
