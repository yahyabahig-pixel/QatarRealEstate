using Microsoft.AspNetCore.Identity;

namespace Auth.Infrastructure.Identity;

// Coarse tiers only (SuperAdmin / Admin / Agent) — kept because the existing
// RealEstate policies speak role names. Fine-grained power lives in permissions.
public sealed class AppRole : IdentityRole<Guid>
{
    public AppRole() { }
    public AppRole(string roleName) : base(roleName) { }
}
