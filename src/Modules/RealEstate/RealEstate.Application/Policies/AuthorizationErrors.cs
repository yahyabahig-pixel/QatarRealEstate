using BuildingBlocks.Domain.Common.Results.Errors;
namespace RealEstate.Application.policies;

public static class AuthorizationErrors
{
    public static readonly Error NotAuthenticated =
        Error.Unauthorized("Auth.NotAuthenticated", "User is not authenticated.");

    public static readonly Error Forbidden =
        Error.Forbidden("Auth.Forbidden", "You are not allowed to perform this action.");
}