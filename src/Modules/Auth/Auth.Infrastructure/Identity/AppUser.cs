using Microsoft.AspNetCore.Identity;

namespace Auth.Infrastructure.Identity;

// The ONE user type of the whole platform. Identity owns authentication
// (password hash, lockout, email); our columns carry the authorization facts.
public sealed class AppUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;

    // THE Main Admin flag. No API contract carries it; only the seeder sets it;
    // a filtered unique index guarantees at most one row has it. It is a database
    // fact — not a role, not a claim someone can request.
    public bool IsMainAdmin { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid? PositionId { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
