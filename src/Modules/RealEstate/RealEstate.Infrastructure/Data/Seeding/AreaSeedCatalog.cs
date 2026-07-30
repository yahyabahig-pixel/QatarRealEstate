namespace RealEstate.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  RAW AREA SEED DATA — same contract as the other seed catalogs: plain values only.
//  Matched on Slug (uniquely indexed); the seeder only ever inserts missing rows.
//  Mirrors the frontend's mock seedAreas so mock → real API keeps the same area guide.
// ---------------------------------------------------------------------------------------------

internal sealed class AreaSeed
{
    public required string Name { get; init; }
    public required string Slug { get; init; }
    public required string PhotoUrl { get; init; }
    public string? Intro { get; init; }
}

internal static class AreaSeedCatalog
{
    private static string Photo(string id) =>
        $"https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=1200&q=80";

    internal static readonly IReadOnlyList<AreaSeed> Areas =
    [
        new()
        {
            Name = "The Pearl", Slug = "the-pearl",
            PhotoUrl = Photo("1512453979798-5ea266f8880c"),
            Intro = "Qatar's man-made island icon — Mediterranean-style marinas, boardwalk dining and freehold towers that anchor the country's luxury market.",
        },
        new()
        {
            Name = "Porto Arabia", Slug = "porto-arabia",
            PhotoUrl = Photo("1518684079-3c830dcef090"),
            Intro = "The Pearl's grandest quarter: a crescent of residential towers wrapped around a superyacht marina.",
        },
        new()
        {
            Name = "West Bay", Slug = "west-bay",
            PhotoUrl = Photo("1577717903315-1691ae25ab3f"),
            Intro = "Doha's skyline district — corporate headquarters, five-star hotels and corniche-front apartments.",
        },
        new()
        {
            Name = "Lusail Marina District", Slug = "lusail-marina",
            PhotoUrl = Photo("1449824913935-59a10b8d2000"),
            Intro = "The centrepiece of Qatar's newest city: waterfront boulevards, Place Vendôme and next-generation towers.",
        },
        new()
        {
            Name = "Fox Hills", Slug = "fox-hills",
            PhotoUrl = Photo("1460317442991-0ec209397118"),
            Intro = "Lusail's fastest-growing residential quarter — mid-rise living, parks and strong rental yields.",
        },
        new()
        {
            Name = "Al Waab", Slug = "al-waab",
            PhotoUrl = Photo("1600585154340-be6161a56a0c"),
            Intro = "Established villa territory beside Aspire Park — compounds, gardens and family life.",
        },
    ];

    // -------------------------------------------------------------------------------------------
    //  ONE-TIME BACKFILL MAP — used only by the seeder to file the ORIGINAL demo listings under an
    //  area. The demo listings predate the Areas catalog, so nothing in SeedCatalog.cs names an
    //  area; these keywords are matched against each listing's Title + Street instead.
    //
    //  ORDER IS SIGNIFICANT: the first entry that matches wins. "Porto Arabia" sits above
    //  "The Pearl" because Porto Arabia is a quarter INSIDE The Pearl — the more specific area
    //  should win for a listing that mentions both.
    //
    //  Real listings created through the API never touch this: they carry a real AreaId chosen by
    //  the admin. This exists purely so the seeded demo data doesn't show every area as empty.
    // -------------------------------------------------------------------------------------------
    internal static readonly IReadOnlyList<(string Slug, string[] Keywords)> BackfillKeywords =
    [
        ("porto-arabia",  ["Porto Arabia"]),
        ("the-pearl",     ["The Pearl"]),
        ("west-bay",      ["West Bay", "Majlis Al Taawon"]),
        ("lusail-marina", ["Lusail Marina", "Marina District"]),
        ("fox-hills",     ["Fox Hills"]),
        ("al-waab",       ["Al Waab"]),
    ];
}
