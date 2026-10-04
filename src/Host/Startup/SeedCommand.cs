using Auth.Infrastructure.Data.Seeding;
using RealEstate.Infrastructure.Data.Seeding;

namespace Host.Startup;

// ---------------------------------------------------------------------------------------------
//  Seeding, split into what a deployment NEEDS and what a demo WANTS.
//
//  The single old SEED_DATA flag did both at once: it created the Main Admin (without which
//  nobody can log in at all) AND inserted 49 invented listings with 12 invented consultants and
//  their invented phone numbers. A first deploy therefore had to turn it on — and leaving it on
//  is what put demo listings back every time the container restarted.
//
//  Now:
//    BOOTSTRAP (automatic, every start, safe on production)
//        roles, the Main Admin, the default positions, the reference catalogs.
//        Controlled by Startup:SeedIdentity and Startup:SeedReferenceData, both on by default.
//
//    DEMO CONTENT (never automatic)
//        An explicit command, run by a human who means it:
//            docker compose run --rm backend seed --demo
//        (the image's ENTRYPOINT is already `dotnet Host.dll`, so only the arguments go here)
//        and refused outright in Production unless Startup:AllowDemoDataInProduction is set.
//
//  Both are recorded in SeedHistory and run ONCE, so whatever the admin deletes afterwards
//  stays deleted — the actual bug behind "I removed the demo data and it came back".
// ---------------------------------------------------------------------------------------------
public static class SeedCommand
{
    public const string Verb = "seed";

    /// <summary>True when the process was started as `dotnet Host.dll seed …` rather than as the web app.</summary>
    public static bool IsRequested(string[] args) =>
        args.Length > 0 && string.Equals(args[0], Verb, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Runs the requested batches and returns a process exit code. The web server is NOT started:
    /// this is a one-shot maintenance command.
    /// </summary>
    public static async Task<int> RunAsync(WebApplication app, string[] args, CancellationToken ct = default)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup.Seed");

        var force = HasFlag(args, "--force");
        var wantsIdentity = HasFlag(args, "--identity");
        var wantsReference = HasFlag(args, "--reference");
        var wantsDemo = HasFlag(args, "--demo");
        var wantsAll = HasFlag(args, "--all");

        if (!wantsIdentity && !wantsReference && !wantsDemo && !wantsAll)
        {
            logger.LogError(
                "Nothing to do. Usage: dotnet Host.dll seed [--identity] [--reference] [--demo] [--all] [--force]\n" +
                "  --identity   roles, the Main Admin and the default positions\n" +
                "  --reference  property types and the feature catalog\n" +
                "  --demo       the demo listings, consultants, areas, projects and job adverts\n" +
                "  --all        all three\n" +
                "  --force      run a batch again even if SeedHistory says it already ran " +
                "(re-inserts rows that were deleted since)");
            return 2;
        }

        if (wantsAll)
        {
            wantsIdentity = true;
            wantsReference = true;
            wantsDemo = true;
        }

        // The migrations have to be in place before anything can be inserted. Applying them here
        // too means `seed` works on a brand-new database in one step.
        await app.MigrateDatabaseAsync(ct);

        if (wantsIdentity)
        {
            await app.Services.SeedAuthAsync(force, ct);
        }

        if (wantsReference)
        {
            var inserted = await app.Services.SeedRealEstateReferenceDataAsync(force, ct);
            logger.LogInformation(inserted
                ? "Reference data seeded."
                : "Reference data was already applied — nothing inserted.");
        }

        if (wantsDemo)
        {
            if (!DemoDataAllowed(app, logger))
                return 3;

            var inserted = await app.Services.SeedRealEstateDemoDataAsync(force, ct);
            logger.LogInformation(inserted
                ? "Demo data seeded."
                : "Demo data was already applied — nothing inserted. Pass --force to insert it again.");
        }

        logger.LogInformation("Seed command finished.");
        return 0;
    }

    /// <summary>
    /// The bootstrap that runs on every normal start. Identity and reference data only — never
    /// demo content, whatever the configuration says.
    /// </summary>
    public static async Task RunStartupBootstrapAsync(WebApplication app, CancellationToken ct = default)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup.Seed");

        // Startup:SeedData is the old single flag. It is still read so an existing .env keeps
        // working, but it now means ONLY "bootstrap this deployment" — the demo listings it
        // used to drag along are behind the explicit command instead.
        var legacy = app.Configuration.GetValue<bool?>("Startup:SeedData");

        if (legacy is true)
            logger.LogWarning(
                "Startup:SeedData is deprecated. It now seeds identity and reference data only; " +
                "demo content moved to `dotnet Host.dll seed --demo`. " +
                "Replace it with Startup:SeedIdentity and Startup:SeedReferenceData.");

        var seedIdentity = app.Configuration.GetValue("Startup:SeedIdentity", legacy ?? true);
        var seedReference = app.Configuration.GetValue("Startup:SeedReferenceData", legacy ?? true);

        if (seedIdentity)
            await app.Services.SeedAuthAsync(force: false, ct);

        if (seedReference)
            await app.Services.SeedRealEstateReferenceDataAsync(force: false, ct);

        // A deployment that still has the old flag on is told, once per start, where the demo
        // content went — otherwise "my listings disappeared after the upgrade" is a mystery.
        if (legacy is true)
            logger.LogInformation(
                "Demo content is no longer seeded automatically. Run " +
                "`docker compose run --rm backend seed --demo` on a development database if you want it.");
    }

    private static bool DemoDataAllowed(WebApplication app, ILogger logger)
    {
        if (!app.Environment.IsProduction())
            return true;

        if (app.Configuration.GetValue("Startup:AllowDemoDataInProduction", false))
        {
            logger.LogWarning(
                "Inserting DEMO data into a PRODUCTION environment because " +
                "Startup:AllowDemoDataInProduction is set. Invented listings, invented " +
                "consultants and invented phone numbers are about to go into this database.");
            return true;
        }

        logger.LogError(
            "Refusing to seed demo data: ASPNETCORE_ENVIRONMENT is Production. Demo content is " +
            "invented listings and invented people, and it does not belong on a live site. If " +
            "this really is a staging box that only calls itself Production, set " +
            "Startup__AllowDemoDataInProduction=true and run the command again.");
        return false;
    }

    private static bool HasFlag(string[] args, string flag) =>
        args.Any(a => string.Equals(a, flag, StringComparison.OrdinalIgnoreCase));
}
