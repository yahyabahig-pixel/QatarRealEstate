namespace RealEstate.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  A record that one seed batch has already been applied to THIS database.
//
//  WHY THIS EXISTS — the bug it fixes:
//    The seeder used to be "idempotent by insert": on every startup it looked for each catalog
//    row and inserted the ones it could not find. That makes a fresh database correct, but it
//    also makes DELETION IMPOSSIBLE: an admin who removed a demo listing got it back on the
//    next restart, because "missing" is exactly what the seeder inserts.
//
//    Recording the RUN instead of comparing the ROWS turns that around. Once a batch is in this
//    table it never runs again, so whatever the admin does to those rows afterwards — edit,
//    delete, archive — is final. That is what an admin means by "delete".
//
//  Seeding a NEW batch later (a property type the product did not have before) is a NEW key,
//  e.g. "reference-data-v2": the old key stays applied, the new one runs once, and nothing that
//  was deleted in between comes back.
//
//  To deliberately re-run a batch (a dev machine, a fresh test database), delete its row:
//      DELETE FROM realestate.SeedHistory WHERE [Key] = 'demo-data-v1';
//  or pass --force to the seed command, which does the same thing for the batches it runs.
// ---------------------------------------------------------------------------------------------
public sealed class SeedHistoryEntry
{
    public const string ReferenceDataKey = "reference-data-v1";
    public const string DemoDataKey = "demo-data-v1";

    // Parameterless ctor + private setters: EF materializes it, nothing else builds one
    // except the factory below.
    private SeedHistoryEntry() { }

    public string Key { get; private set; } = string.Empty;
    public DateTimeOffset AppliedAtUtc { get; private set; }
    public string? Note { get; private set; }

    public static SeedHistoryEntry Record(string key, DateTimeOffset appliedAtUtc, string? note = null) =>
        new()
        {
            Key = key,
            AppliedAtUtc = appliedAtUtc,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
        };
}
