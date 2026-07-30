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
    public required string Area { get; init; }        // becomes Location street + state
    public required double Lat { get; init; }          // Y coordinate
    public required double Lng { get; init; }          // X coordinate
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
    // Development covers are used twice at very different sizes: the 320x384 card in the
    // homepage "Unlock High-Value Investment Opportunities" rail, and the full-width hero on
    // the development detail page. Both use object-cover, so the source is pinned to a single
    // 3:2 crop at 1800px - one consistent aspect ratio, sharp on retina in both places.
    private static string Photo(string id) =>
        $"https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=1800&h=1200&q=85";

    internal static readonly IReadOnlyList<DevelopmentSeed> Developments =
    [
        new()
        {
            Name = "Crescent Bay Residences", Slug = "crescent-bay-residences",
            Area = "The Pearl", Lat = 25.3705, Lng = 51.5504, DeliveryYear = 2027,
            CoverImageUrl = Photo("1684398863223-1a517d708ed5"),
            Description = "A final crescent of waterfront towers on The Pearl — 1 to 4 bedroom residences above a new marina promenade, with a residents-only beach club.",
            UnitsCount = 220, DeveloperName = "Pearl Waterfront Co.",
            StartingPrice = 1_900_000m, PaymentPlan = "20/80 over 4 years",
        },
        new()
        {
            Name = "Vendôme Sky Collection", Slug = "vendome-sky-collection",
            Area = "Lusail Marina District", Lat = 25.43, Lng = 51.545, DeliveryYear = 2027,
            CoverImageUrl = Photo("1700901742651-6b353164caf3"),
            Description = "Branded sky residences over the Lusail boulevard: hotel services, private cinema and a 60th-floor infinity edge pool.",
            UnitsCount = 148, DeveloperName = "Marina Prime Developments",
            StartingPrice = 2_400_000m, PaymentPlan = "10/90 on handover",
        },
        new()
        {
            Name = "Qetaifan Beach Villas", Slug = "qetaifan-beach-villas",
            Area = "Qetaifan Island", Lat = 25.468, Lng = 51.5583, DeliveryYear = 2028,
            CoverImageUrl = Photo("1728488443267-8340c9a74dcf"),
            Description = "Forty beachfront villas on Qetaifan Island North, each with a private pool and direct sand access.",
            UnitsCount = 40, DeveloperName = "Island Estates Qatar",
            StartingPrice = 8_500_000m, PaymentPlan = "30/70 milestone plan",
        },
        new()
        {
            Name = "Fox Hills Central Park", Slug = "fox-hills-central-park",
            Area = "Fox Hills", Lat = 25.4106, Lng = 51.4904, DeliveryYear = 2026,
            CoverImageUrl = Photo("1693043114667-0f300e066f64"),
            Description = "Park-facing mid-rise living in the heart of Lusail — studios to 3-beds around 40,000 sqm of green.",
            UnitsCount = 380, DeveloperName = "Lusail Living Group",
            StartingPrice = 780_000m, PaymentPlan = "5% booking, 1% monthly",
        },
        new()
        {
            Name = "Corniche Gate Tower", Slug = "corniche-gate-tower",
            Area = "West Bay", Lat = 25.3211, Lng = 51.531, DeliveryYear = 2027,
            CoverImageUrl = Photo("1507904139316-3c7422a97a49"),
            Description = "A 52-storey corniche landmark: offices below, residences above, a sky lobby between.",
            UnitsCount = 190, DeveloperName = "Doha Gate Partners",
            StartingPrice = 1_650_000m, PaymentPlan = "25/75 over 3 years",
        },
        new()
        {
            Name = "Giardino Courtyards", Slug = "giardino-courtyards",
            Area = "The Pearl", Lat = 25.3688, Lng = 51.5512, DeliveryYear = 2026,
            CoverImageUrl = Photo("1645107257827-f2ebd12635e9"),
            Description = "Low-rise Mediterranean courtyards on Giardino Village — townhouses and garden apartments.",
            UnitsCount = 96, DeveloperName = "Pearl Waterfront Co.",
            StartingPrice = 2_100_000m, PaymentPlan = "15/85 on handover",
        },
        new()
        {
            Name = "Msheireb Heritage Quarter", Slug = "msheireb-heritage-quarter",
            Area = "Msheireb", Lat = 25.2867, Lng = 51.5264, DeliveryYear = 2028,
            CoverImageUrl = Photo("1720276790084-67b1589613c4"),
            Description = "Smart-city residences woven into downtown Doha's regenerated heritage district.",
            UnitsCount = 130, DeveloperName = "Downtown Regeneration Co.",
            StartingPrice = 1_450_000m, PaymentPlan = "20/80 over 4 years",
        },
        new()
        {
            Name = "Al Waab Garden Estates", Slug = "al-waab-garden-estates",
            Area = "Al Waab", Lat = 25.321, Lng = 51.44, DeliveryYear = 2027,
            CoverImageUrl = Photo("1645614565790-1b1de7d7cf50"),
            Description = "A gated enclave of 58 family villas beside Aspire Park, each with garden and pool option.",
            UnitsCount = 58, DeveloperName = "Aspire Estates",
            StartingPrice = 5_200_000m, PaymentPlan = "30/70 milestone plan",
        },
    ];
}
