using Microsoft.AspNetCore.Authorization;

namespace BuildingBlocks.Authorization;

// The single place a permission verdict is computed.
//
// Order matters and is deliberate:
//   1. Main Admin bypass — the claim only exists if the DB row said IsMainAdmin at token
//      time, and the JWT signature makes it untamperable. "Full access regardless of position."
//   2. Otherwise: does the token carry the required permission claim?
// Anything else → not succeeded → the framework returns 403 (or 401 when unauthenticated).
public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var user = context.User;

        if (user.Identity?.IsAuthenticated != true)
            return Task.CompletedTask;

        if (user.HasClaim(AuthClaimTypes.MainAdmin, "true"))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        if (user.HasClaim(AuthClaimTypes.Permission, requirement.Permission))
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}
