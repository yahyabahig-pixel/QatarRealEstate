using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace RealEstate.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  What the Host calls. Two separate entry points, because the two batches answer to different
//  rules: reference data is safe on a production database, demo data is sales material.
//
//  Both are RUN-ONCE (recorded in realestate.SeedHistory), so a row an admin deletes afterwards
//  stays deleted. See RealEstateDbSeeder for the whole reasoning.
//
//  Neither migrates. The database must already exist with its migrations applied.
// ---------------------------------------------------------------------------------------------
public static class SeedingExtensions
{
    /// <summary>
    /// Property types + the feature catalog. Returns true when this call actually inserted the
    /// batch, false when it was already applied.
    /// </summary>
    public static Task<bool> SeedRealEstateReferenceDataAsync(
        this IServiceProvider services, bool force = false, CancellationToken cancellationToken = default)
        => RunAsync(services, (seeder, ct) => seeder.SeedReferenceDataAsync(force, ct),
                    "reference data", cancellationToken);

    /// <summary>
    /// Demo listings, consultants, areas, projects and job adverts. Development and testing
    /// only — the caller is responsible for the production guard (see Host's SeedCommand).
    /// </summary>
    public static Task<bool> SeedRealEstateDemoDataAsync(
        this IServiceProvider services, bool force = false, CancellationToken cancellationToken = default)
        => RunAsync(services, (seeder, ct) => seeder.SeedDemoDataAsync(force, ct),
                    "demo data", cancellationToken);

    private static async Task<bool> RunAsync(
        IServiceProvider services,
        Func<RealEstateDbSeeder, CancellationToken, Task<bool>> run,
        string what,
        CancellationToken cancellationToken)
    {
        await using var scope = services.CreateAsyncScope();

        var db = scope.ServiceProvider.GetRequiredService<RealEstateDbContext>();
        var clock = scope.ServiceProvider.GetService<TimeProvider>() ?? TimeProvider.System;

        var logger = scope.ServiceProvider
            .GetService<ILoggerFactory>()
            ?.CreateLogger("RealEstate.Seeding");

        try
        {
            return await run(new RealEstateDbSeeder(db, logger, clock), cancellationToken);
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "RealEstate {What} seeding failed.", what);
            throw;   // fail fast — silent half-seeded data is worse than a crash
        }
    }
}
