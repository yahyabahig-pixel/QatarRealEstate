namespace Auth.Infrastructure.Data.Seeding;

// The Auth module's own copy of the seed-run ledger. Deliberately a separate type in a separate
// schema rather than a shared one: the two modules own separate DbContexts and separate
// migration histories, and a shared table would couple them at the database level — the one
// thing a modular monolith is supposed to avoid.
//
// See RealEstate.Infrastructure.Data.Seeding.SeedHistoryEntry for the reasoning behind
// recording the RUN instead of comparing the ROWS.
public sealed class AuthSeedHistoryEntry
{
    public const string DefaultPositionsKey = "default-positions-v1";

    // A one-off top-up for deployments that already have the default positions.
    //
    // SeedDefaultPositionsAsync creates a position only when no position of that name exists,
    // which is exactly right for a fresh database and exactly wrong for an upgrade: the four
    // default positions are already there, so a permission added to the defaults in a later
    // release never reaches them. Lead.Read/Update/Delete are new — without this, upgrading
    // takes the leads screens AWAY from every Property Manager and Support Manager who had
    // them, and nothing would ever put them back.
    public const string LeadPermissionsBackfillKey = "lead-permissions-backfill-v1";

    private AuthSeedHistoryEntry() { }

    public string Key { get; private set; } = string.Empty;
    public DateTimeOffset AppliedAtUtc { get; private set; }
    public string? Note { get; private set; }

    public static AuthSeedHistoryEntry Record(string key, DateTimeOffset appliedAtUtc, string? note = null) =>
        new()
        {
            Key = key,
            AppliedAtUtc = appliedAtUtc,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
        };
}
