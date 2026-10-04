using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RealEstate.Infrastructure.Data;

/// <summary>
/// Design-time factory so <c>dotnet ef</c> can build this context without starting the whole
/// application.
///
/// AuthDbContextFactory's comment has always said "same pattern as RealEstateDbContextFactory",
/// but that file did not exist. Without it, `dotnet ef migrations add --context RealEstateDbContext`
/// falls back to constructing the Host's service provider, which needs a connection string, a JWT
/// secret and the MainAdmin settings — none of which a developer has in their shell. The command
/// fails with a configuration error that says nothing about migrations, which is part of why the
/// migrations in this repository ended up hand-written and drifted from the model.
///
/// This is used ONLY by the EF tooling. The running application gets its connection string from
/// configuration (see RealEstate.Infrastructure.DependencyInjection).
/// </summary>
public sealed class RealEstateDbContextFactory : IDesignTimeDbContextFactory<RealEstateDbContext>
{
    // A local developer database. Override it without editing this file:
    //     EF_CONNECTION_STRING="Server=...;" dotnet ef migrations add <Name> ...
    //
    // The fallback is deliberately a throwaway local credential, not a real one. A password that
    // works anywhere but a developer's own machine does not belong in a file that is committed.
    private const string LocalFallback =
        "Server=localhost,1433;Database=QatarRealEstate;User Id=sa;Password=LocalDevOnly_ChangeMe1;TrustServerCertificate=True;";

    public RealEstateDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("EF_CONNECTION_STRING") ?? LocalFallback;

        var options = new DbContextOptionsBuilder<RealEstateDbContext>()
            .UseSqlServer(
                connectionString,
                sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "realestate"))
            .Options;

        return new RealEstateDbContext(options);
    }
}
