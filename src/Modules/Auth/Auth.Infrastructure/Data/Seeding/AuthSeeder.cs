using Auth.Domain.Entities;
using Auth.Infrastructure.Identity;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Auth.Infrastructure.Data.Seeding;

// Idempotent, runs on every startup — same philosophy as the RealEstate seeder.
// Order: roles → Main Admin → default positions.
public static class AuthSeeder
{
    public static async Task SeedAuthAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var sp = scope.ServiceProvider;

        var logger = sp.GetService<ILoggerFactory>()?.CreateLogger("Auth.Seeding");
        var roleManager = sp.GetRequiredService<RoleManager<AppRole>>();
        var userManager = sp.GetRequiredService<UserManager<AppUser>>();
        var configuration = sp.GetRequiredService<IConfiguration>();
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
        var mainAdminExists = userManager.Users.Any(u => u.IsMainAdmin);
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

        // ---- 3. default positions (names unique; skip existing) ---------------------------
        var defaults = new (string Name, string Description, string[] Permissions)[]
        {
            ("Property Manager", "Manages listings end to end.",
                [AppPermissions.Property.Read, AppPermissions.Property.Create,
                 AppPermissions.Property.Update, AppPermissions.Property.Publish,
                 AppPermissions.Agent.Read,
                 AppPermissions.Media.Upload, AppPermissions.Media.Delete]),
            ("Content Manager", "Manages site content (agents roster; area guides and blog arrive with their modules).",
                [AppPermissions.Property.Read,
                 AppPermissions.Agent.Read, AppPermissions.Agent.Create,
                 AppPermissions.Agent.Update, AppPermissions.Agent.Delete,
                 AppPermissions.Media.Upload, AppPermissions.Media.Delete]),
            ("User Manager", "Manages end-user accounts.",
                [AppPermissions.User.Read, AppPermissions.User.Update, AppPermissions.Admin.Read]),
            ("Support Manager", "Read access for support work.",
                [AppPermissions.Property.Read, AppPermissions.User.Read]),
        };

        var added = 0;
        foreach (var (name, description, permissions) in defaults)
        {
            if (db.Positions.Any(p => p.Name == name)) continue;

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

        if (added > 0)
        {
            await db.SaveChangesAsync(ct);
            logger?.LogInformation("Seed: inserted {Count} default position(s).", added);
        }
    }
}
