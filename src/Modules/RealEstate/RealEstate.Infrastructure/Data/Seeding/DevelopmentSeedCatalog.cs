namespace RealEstate.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  RAW DEVELOPMENT SEED DATA — same contract as SeedCatalog/AgentSeedCatalog: plain values
//  only. RealEstateDbSeeder turns these into Development aggregates through Development.Create.
//  Matched on Slug (uniquely indexed); the seeder only ever inserts missing rows.
//
//  The list mirrors the frontend's mock seedDevelopments so switching the UI from mock mode
//  to the real API keeps the same projects on the "Developments" pages.
// ---------------------------------------------------------------------------------------------

internal sealed class DevelopmentSeed
{
    public required string Name { get; init; }
    public required string Slug { get; init; }
    public required string AreaName { get; init; }
    public required int DeliveryYear { get; init; }
    public required string CoverImageUrl { get; init; }
    public string? Description { get; init; }
    public int UnitsCount { get; init; }
    public string? DeveloperName { get; init; }
    public decimal StartingPrice { get; init; }
    public string? PaymentPlan { get; init; }
}

internal static class DevelopmentSeedCatalog
{
    private static string Photo(string id) =>
        $"https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=1200&q=80";

    internal static readonly IReadOnlyList<DevelopmentSeed> Developments =
    [
        new()
        {
            Name = "Crescent Bay Residences", Slug = "crescent-bay-residences",
            AreaName = "The Pearl", DeliveryYear = 2027,
            CoverImageUrl = Photo("1512453979798-5ea266f8880c"),
            Description = "A final crescent of waterfront towers on The Pearl — 1 to 4 bedroom residences above a new marina promenade, with a residents-only beach club.",
            UnitsCount = 220, DeveloperName = "Pearl Waterfront Co.",
            StartingPrice = 1_900_000m, PaymentPlan = "20/80 over 4 years",
        },
        new()
        {
            Name = "Vendôme Sky Collection", Slug = "vendome-sky-collection",
            AreaName = "Lusail Marina District", DeliveryYear = 2027,
            CoverImageUrl = Photo("1449824913935-59a10b8d2000"),
            Description = "Branded sky residences over the Lusail boulevard: hotel services, private cinema and a 60th-floor infinity edge pool.",
            UnitsCount = 148, DeveloperName = "Marina Prime Developments",
            StartingPrice = 2_400_000m, PaymentPlan = "10/90 on handover",
        },
        new()
        {
            Name = "Qetaifan Beach Villas", Slug = "qetaifan-beach-villas",
            AreaName = "Qetaifan Island", DeliveryYear = 2028,
            CoverImageUrl = Photo("1613977257363-707ba9348227"),
            Description = "Forty beachfront villas on Qetaifan Island North, each with a private pool and direct sand access.",
            UnitsCount = 40, DeveloperName = "Island Estates Qatar",
            StartingPrice = 8_500_000m, PaymentPlan = "30/70 milestone plan",
        },
        new()
        {
            Name = "Fox Hills Central Park", Slug = "fox-hills-central-park",
            AreaName = "Fox Hills", DeliveryYear = 2026,
            CoverImageUrl = Photo("1460317442991-0ec209397118"),
            Description = "Park-facing mid-rise living in the heart of Lusail — studios to 3-beds around 40,000 sqm of green.",
            UnitsCount = 380, DeveloperName = "Lusail Living Group",
            StartingPrice = 780_000m, PaymentPlan = "5% booking, 1% monthly",
        },
        new()
        {
            Name = "Corniche Gate Tower", Slug = "corniche-gate-tower",
            AreaName = "West Bay", DeliveryYear = 2027,
            CoverImageUrl = Photo("1577717903315-1691ae25ab3f"),
            Description = "A 52-storey corniche landmark: offices below, residences above, a sky lobby between.",
            UnitsCount = 190, DeveloperName = "Doha Gate Partners",
            StartingPrice = 1_650_000m, PaymentPlan = "25/75 over 3 years",
        },
        new()
        {
            Name = "Giardino Courtyards", Slug = "giardino-courtyards",
            AreaName = "The Pearl", DeliveryYear = 2026,
            CoverImageUrl = Photo("1518684079-3c830dcef090"),
            Description = "Low-rise Mediterranean courtyards on Giardino Village — townhouses and garden apartments.",
            UnitsCount = 96, DeveloperName = "Pearl Waterfront Co.",
            StartingPrice = 2_100_000m, PaymentPlan = "15/85 on handover",
        },
        new()
        {
            Name = "Msheireb Heritage Quarter", Slug = "msheireb-heritage-quarter",
            AreaName = "Msheireb", DeliveryYear = 2028,
            CoverImageUrl = Photo("1512917774080-9991f1c4c750"),
            Description = "Smart-city residences woven into downtown Doha's regenerated heritage district.",
            UnitsCount = 130, DeveloperName = "Downtown Regeneration Co.",
            StartingPrice = 1_450_000m, PaymentPlan = "20/80 over 4 years",
        },
        new()
        {
            Name = "Al Waab Garden Estates", Slug = "al-waab-garden-estates",
            AreaName = "Al Waab", DeliveryYear = 2027,
            CoverImageUrl = Photo("1600585154340-be6161a56a0c"),
            Description = "A gated enclave of 58 family villas beside Aspire Park, each with garden and pool option.",
            UnitsCount = 58, DeveloperName = "Aspire Estates",
            StartingPrice = 5_200_000m, PaymentPlan = "30/70 milestone plan",
        },
    ];
}
