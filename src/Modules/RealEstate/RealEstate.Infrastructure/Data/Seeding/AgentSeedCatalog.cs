namespace RealEstate.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  RAW AGENT SEED DATA — same contract as SeedCatalog: plain values only, no EF, no entities.
//  RealEstateDbSeeder turns these into Agent aggregates through Agent.Create, so seeded rows
//  pass exactly the validation an API request would. Matched on Slug (uniquely indexed);
//  the seeder only ever inserts missing rows, never updates or deletes.
//
//  The list mirrors the frontend's mock seedAgents so switching the UI from mock mode to the
//  real API keeps the same people on the "Find an Agent" pages.
// ---------------------------------------------------------------------------------------------

internal sealed class AgentSeed
{
    public required string Name { get; init; }
    public required string JobTitle { get; init; }
    public required string PhotoUrl { get; init; }
    public required string Slug { get; init; }
    public string? Phone { get; init; }
    public string? WhatsApp { get; init; }
    public string? Email { get; init; }
    public decimal Rating { get; init; }
    public string? Bio { get; init; }
}

internal static class AgentSeedCatalog
{
    private static string Photo(string id) =>
        $"https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=600&q=80";

    internal static readonly IReadOnlyList<AgentSeed> Agents =
    [
        new()
        {
            Name = "Khalid Al-Mansour", Slug = "khalid-al-mansour", JobTitle = "Founder & CEO",
            PhotoUrl = Photo("1560250097-0b93528c311a"),
            Phone = "+974 5550 1001", WhatsApp = "97455501001", Email = "khalid@qatarprime.example",
            Rating = 5.0m,
            Bio = "Two decades shaping Doha's luxury market, from The Pearl's first towers to Lusail's waterfront.",
        },
        new()
        {
            Name = "Sara El-Amin", Slug = "sara-el-amin", JobTitle = "Director of Sales",
            PhotoUrl = Photo("1573496359142-b8d87734a5a2"),
            Phone = "+974 5550 1002", WhatsApp = "97455501002", Email = "sara@qatarprime.example",
            Rating = 4.9m,
            Bio = "Specialist in Pearl Island waterfront residences and off-plan investment.",
        },
        new()
        {
            Name = "Omar Haddad", Slug = "omar-haddad", JobTitle = "Senior Sales Agent",
            PhotoUrl = Photo("1507003211169-0a1dd7228f2d"),
            Phone = "+974 5550 1003", WhatsApp = "97455501003", Email = "omar@qatarprime.example",
            Rating = 4.8m,
            Bio = "West Bay commercial towers and corporate leasing.",
        },
        new()
        {
            Name = "Layla Kassem", Slug = "layla-kassem", JobTitle = "Real Estate Consultant",
            PhotoUrl = Photo("1580489944761-15a19d654956"),
            Phone = "+974 5550 1004", WhatsApp = "97455501004", Email = "layla@qatarprime.example",
            Rating = 5.0m,
            Bio = "Family villas across Al Waab, Al Rayyan and West Bay Lagoon.",
        },
        new()
        {
            Name = "Yousef Darwish", Slug = "yousef-darwish", JobTitle = "Real Estate Consultant",
            PhotoUrl = Photo("1472099645785-5658abf4ff4e"),
            Phone = "+974 5550 1005", WhatsApp = "97455501005", Email = "yousef@qatarprime.example",
            Rating = 4.7m,
            Bio = "Lusail Marina and Fox Hills apartments — rentals and resale.",
        },
        new()
        {
            Name = "Noor Al-Thani", Slug = "noor-al-thani", JobTitle = "Senior Sales Agent",
            PhotoUrl = Photo("1438761681033-6461ffad8d80"),
            Phone = "+974 5550 1006", WhatsApp = "97455501006", Email = "noor@qatarprime.example",
            Rating = 4.9m,
            Bio = "Qetaifan Island and beachfront chalets.",
        },
        new()
        {
            Name = "Hassan Barakat", Slug = "hassan-barakat", JobTitle = "Commercial Specialist",
            PhotoUrl = Photo("1500648767791-00dcc994a43e"),
            Phone = "+974 5550 1007", WhatsApp = "97455501007", Email = "hassan@qatarprime.example",
            Rating = 4.6m,
            Bio = "Warehouses, retail and industrial across the Industrial Area and Barwa.",
        },
        new()
        {
            Name = "Mariam Fakhri", Slug = "mariam-fakhri", JobTitle = "Leasing Consultant",
            PhotoUrl = Photo("1544005313-94ddf0286df2"),
            Phone = "+974 5550 1008", WhatsApp = "97455501008", Email = "mariam@qatarprime.example",
            Rating = 4.8m,
            Bio = "Furnished rentals in Porto Arabia and Viva Bahriya.",
        },
        new()
        {
            Name = "Tariq Nassar", Slug = "tariq-nassar", JobTitle = "Investment Advisor",
            PhotoUrl = Photo("1519085360753-af0119f7cbe7"),
            Phone = "+974 5550 1009", WhatsApp = "97455501009", Email = "tariq@qatarprime.example",
            Rating = 5.0m,
            Bio = "Off-plan portfolios and rental-yield strategy for international investors.",
        },
        new()
        {
            Name = "Dana Suleiman", Slug = "dana-suleiman", JobTitle = "Real Estate Consultant",
            PhotoUrl = Photo("1487412720507-e7ab37603c6f"),
            Phone = "+974 5550 1010", WhatsApp = "97455501010", Email = "dana@qatarprime.example",
            Rating = 0m,                                        // not rated yet
            Bio = "Msheireb Downtown and city-centre apartments.",
        },
        new()
        {
            Name = "Faisal Rahim", Slug = "faisal-rahim", JobTitle = "Senior Sales Agent",
            PhotoUrl = Photo("1506794778202-cad84cf45f1d"),
            Phone = "+974 5550 1011", WhatsApp = "97455501011", Email = "faisal@qatarprime.example",
            Rating = 4.5m,
            Bio = "Al Wakrah and south Doha family compounds.",
        },
        new()
        {
            Name = "Reem Qadi", Slug = "reem-qadi", JobTitle = "Real Estate Consultant",
            PhotoUrl = Photo("1531123897727-8f129e1688ce"),
            Phone = "+974 5550 1012", WhatsApp = "97455501012", Email = "reem@qatarprime.example",
            Rating = 4.9m,
            Bio = "Waterfront penthouses and branded residences.",
        },
    ];
}
