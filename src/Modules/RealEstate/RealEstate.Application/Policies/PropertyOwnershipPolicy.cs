using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Authentication;
using RealEstate.Application.Common;
using RealEstate.Domain.Entities;
namespace RealEstate.Application.policies;

public sealed class PropertyOwnershipPolicy
{

    private readonly ICurrentUser _user;
    public PropertyOwnershipPolicy(ICurrentUser user) => _user = user;

    public Result<Success> CanModify(Property property)
    {
        if (!_user.IsAuthenticated) return AuthorizationErrors.NotAuthenticated;
        if (_user.IsInRole(AppRoles.SuperAdmin) || _user.IsInRole(AppRoles.Admin)) return Result.Success;
        return property.CreatedBy == _user.UserId ? Result.Success : AuthorizationErrors.Forbidden;
    }

}