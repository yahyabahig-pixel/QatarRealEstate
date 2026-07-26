using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Authentication;
using RealEstate.Application.Common;
using RealEstate.Application.policies;

public sealed class PropertyAuthorizationPolicy
{
    private readonly ICurrentUser _user;
    public PropertyAuthorizationPolicy(ICurrentUser user) => _user = user;
    public Result<Success> CanCreate() => RequireAnyRole(AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Agent);
    public Result<Success> CanAccessAdmin() => RequireAnyRole(AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Agent);
    public Result<Success> CanFeature() => RequireAnyRole(AppRoles.SuperAdmin, AppRoles.Admin);

    private Result<Success> RequireAnyRole(params string[] roles)
    {
        if (!_user.IsAuthenticated) return AuthorizationErrors.NotAuthenticated;
        return roles.Any(_user.IsInRole) ? Result.Success : AuthorizationErrors.Forbidden;
    }
}