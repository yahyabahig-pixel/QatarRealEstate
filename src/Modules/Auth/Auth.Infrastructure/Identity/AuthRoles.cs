namespace Auth.Infrastructure.Identity;

// Mirrors RealEstate.Application.Common.AppRoles — the names MUST match, since the
// RealEstate policies check these exact strings on the token.
public static class AuthRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Agent = "Agent";

    public static readonly string[] All = [SuperAdmin, Admin, Agent];
}
