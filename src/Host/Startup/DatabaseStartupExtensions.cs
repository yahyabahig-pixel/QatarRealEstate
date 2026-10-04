using Auth.Infrastructure.Data;
using Microsoft.Data.SqlClient;
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
//
// RETRIES ONLY WHAT IS WORTH RETRYING.
//   This used to catch Exception — any exception — and log it as "Database not reachable yet",
//   then try again 19 more times. A broken migration, a wrong password or a schema conflict
//   therefore spent 100 seconds pretending to be a slow container start, reported the wrong
//   cause, and then crash-looped. Only genuine "the server is not accepting connections yet"
//   failures are retried now; everything else is raised immediately, with its real message.
//
// WAITS FOR THE SERVER, NOT FOR THE DATABASE.
//   The first version of that change waited on CanConnectAsync() against the application
//   database. That call answers "no" to two completely different questions — "is the server
//   up?" and "does this database exist?" — and on a fresh volume the answer to the second one
//   is legitimately no, because the migration below is what creates it. So the wait blocked on
//   something only the step it was guarding could produce, ran out of attempts, and reported
//   "not accepting connections" about a server that had been answering the whole time. It is
//   invisible on an existing database and fatal on an empty one. The probe now opens `master`,
//   which asks the first question only.
// ---------------------------------------------------------------------------------------------
public static class DatabaseStartupExtensions
{
    // SQL Server takes 20-40 seconds to accept connections after its container starts.
    private const int MaxConnectAttempts = 20;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(5);

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
        await WaitForServerAsync(db, schema, logger, ct);

        // HasPendingModelChanges compares the code model against the LAST migration's snapshot.
        // It is checked before the early return below on purpose: a model that has drifted from
        // its migrations produces "Invalid column name" at the first query, which is a long way
        // from the change that caused it. Said here, at start, it names itself.
        if (db.Database.HasPendingModelChanges())
        {
            logger.LogError(
                "Schema '{Schema}': the EF model has changes that no migration covers (model drift). " +
                "Queries will fail with 'Invalid column name'. Generate a migration with " +
                "`dotnet ef migrations add <Name>` for this DbContext.", schema);
        }

        var pending = (await db.Database.GetPendingMigrationsAsync(ct)).ToList();

        if (pending.Count == 0)
        {
            logger.LogInformation("Schema '{Schema}' is already up to date.", schema);
            return;
        }

        logger.LogInformation(
            "Applying {Count} migration(s) to schema '{Schema}': {Names}",
            pending.Count, schema, string.Join(", ", pending));

        // Deliberately NOT retried: if a migration fails, running it again will fail the same
        // way, and the second attempt would hide the first one's message.
        await db.Database.MigrateAsync(ct);

        logger.LogInformation("Schema '{Schema}' migrated successfully.", schema);
    }

    /// <summary>
    /// Blocks until SQL Server itself is answering. Deliberately says nothing about whether the
    /// application database exists: on a fresh volume it does not, and <see cref="MigrateAsync"/>
    /// is what creates it.
    /// </summary>
    private static async Task WaitForServerAsync(
        DbContext db, string schema, ILogger logger, CancellationToken ct)
    {
        var connectionString = db.Database.GetConnectionString()
            ?? throw new InvalidOperationException(
                $"No connection string is configured for schema '{schema}'. Set " +
                "ConnectionStrings:RealEstateDb (ConnectionStrings__RealEstateDb as an " +
                "environment variable).");

        // `master` exists on every SQL Server instance from the moment it starts, so opening it
        // tests the one thing worth waiting for and nothing else. ConnectTimeout is shortened so
        // a server that is still booting fails fast and the loop keeps its own cadence instead of
        // stacking the driver's default 15s on top of every attempt.
        var probe = new SqlConnectionStringBuilder(connectionString)
        {
            InitialCatalog = "master",
            ConnectTimeout = 5,
        };

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await using var connection = new SqlConnection(probe.ConnectionString);
                await connection.OpenAsync(ct);

                logger.LogInformation("SQL Server is accepting connections (schema '{Schema}').", schema);
                return;
            }
            catch (Exception ex) when (ServerAnswered(ex))
            {
                // It refused us — but it refused us, which means it is up and listening. A wrong
                // password or a database this login may not open is a configuration error, not a
                // slow start, so the wait ends here and the migration below reports it with the
                // server's own words rather than "not accepting connections".
                logger.LogWarning(
                    "SQL Server is up but refused the connection for schema '{Schema}': {Message}",
                    schema, ex.Message);
                return;
            }
            catch (Exception ex) when (IsTransientConnectionFailure(ex) && attempt < MaxConnectAttempts)
            {
                logger.LogWarning(
                    "SQL Server is not accepting connections yet for schema '{Schema}' " +
                    "(attempt {Attempt}/{Max}): {Message}",
                    schema, attempt, MaxConnectAttempts, ex.Message);

                await Task.Delay(RetryDelay, ct);
            }

            // On the final attempt no filter matches, so the driver's own exception propagates —
            // which names the real problem better than any message invented here could.
        }
    }

    /// <summary>
    /// True when SQL Server replied. A refusal is a reply: it proves the server is listening, so
    /// there is nothing left to wait for.
    /// </summary>
    private static bool ServerAnswered(Exception ex)
    {
        for (var current = ex; current is not null; current = current.InnerException)
        {
            if (current is SqlException sql && !IsTransientNumber(sql.Number))
                return true;
        }

        return false;
    }

    /// <summary>
    /// "The server is not there yet" — worth waiting for. A wrong password, a missing database
    /// or a bad migration is NOT, and is allowed straight through so its own message is the one
    /// that reaches the log.
    /// </summary>
    private static bool IsTransientConnectionFailure(Exception ex)
    {
        for (var current = ex; current is not null; current = current.InnerException)
        {
            if (current is SqlException sql)
                return IsTransientNumber(sql.Number);

            if (current is System.Net.Sockets.SocketException or TimeoutException)
                return true;
        }

        return false;
    }

    // 53/40 = network path / server not found, 10060/10061/10053 = timeout / refused / aborted,
    // 18401 = server in recovery, 4221 = replica not ready, -2 = client timeout, 0 = the driver
    // never got far enough to be told a number.
    private static bool IsTransientNumber(int number) =>
        number is 53 or 40 or 10060 or 10061 or 10053 or 18401 or 4221 or -2 or 0;
}
