using Auth.Domain.Entities;
using Auth.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Auth.Infrastructure.Data;

// IdentityDbContext brings the seven Identity tables (users, roles, claims, logins,
// tokens, user-roles, role-claims). We add Positions on top and put EVERYTHING in the
// module's own schema — same modular-monolith rule as the realestate schema.
public sealed class AuthDbContext : IdentityDbContext<AppUser, AppRole, Guid>
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

    public DbSet<Position> Positions => Set<Position>();
    // PositionPermission is reached through the Position aggregate — no public DbSet.

    // Which seed batches have already been applied to this database's auth schema.
    public DbSet<Auth.Infrastructure.Data.Seeding.AuthSeedHistoryEntry> SeedHistory =>
        Set<Auth.Infrastructure.Data.Seeding.AuthSeedHistoryEntry>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("auth");

        // Identity configures its own entities here — must run before ours.
        base.OnModelCreating(builder);

        builder.ApplyConfigurationsFromAssembly(typeof(AuthDbContext).Assembly);
    }
}
