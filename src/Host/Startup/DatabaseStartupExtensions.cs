using Auth.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Host.Startup;

// ---------------------------------------------------------------------------------------------
// Applies EF Core migrations at application start.
//
// Locally you run `dotnet ef database update` by hand against a database that already exists.
// In a container there is no hand: the SQL Server volume starts empty, so something has to
// create the schema before the first request arrives. This does exactly that, and nothing more —
// it applies migration files that are already in the repository. It never generates them.
//
// The two modules own separate schemas ("auth" and "realestate") with separate migration
// history tables, so they migrate independently and in either order.
// ---------------------------------------------------------------------------------------------
public static class DatabaseStartupExtensions
{
    public static async Task MigrateDatabaseAsync(this WebApplication app, CancellationToken ct = default)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup.Database");

        await using var scope = app.Services.CreateAsyncScope();
        var sp = scope.ServiceProvider;

        await MigrateAsync(sp.GetRequiredService<AuthDbContext>(), "auth", logger, ct);
        await MigrateAsync(sp.GetRequiredService<RealEstateDbContext>(), "realestate", logger, ct);
    }

    private static async Task MigrateAsync(DbContext db, string schema, ILogger logger, CancellationToken ct)
    {
        // SQL Server takes 20-40 seconds to accept connections after its container starts.
        // Without this loop the API would crash on the very first boot of the stack, every time.
        const int maxAttempts = 20;

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                var pending = (await db.Database.GetPendingMigrationsAsync(ct)).ToList();

                if (pending.Count == 0)
                {
                    logger.LogInformation("Schema '{Schema}' is already up to date.", schema);
                    return;
                }

                logger.LogInformation(
                    "Applying {Count} migration(s) to schema '{Schema}': {Names}",
                    pending.Count, schema, string.Join(", ", pending));

                await db.Database.MigrateAsync(ct);

                logger.LogInformation("Schema '{Schema}' migrated successfully.", schema);
                return;
            }
            catch (Exception ex) when (attempt < maxAttempts)
            {
                logger.LogWarning(
                    "Database not reachable yet for schema '{Schema}' (attempt {Attempt}/{Max}): {Message}",
                    schema, attempt, maxAttempts, ex.Message);

                await Task.Delay(TimeSpan.FromSeconds(5), ct);
            }
        }
    }
}
