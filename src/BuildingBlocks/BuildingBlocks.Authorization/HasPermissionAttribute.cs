using Microsoft.AspNetCore.Authorization;

namespace BuildingBlocks.Authorization;

// [HasPermission(AppPermissions.Property.Publish)] on any action/controller, in ANY module.
// Translates to policy "perm:Property.Publish", which PermissionPolicyProvider resolves
// dynamically — no per-permission registration anywhere.
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class HasPermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "perm:";

    public HasPermissionAttribute(string permission)
        : base(PolicyPrefix + permission)
    {
    }
}
