using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Auth.Infrastructure.Data;

/// <summary>
/// Design-time factory so <c>dotnet ef</c> can build this context without starting the whole
/// application. Same pattern as RealEstateDbContextFactory — which, until now, this comment
/// referred to and which did not exist.
///
/// Used ONLY by the EF tooling. The running application gets its connection string from
/// configuration.
/// </summary>
public sealed class AuthDbContextFactory : IDesignTimeDbContextFactory<AuthDbContext>
{
    // A local developer database. Override it without editing this file:
    //     EF_CONNECTION_STRING="Server=...;" dotnet ef migrations add <Name> ...
    //
    // This used to hardcode a real-looking password. Anything committed here is public to
    // everyone with the repository, so the fallback is a throwaway local credential and
    // nothing else.
    private const string LocalFallback =
        "Server=localhost,1433;Database=QatarRealEstate;User Id=sa;Password=LocalDevOnly_ChangeMe1;TrustServerCertificate=True;";

    public AuthDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("EF_CONNECTION_STRING") ?? LocalFallback;

        var options = new DbContextOptionsBuilder<AuthDbContext>()
            .UseSqlServer(
                connectionString,
                sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "auth"))
            .Options;

        return new AuthDbContext(options);
    }
}
