using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace RealEstate.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  The one line the Host needs.
//
//  In src/Host/Program.cs, after `var app = builder.Build();`:
//
//      if (app.Environment.IsDevelopment())
//      {
//          app.MapOpenApi();
//          await app.Services.SeedRealEstateAsync();     // <-- add this
//      }
//
//  Nothing has to be registered in DI: the extension opens its own scope and resolves the
//  DbContext that AddRealEstateInfrastructure already registered.
// ---------------------------------------------------------------------------------------------

public static class SeedingExtensions
{
    /// <summary>
    /// Runs the RealEstate seed data. Idempotent — calling it on every startup is safe.
    /// Assumes the database already exists and the migrations are applied
    /// (`dotnet ef database update`); it deliberately does NOT migrate for you.
    /// </summary>
    public static async Task SeedRealEstateAsync(
        this IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();

        var db = scope.ServiceProvider.GetRequiredService<RealEstateDbContext>();

        var logger = scope.ServiceProvider
            .GetService<ILoggerFactory>()
            ?.CreateLogger("RealEstate.Seeding");

        try
        {
            await new RealEstateDbSeeder(db, logger).SeedAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "RealEstate seeding failed.");
            throw;   // fail fast in development — silent half-seeded data is worse than a crash
        }
    }
}
