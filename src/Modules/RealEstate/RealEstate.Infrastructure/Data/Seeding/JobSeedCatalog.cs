namespace RealEstate.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  RAW JOB SEED DATA — plain values only, no EF, no entities. RealEstateDbSeeder turns these into
//  Job aggregates through Job.Create, so seeded adverts pass exactly the validation an API request
//  would.
//
//  MATCHED ON TITLE, and unlike Agent/Area/Development that check is APPLICATION-LEVEL ONLY:
//  there is no unique index on Jobs.Title (two offices may legitimately advertise the same role).
//  So renaming an entry here inserts a second advert rather than updating the first — same caveat
//  as the Properties seed. Nothing here ever updates or deletes.
//
//  The list mirrors the frontend's mock seedJobs, so switching the UI from mock mode to the real
//  API keeps the same openings on the Careers page.
// ---------------------------------------------------------------------------------------------

internal sealed class JobSeed
{
    public required string Title { get; init; }
    public required string Department { get; init; }
    public required string EmploymentType { get; init; }
    public required string Location { get; init; }
    public required string Description { get; init; }
}

internal static class JobSeedCatalog
{
    internal static readonly IReadOnlyList<JobSeed> Jobs =
    [
        new()
        {
            Title = "Senior Sales Consultant",
            Department = "Sales",
            EmploymentType = "Full-time",
            Location = "Doha, Qatar",
            Description = "Own the full sales cycle for our luxury portfolio, from first viewing to handover, and build lasting relationships with regional investors.",
        },
        new()
        {
            Title = "Digital Marketing Specialist",
            Department = "Marketing",
            EmploymentType = "Full-time",
            Location = "Doha, Qatar",
            Description = "Run performance campaigns across search and social, and grow the portal's organic reach in three languages.",
        },
        new()
        {
            Title = "Full Stack Developer",
            Department = "Technology",
            EmploymentType = "Full-time",
            Location = "Doha, Qatar (Hybrid)",
            Description = "Build the platform that powers Qatar's premier property portal - .NET APIs, React frontends, and the pipelines between.",
        },
        new()
        {
            Title = "Property Photographer",
            Department = "Marketing",
            EmploymentType = "Part-time",
            Location = "Doha, Qatar",
            Description = "Shoot and edit photography and video for luxury listings, from penthouses at dawn to villas at dusk.",
        },
        new()
        {
            Title = "Leasing Administrator",
            Department = "Operations",
            EmploymentType = "Full-time",
            Location = "Doha, Qatar",
            Description = "Keep contracts, renewals and Ejari-style registrations flowing for a portfolio of 400+ rental units.",
        },
        new()
        {
            Title = "Social Media Content Creator",
            Department = "Marketing",
            EmploymentType = "Full-time",
            Location = "Doha, Qatar",
            Description = "Tell the story of Doha's neighbourhoods in short-form video that people actually finish watching.",
        },
    ];
}
