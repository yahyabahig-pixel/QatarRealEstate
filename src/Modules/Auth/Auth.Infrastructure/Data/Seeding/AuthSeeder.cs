using Auth.Domain.Entities;
using Auth.Infrastructure.Identity;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Auth.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  Identity bootstrap: roles → the Main Admin → the default positions.
//
//  This is NOT demo data. An empty deployment cannot be administered at all until these exist,
//  which is why it is separated from the RealEstate demo content: the old single SEED_DATA flag
//  forced a choice between "no way in" and "49 fake listings on the live site".
//
//  Roles and the Main Admin are checked against reality (does the role exist? is there a main
//  admin?) because they are structural — the application is broken without them.
//
//  The default POSITIONS are run-once, recorded in auth.SeedHistory: they are editable content
//  an admin owns, so a position deleted on purpose must stay deleted rather than reappearing on
//  the next restart.
// ---------------------------------------------------------------------------------------------
public static class AuthSeeder
{
    public static async Task SeedAuthAsync(
        this IServiceProvider services, bool force = false, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var sp = scope.ServiceProvider;

        var logger = sp.GetService<ILoggerFactory>()?.CreateLogger("Auth.Seeding");
        var roleManager = sp.GetRequiredService<RoleManager<AppRole>>();
        var userManager = sp.GetRequiredService<UserManager<AppUser>>();
        var configuration = sp.GetRequiredService<IConfiguration>();
        var clock = sp.GetService<TimeProvider>() ?? TimeProvider.System;
        var db = sp.GetRequiredService<AuthDbContext>();

        // ---- 1. roles --------------------------------------------------------------------
        foreach (var role in AuthRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                var created = await roleManager.CreateAsync(new AppRole(role));
                if (!created.Succeeded)
                    throw new InvalidOperationException(
                        $"Seeding role '{role}' failed: {string.Join("; ", created.Errors.Select(e => e.Description))}");
                logger?.LogInformation("Seed: created role {Role}.", role);
            }
        }

        // ---- 2. THE Main Admin -----------------------------------------------------------
        // Exactly one, from configuration. The ONLY code path in the system that
        // ever sets IsMainAdmin = true.
        var mainAdminExists = await userManager.Users.AnyAsync(u => u.IsMainAdmin, ct);
        if (!mainAdminExists)
        {
            var email = configuration["MainAdmin:Email"];
            var password = configuration["MainAdmin:Password"];
            var fullName = configuration["MainAdmin:FullName"] ?? "Main Admin";

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
                throw new InvalidOperationException(
                    "No Main Admin exists and the 'MainAdmin' configuration section is missing. " +
                    "Set MainAdmin:Email and MainAdmin:Password (user-secrets or appsettings.Development.json).");

            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                FullName = fullName,
                IsMainAdmin = true,
                IsActive = true,
                EmailConfirmed = true,
            };

            var created = await userManager.CreateAsync(user, password);
            if (!created.Succeeded)
                throw new InvalidOperationException(
                    $"Seeding the Main Admin failed: {string.Join("; ", created.Errors.Select(e => e.Description))}");

            await userManager.AddToRoleAsync(user, AuthRoles.SuperAdmin);
            logger?.LogInformation("Seed: created the Main Admin ({Email}).", email);
        }

        // ---- 3. default positions (run-once; see the note at the top) ---------------------
        await SeedDefaultPositionsAsync(db, clock, logger, force, ct);

        // ---- 4. top up the default positions that already exist ---------------------------
        await BackfillLeadPermissionsAsync(db, clock, logger, ct);
    }

    /// <summary>
    /// Grants the new Lead permissions to the default positions that were created BEFORE those
    /// permissions existed.
    ///
    /// Why this is separate from SeedDefaultPositionsAsync: that method only ever CREATES a
    /// position, and it skips any name that is already present. On a fresh database it is
    /// enough. On an upgrade it is a no-op — the four defaults are already there — so the
    /// Lead.* permissions added to its table would never reach anyone, and the leads screens
    /// would start returning 403 to the people who had been using them. Nothing else in the
    /// codebase would ever repair that.
    ///
    /// Deliberately additive and narrow: it touches only these two positions, by name, only
    /// adds, never removes, and never looks at a position an admin created. Recorded in the
    /// ledger so it runs exactly once.
    ///
    /// It takes no `force` parameter, unlike the positions seeder: `seed --identity --force`
    /// recreates the default positions with the current permission table, which already
    /// includes Lead.*, so a forced run has nothing left for this to top up. To run it again
    /// deliberately, delete its row from auth.SeedHistory.
    /// </summary>
    private static async Task BackfillLeadPermissionsAsync(
        AuthDbContext db, TimeProvider clock, ILogger? logger, CancellationToken ct)
    {
        if (await db.SeedHistory.AnyAsync(e => e.Key == AuthSeedHistoryEntry.LeadPermissionsBackfillKey, ct))
            return;

        var topUps = new (string Position, string[] Permissions)[]
        {
            // Listings generate inquiries; whoever works the listings works the inquiries.
            ("Property Manager", [AppPermissions.Lead.Read, AppPermissions.Lead.Update]),
            // Read-only on purpose: support answers questions, it does not change records.
            ("Support Manager", [AppPermissions.Lead.Read]),
        };

        var granted = 0;
        foreach (var (name, permissions) in topUps)
        {
            var position = await db.Positions
                .Include(p => p.Permissions)
                .FirstOrDefaultAsync(p => p.Name == name, ct);

            // Renamed or deleted by the admin — their call, not ours to undo.
            if (position is null) continue;

            foreach (var permission in permissions)
            {
                // AssignPermission returns a conflict error when it is already there, which is
                // the normal case on a database that has been upgraded twice. Not a failure.
                if (position.AssignPermission(permission).IsSuccess) granted++;
            }
        }

        db.SeedHistory.Add(AuthSeedHistoryEntry.Record(
            AuthSeedHistoryEntry.LeadPermissionsBackfillKey, clock.GetUtcNow(),
            "Granted Lead.* to the default positions created before those permissions existed."));

        await db.SaveChangesAsync(ct);

        if (granted > 0)
            logger?.LogInformation(
                "Seed: granted {Count} Lead permission(s) to existing default positions.", granted);
    }

    private static async Task SeedDefaultPositionsAsync(
        AuthDbContext db, TimeProvider clock, ILogger? logger, bool force, CancellationToken ct)
    {
        var applied = await db.SeedHistory
            .FirstOrDefaultAsync(e => e.Key == AuthSeedHistoryEntry.DefaultPositionsKey, ct);

        if (applied is not null)
        {
            if (!force)
            {
                logger?.LogInformation(
                    "Seed: default positions were already applied on {AppliedAt:u} — skipping, " +
                    "so a position deleted since then stays deleted.",
                    applied.AppliedAtUtc);
                return;
            }

            logger?.LogWarning("Seed: default positions are being FORCED to run again.");
            db.SeedHistory.Remove(applied);
            await db.SaveChangesAsync(ct);
        }

        var defaults = new (string Name, string Description, string[] Permissions)[]
        {
            ("Property Manager", "Manages listings end to end.",
                [AppPermissions.Property.Read, AppPermissions.Property.Create,
                 AppPermissions.Property.Update, AppPermissions.Property.Publish,
                 AppPermissions.Agent.Read, AppPermissions.Development.Read,
                 AppPermissions.Area.Read,
                 AppPermissions.Feature.Read, AppPermissions.Feature.Create,
                 AppPermissions.Feature.Update, AppPermissions.Feature.Delete,
                 AppPermissions.Media.Upload, AppPermissions.Media.Delete,
                 // Listings generate inquiries; whoever works the listings works the inquiries.
                 AppPermissions.Lead.Read, AppPermissions.Lead.Update]),
            ("Content Manager", "Manages site content (agents roster, area guides, careers board; blog arrives with its module).",
                [AppPermissions.Property.Read,
                 AppPermissions.Agent.Read, AppPermissions.Agent.Create,
                 AppPermissions.Agent.Update, AppPermissions.Agent.Delete,
                 AppPermissions.Development.Read, AppPermissions.Development.Create,
                 AppPermissions.Development.Update, AppPermissions.Development.Delete,
                 AppPermissions.Area.Read, AppPermissions.Area.Create,
                 AppPermissions.Area.Update, AppPermissions.Area.Delete,
                 AppPermissions.Feature.Read,
                 AppPermissions.Job.Read, AppPermissions.Job.Create,
                 AppPermissions.Job.Update, AppPermissions.Job.Delete,
                 AppPermissions.Media.Upload, AppPermissions.Media.Delete]),
            ("User Manager", "Manages end-user accounts.",
                [AppPermissions.User.Read, AppPermissions.User.Update, AppPermissions.Admin.Read]),
            ("Support Manager", "Read access for support work.",
                // Read-only on purpose: support answers questions, it does not change records.
                // Lead.Read without Lead.Delete is exactly that line.
                [AppPermissions.Property.Read, AppPermissions.User.Read, AppPermissions.Lead.Read]),
        };

        var added = 0;
        foreach (var (name, description, permissions) in defaults)
        {
            if (await db.Positions.AnyAsync(p => p.Name == name, ct)) continue;

            var position = Position.Create(name, description);
            if (position.IsError)
                throw new InvalidOperationException($"Seeding position '{name}' failed: {position.TopError.Description}");

            foreach (var permission in permissions)
            {
                var assigned = position.Value.AssignPermission(permission);
                if (assigned.IsError)
                    throw new InvalidOperationException(
                        $"Seeding permission '{permission}' on '{name}' failed: {assigned.TopError.Description}");
            }

            db.Positions.Add(position.Value);
            added++;
        }

        db.SeedHistory.Add(AuthSeedHistoryEntry.Record(
            AuthSeedHistoryEntry.DefaultPositionsKey, clock.GetUtcNow(), "Default admin positions."));

        await db.SaveChangesAsync(ct);

        if (added > 0)
            logger?.LogInformation("Seed: inserted {Count} default position(s).", added);
    }
}
