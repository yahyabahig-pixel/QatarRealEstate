using Microsoft.AspNetCore.Authorization;

namespace BuildingBlocks.Authorization;

public sealed class PermissionRequirement(string permission) : IAuthorizationRequirement
{
    public string Permission { get; } = permission;
}
