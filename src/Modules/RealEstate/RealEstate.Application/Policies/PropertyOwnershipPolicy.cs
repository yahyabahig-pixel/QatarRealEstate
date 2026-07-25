using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Authentication;
namespace RealEstate.Application.policies;

public sealed class PropertyOwnershipPolicy
{
    private readonly ICurrentUser _user;
    public PropertyOwnershipPolicy(ICurrentUser user) => _user = user;

    public Result<Success> CanAccessProperty(Guid propertyOwnerId)
    {
        if (!_user.IsAuthenticated) return AuthorizationErrors.NotAuthenticated;
        if (_user.UserId != propertyOwnerId) return AuthorizationErrors.Forbidden;
        return Result.Success;
    }

}