using RealEstate.Domain.Enums;

namespace RealEstate.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  SHOWCASE SEED DATA — 20 extra listings + the areas, developments and property types they need.
//
//  WHY A SECOND CATALOG FILE INSTEAD OF EXTENDING SeedCatalog.cs?
//    SeedCatalog.cs is the original demo set and its 9 listings are referenced by
//    AreaSeedCatalog.BackfillKeywords. Keeping the new data in its own file means the two sets
//    stay independently reviewable and either can be trimmed without touching the other.
//    Same contract as every other catalog here: PLAIN VALUES ONLY, no EF and no domain types.
//    RealEstateDbSeeder is still the only place that turns these into real aggregates through
//    the domain factories, so every seeded row passes exactly the validation an API request does.
//
//  WHAT THIS ADDS OVER PropertySeed (SeedCatalog.cs):
//    AreaSlug / AgentSlug  — explicit links instead of the keyword backfill, so every listing
//                            shows its neighbourhood guide and a real consultant on the card.
//    IsOffPlan             — drives the "Off-Plan" badge and the developments inventory lists.
//    PriceOnRequest        — drives "Price on request" on the card and the off-market page.
//                            NOTE: the domain still requires a real, positive price underneath,
//                            so these rows carry a genuine figure that the UI simply hides.
//
//  PHOTOGRAPHY: every URL below reuses an Unsplash id that is ALREADY in this repository
//  (SeedCatalog / AreaSeedCatalog / DevelopmentSeedCatalog / the frontend's mock data), so no
//  seeded listing can ever render a broken image. Swap them for your own CDN whenever you like —
//  Media.Url, Area.PhotoUrl and Development.CoverImageUrl are all plain strings.
// ---------------------------------------------------------------------------------------------

/// <summary>A showcase listing. Superset of <see cref="PropertySeed"/> — see the file header.</summary>
internal sealed class ShowcasePropertySeed
{
    // PropertyConstants: 10–100 characters, and unique against everything already in the table.
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string PropertyTypeName { get; init; }

    // --- location. Longitude -> Location.XCoordinate, Latitude -> Location.YCoordinate. ---
    public string Country { get; init; } = "Qatar";
    public required string City { get; init; }
    public required string Street { get; init; }
    public string PostalCode { get; init; } = "00974";
    public string State { get; init; } = string.Empty;
    public required string Longitude { get; init; }
    public required string Latitude { get; init; }
    public string? LocationDescription { get; init; }

    // --- catalog links (resolved to Guids at seed time; an unknown slug is skipped, not fatal) ---
    public string? AreaSlug { get; init; }
    public string? AgentSlug { get; init; }

    // --- specs ---
    public int Rooms { get; init; }
    public int Bathrooms { get; init; }
    public decimal AreaInSquareMeters { get; init; }

    // --- listing terms ---
    public ListingKind Kind { get; init; }
    public decimal SalePrice { get; init; }
    // `global::` is required here: inside this class `PaymentMethod` binds to the property above,
    // not to the enum type. Same reason PropertySeed in SeedCatalog.cs spells it out.
    public PaymentMethod PaymentMethod { get; init; } = global::RealEstate.Domain.Enums.PaymentMethod.Cash;
    public InstallmentSeed? Installment { get; init; }   // required when PaymentMethod == Installment
    public decimal RentPrice { get; init; }
    public int ContractDurationMonths { get; init; }     // RentTerms requires > 0 for a rental
    public string Currency { get; init; } = "QAR";

    // --- lifecycle / flags ---
    public bool Publish { get; init; } = true;
    public bool IsFeatured { get; init; }                // only legal on a published listing
    public bool IsOffPlan { get; init; }
    public bool PriceOnRequest { get; init; }

    public MediaSeed[] Media { get; init; } = [];
    public PropertyFeatureSeed[] Features { get; init; } = [];
}

internal static class ShowcaseSeedCatalog
{
    // Only ids already present elsewhere in this repository — see the file header.
    private const string U = "https://images.unsplash.com/photo-";
    private static string Img(string id) => $"{U}{id}?auto=format&fit=crop&w=1600&q=80";
    private static string Cover(string id) => $"{U}{id}?auto=format&fit=crop&w=1200&q=80";

    // Development covers only. Pinned to one 3:2 crop at 1800px because the same image is used
    // both as the 320x384 card in the homepage developments rail and as the full-width hero on
    // the development detail page — one aspect ratio, sharp on retina at both sizes.
    private static string DevCover(string id) => $"{U}{id}?auto=format&fit=crop&w=1800&h=1200&q=85";

    // -----------------------------------------------------------------------------------------
    //  Extra property types. Matched on Name (uniquely indexed) exactly like SeedCatalog's.
    //  "Land" in particular is what lets the frontend card drop the bed/bath row for plots.
    // -----------------------------------------------------------------------------------------
    internal static readonly PropertyTypeSeed[] PropertyTypes =
    [
        new() { Name = "Land",   Description = "A registered plot sold without a building on it." },
        new() { Name = "Duplex", Description = "A two-storey unit inside a larger building, with its own internal stair." },
    ];

    // -----------------------------------------------------------------------------------------
    //  Extra areas. Matched on Slug (uniquely indexed).
    // -----------------------------------------------------------------------------------------
    internal static readonly AreaSeed[] Areas =
    [
        new()
        {
            Name = "Qetaifan Island", Slug = "qetaifan-island",
            PhotoUrl = Cover("1613977257363-707ba9348227"),
            Intro = "Lusail's leisure island — beach clubs, the region's largest waterpark and a "
                  + "short, strictly limited run of freehold beachfront plots and villas.",
        },
        new()
        {
            Name = "Msheireb Downtown", Slug = "msheireb-downtown",
            PhotoUrl = Cover("1512917774080-9991f1c4c750"),
            Intro = "Doha's rebuilt heart: low-rise Qatari architecture, two metro lines under your "
                  + "feet and the walkable city centre the rest of the Gulf is still trying to copy.",
        },
        new()
        {
            Name = "West Bay Lagoon", Slug = "west-bay-lagoon",
            PhotoUrl = Cover("1502672260266-1c1ef2d93688"),
            Intro = "Old-money Doha — private beaches, embassy residences and the largest "
                  + "family compounds inside the city.",
        },
        new()
        {
            Name = "Al Sadd", Slug = "al-sadd",
            PhotoUrl = Cover("1497366216548-37526070297c"),
            Intro = "Central, dense and permanently in demand: offices, clinics and the city's most "
                  + "rentable apartments, minutes from Al Sadd metro.",
        },
        new()
        {
            Name = "Simaisma", Slug = "simaisma",
            PhotoUrl = Cover("1493809842364-78817add7ffb"),
            Intro = "Twenty-five minutes north of Doha: genuine beachfront plots, weekend estates "
                  + "and the calmest stretch of coast in the country.",
        },
        new()
        {
            Name = "Al Wakrah", Slug = "al-wakrah",
            PhotoUrl = Cover("1570129477492-45c003edd2be"),
            Intro = "A restored fishing town turned family suburb — the souq, the beach and "
                  + "compound villas at a fraction of Pearl pricing.",
        },
        new()
        {
            Name = "Al Rayyan", Slug = "al-rayyan",
            PhotoUrl = Cover("1580587771525-78b9dba3b914"),
            Intro = "Qatar's second city and its largest villa belt — compounds, schools and "
                  + "the space a growing family actually needs, fifteen minutes from downtown.",
        },
        new()
        {
            Name = "Old Airport", Slug = "old-airport",
            PhotoUrl = Cover("1524758631624-e2822e304c36"),
            Intro = "Unglamorous and unbeatable on price per square metre: solid mid-rise "
                  + "apartments, every shop you need on foot, and the metro at the end of the road.",
        },
        new()
        {
            Name = "Al Khor", Slug = "al-khor",
            PhotoUrl = Cover("1502005229762-cf1b2da7c5d6"),
            Intro = "The northern coast proper — mangroves, a working harbour and weekend "
                  + "estates for people who want the sea without the service charge.",
        },
    ];

    // -----------------------------------------------------------------------------------------
    //  Extra developments. Matched on Slug (uniquely indexed).
    // -----------------------------------------------------------------------------------------
    internal static readonly DevelopmentSeed[] Developments =
    [
        new()
        {
            Name = "Marsa Arabia Island Towers", Slug = "marsa-arabia-island-towers",
            Area = "The Pearl", Lat = 25.3688, Lng = 51.5461, DeliveryYear = 2028,
            CoverImageUrl = DevCover("1669300884869-e6e11c67c031"),
            Description = "Two towers on their own island inside The Pearl, above a 90-berth marina, "
                        + "a cinema and a covered retail promenade. Studios to four-bedroom duplexes.",
            UnitsCount = 310, DeveloperName = "Pearl Waterfront Co.",
            StartingPrice = 1_150_000m, PaymentPlan = "10/90 — 10% on booking, balance on handover",
        },
        new()
        {
            Name = "Lusail Boulevard Residences", Slug = "lusail-boulevard-residences",
            Area = "Lusail Marina District", Lat = 25.4287, Lng = 51.4913, DeliveryYear = 2027,
            CoverImageUrl = DevCover("1700901546317-7e1829579632"),
            Description = "Directly on Lusail Boulevard, the country's event spine. Serviced "
                        + "apartments over ground-floor restaurants, with a rental-management "
                        + "programme run by the developer.",
            UnitsCount = 264, DeveloperName = "Lusail Living Group",
            StartingPrice = 980_000m, PaymentPlan = "25/75 over 3 years",
        },
        new()
        {
            Name = "Simaisma Beach Collection", Slug = "simaisma-beach-collection",
            Area = "Simaisma", Lat = 25.6481, Lng = 51.5334, DeliveryYear = 2029,
            CoverImageUrl = DevCover("1706197024342-4f3f556c9060"),
            Description = "Eighteen beachfront villas on a private stretch of the northern coast. "
                        + "Each plot reaches the waterline; no shared walls anywhere in the scheme.",
            UnitsCount = 18, DeveloperName = "Island Estates Qatar",
            StartingPrice = 8_400_000m, PaymentPlan = "30/70 over 4 years",
        },
        new()
        {
            Name = "Qetaifan North Beach Plots", Slug = "qetaifan-north-beach-plots",
            Area = "Qetaifan Island", Lat = 25.4534, Lng = 51.5472, DeliveryYear = 2026,
            CoverImageUrl = DevCover("1647755453118-aad22e0f7cc0"),
            Description = "Serviced freehold plots on Qetaifan Island North with infrastructure "
                        + "complete and design guidelines issued — build to your own architect's "
                        + "drawings inside an approved envelope.",
            UnitsCount = 34, DeveloperName = "Island Estates Qatar",
            StartingPrice = 5_600_000m, PaymentPlan = "Cash, or 40/60 across 24 months",
        },
        new()
        {
            Name = "Msheireb Metro Lofts", Slug = "msheireb-metro-lofts",
            Area = "Msheireb Downtown", Lat = 25.2871, Lng = 51.5249, DeliveryYear = 2027,
            CoverImageUrl = DevCover("1647252285041-9b2886aff1c6"),
            Description = "Double-height loft apartments above the Msheireb interchange, where the "
                        + "Red, Green and Gold metro lines meet. The best-connected address in Qatar.",
            UnitsCount = 122, DeveloperName = "Downtown Regeneration Co.",
            StartingPrice = 1_320_000m, PaymentPlan = "20/80 over 3 years",
        },
        new()
        {
            Name = "West Bay Lagoon Villas", Slug = "west-bay-lagoon-villas",
            Area = "West Bay Lagoon", Lat = 25.3812, Lng = 51.4934, DeliveryYear = 2028,
            CoverImageUrl = DevCover("1682953329199-1d4a39a46685"),
            Description = "Twelve replacement villas on the lagoon's last undeveloped frontage — "
                        + "private moorings, staff wings and basement parking for four cars.",
            UnitsCount = 12, DeveloperName = "Doha Gate Partners",
            StartingPrice = 11_500_000m, PaymentPlan = "Staged against construction milestones",
        },
    ];

    // -----------------------------------------------------------------------------------------
    //  The 20 listings.
    //
    //  Spread deliberately, and verified by a dry run against the domain factories — the exact
    //  counts are printed by that harness, so the numbers in this comment are measured, not
    //  guessed. Together with SeedCatalog's 9 this gives 49 listings across 15 areas.
    //
    //  Every price band is represented on purpose: a QAR 3,900/month studio through to a
    //  QAR 24.5M lagoon estate, so filters, sorting and pagination all have something to bite on.
    //  Also included: land plots and offices (not just homes), off-plan units for the development
    //  pages, price-on-request rows for the off-market page, and one Draft the public site must
    //  never show — the fastest way to catch a leak in the published-only filters.
    // -----------------------------------------------------------------------------------------
    internal static readonly ShowcasePropertySeed[] Properties =
    [
        // ------------------------------------------------------------------ 1. Pearl penthouse
        new()
        {
            Title = "Porto Arabia Penthouse with Marina Frontage",
            Description = "The full top floor of a Porto Arabia tower, facing the superyacht marina "
                        + "across an eleven-metre living room.\n\n"
                        + "Layout:\n"
                        + "Four bedroom suites, a separate majlis, a formal dining room seating twelve "
                        + "and a wrapped terrace that keeps shade from mid-afternoon onward.\n\n"
                        + "Building:\n"
                        + "Concierge, residents' pool on the podium, gym on level two and direct "
                        + "boardwalk access to the Porto Arabia restaurants.",
            PropertyTypeName = "Penthouse",
            City = "Doha", State = "Ad Dawhah", Street = "Porto Arabia Drive",
            Longitude = "51.5504", Latitude = "25.3705",
            LocationDescription = "Porto Arabia, The Pearl — marina side",
            AreaSlug = "porto-arabia", AgentSlug = "khalid-al-mansour",
            Rooms = 4, Bathrooms = 5, AreaInSquareMeters = 615m,
            Kind = ListingKind.Sale, SalePrice = 13_200_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1512453979798-5ea266f8880c"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600607687939-ce8a6c25118c"), Order = 1 },
                new() { Url = Img("1600596542815-ffad4c1539a9"), Order = 2 },
                new() { Url = Img("1512699355324-f07e3106dae5"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Concierge" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Covered Parking", Value = "3" },
                new() { FeatureName = "Balconies",       Value = "4" },
                new() { FeatureName = "Floor Number",    Value = "31" },
                new() { FeatureName = "Furnishing",      Value = "Furnished" },
            ],
        },

        // ------------------------------------------------------------- 2. Viva Bahriya 2-bed rent
        new()
        {
            Title = "Sea-View Two Bedroom in Viva Bahriya",
            Description = "A corner two-bedroom in Viva Bahriya's Moroccan-styled quarter, looking "
                        + "straight out over open water rather than into the next tower.\n\n"
                        + "Included:\n"
                        + "Chiller, building maintenance and access to the beach deck and lap pool "
                        + "are all inside the rent. Fully furnished to a lettable standard.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Viva Bahriya Tower 18",
            Longitude = "51.5461", Latitude = "25.3762",
            LocationDescription = "Viva Bahriya, The Pearl",
            AreaSlug = "the-pearl", AgentSlug = "sara-el-amin",
            Rooms = 2, Bathrooms = 3, AreaInSquareMeters = 148m,
            Kind = ListingKind.Rent, RentPrice = 14_500m, ContractDurationMonths = 12,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1502672260266-1c1ef2d93688"), Order = 0, IsPrimary = true },
                new() { Url = Img("1560448204-e02f11c3d0e2"), Order = 1 },
                new() { Url = Img("1522708323590-d24dbb6b0267"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Beach Access" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Covered Parking", Value = "1" },
                new() { FeatureName = "Furnishing",      Value = "Furnished" },
            ],
        },

        // ------------------------------------------------------- 3. Qanat Quartier townhouse sale
        new()
        {
            Title = "Canal-Side Townhouse in Qanat Quartier",
            Description = "One of the pastel townhouses on Qanat Quartier's inner canal, with a "
                        + "boat mooring at the door and the Venetian bridges a minute away.\n\n"
                        + "Over three floors:\n"
                        + "Kitchen and majlis at canal level, two bedrooms above, and a master suite "
                        + "with a roof terrace on the top floor.",
            PropertyTypeName = "Townhouse",
            City = "Doha", State = "Ad Dawhah", Street = "Qanat Quartier Canal Walk",
            Longitude = "51.5428", Latitude = "25.3821",
            LocationDescription = "Qanat Quartier, The Pearl",
            AreaSlug = "the-pearl", AgentSlug = "omar-haddad",
            Rooms = 3, Bathrooms = 4, AreaInSquareMeters = 295m,
            Kind = ListingKind.Sale, SalePrice = 7_450_000m, PaymentMethod = PaymentMethod.Installment,
            Installment = new()
            {
                DownPayment = 1_490_000m,          // 20% down
                NumberOfInstallments = 48,
                InstallmentAmount = 124_100m,
                Frequency = Frequency.Monthly,
            },
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1518684079-3c830dcef090"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600566753190-17f0baa2a6c3"), Order = 1 },
                new() { Url = Img("1600585154340-be6161a56a0c"), Order = 2 },
                new() { Url = Img("1615529182904-14819c35db37"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Pets Allowed" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Semi-furnished" },
            ],
        },

        // --------------------------------------------------------- 4. West Bay corniche rent
        new()
        {
            Title = "High-Floor Corniche Apartment in West Bay",
            Description = "Level 34 of a West Bay tower, with the Corniche and the whole Doha Bay "
                        + "curve in front of the windows.\n\n"
                        + "Practical notes:\n"
                        + "Walk to DECC metro in six minutes. Chiller is included; the building "
                        + "accepts corporate leases and can invoice a company directly.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Al Corniche Street",
            Longitude = "51.5310", Latitude = "25.3208",
            LocationDescription = "West Bay, opposite the Sheraton Park",
            AreaSlug = "west-bay", AgentSlug = "layla-kassem",
            Rooms = 3, Bathrooms = 3, AreaInSquareMeters = 186m,
            Kind = ListingKind.Rent, RentPrice = 17_000m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1577717903315-1691ae25ab3f"), Order = 0, IsPrimary = true },
                new() { Url = Img("1545324418-cc1a3fa10c00"), Order = 1 },
                new() { Url = Img("1502005229762-cf1b2da7c5d6"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Distance To Metro", Value = "450" },
                new() { FeatureName = "Floor Number",      Value = "34" },
                new() { FeatureName = "Furnishing",        Value = "Furnished" },
            ],
        },

        // ------------------------------------------------- 5. West Bay Lagoon villa, price on req.
        new()
        {
            Title = "Private Lagoon Villa with Mooring, West Bay Lagoon",
            Description = "A walled family estate on the West Bay Lagoon waterfront, offered "
                        + "off-market at the owner's request.\n\n"
                        + "Grounds:\n"
                        + "Mature garden, twenty-metre pool, private jetty and a separate staff "
                        + "block. Basement garage for four cars.\n\n"
                        + "Viewings are arranged by appointment for qualified buyers only, and the "
                        + "guide price is released after an introduction.",
            PropertyTypeName = "Villa",
            City = "Doha", State = "Ad Dawhah", Street = "West Bay Lagoon Street 900",
            Longitude = "51.4934", Latitude = "25.3810",
            LocationDescription = "West Bay Lagoon — waterfront plot",
            AreaSlug = "west-bay-lagoon", AgentSlug = "khalid-al-mansour",
            Rooms = 7, Bathrooms = 9, AreaInSquareMeters = 1_240m,
            Kind = ListingKind.Sale, SalePrice = 24_500_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, IsFeatured = true, PriceOnRequest = true,
            Media =
            [
                new() { Url = Img("1613490493576-7fde63acd811"), Order = 0, IsPrimary = true },
                new() { Url = Img("1580587771525-78b9dba3b914"), Order = 1 },
                new() { Url = Img("1600607687920-4e2a09cf159d"), Order = 2 },
                new() { Url = Img("1568605114967-8130f3a36994"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Beach Access" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "CCTV" },
                new() { FeatureName = "Smart Home" },
                new() { FeatureName = "Covered Parking", Value = "4" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // ------------------------------------------------------ 6. Lusail Marina off-plan 1-bed
        new()
        {
            Title = "Off-Plan One Bedroom, Lusail Marina Twin Towers",
            Description = "A one-bedroom in the Marina District's next tower pair, released at "
                        + "launch pricing ahead of the 2027 handover.\n\n"
                        + "Why off-plan here:\n"
                        + "The payment plan runs 25% during construction and 75% on handover, and "
                        + "the developer's escrow account is registered with the Ministry of "
                        + "Justice. Comparable completed stock in the district already trades "
                        + "roughly 18% above this figure.",
            PropertyTypeName = "Apartment",
            City = "Lusail", State = "Ad Dawhah", Street = "Marina District Plot 7",
            Longitude = "51.4900", Latitude = "25.4300",
            LocationDescription = "Lusail Marina District, opposite the yacht club",
            AreaSlug = "lusail-marina", AgentSlug = "yousef-darwish",
            Rooms = 1, Bathrooms = 2, AreaInSquareMeters = 82m,
            Kind = ListingKind.Sale, SalePrice = 1_060_000m, PaymentMethod = PaymentMethod.Installment,
            Installment = new()
            {
                DownPayment = 265_000m,            // 25% across construction
                NumberOfInstallments = 30,
                InstallmentAmount = 26_500m,
                Frequency = Frequency.Monthly,
            },
            Publish = true, IsOffPlan = true,
            Media =
            [
                new() { Url = Img("1449824913935-59a10b8d2000"), Order = 0, IsPrimary = true },
                new() { Url = Img("1493809842364-78817add7ffb"), Order = 1 },
                new() { Url = Img("1560518883-ce09059eeffa"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Balconies",  Value = "1" },
                new() { FeatureName = "Furnishing", Value = "Unfurnished" },
            ],
        },

        // ----------------------------------------------------------- 7. Fox Hills 2-bed rent
        new()
        {
            Title = "Bright Two Bedroom in Fox Hills, Lusail",
            Description = "A well-proportioned two-bedroom in Fox Hills, the district that "
                        + "quietly delivers Lusail's best rental yields.\n\n"
                        + "Good to know:\n"
                        + "Newly handed over, never tenanted, and priced to let quickly. Kitchen "
                        + "comes fitted with appliances; the rest is left unfurnished so a tenant "
                        + "can bring their own pieces.",
            PropertyTypeName = "Apartment",
            City = "Lusail", State = "Ad Dawhah", Street = "Fox Hills South Street 12",
            Longitude = "51.4889", Latitude = "25.4161",
            LocationDescription = "Fox Hills, Lusail — beside the district park",
            AreaSlug = "fox-hills", AgentSlug = "noor-al-thani",
            Rooms = 2, Bathrooms = 2, AreaInSquareMeters = 116m,
            Kind = ListingKind.Rent, RentPrice = 7_200m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1460317442991-0ec209397118"), Order = 0, IsPrimary = true },
                new() { Url = Img("1497366754035-f200968a6e72"), Order = 1 },
                new() { Url = Img("1524758631624-e2822e304c36"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Playground" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Covered Parking", Value = "1" },
                new() { FeatureName = "Kitchen Type",    Value = "Fitted, open plan" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // ------------------------------------------------------ 8. Qetaifan land plot, POA
        new()
        {
            Title = "Freehold Beachfront Plot, Qetaifan Island North",
            Description = "A serviced freehold plot on Qetaifan Island North with its own beach "
                        + "frontage and infrastructure already at the boundary.\n\n"
                        + "Consented envelope:\n"
                        + "Ground plus two floors plus roof, within the island's published design "
                        + "guidelines. Water, power and fibre are stubbed to the plot line.\n\n"
                        + "Open to all nationalities as freehold, and above the threshold that "
                        + "qualifies the owner for long-term residency.",
            PropertyTypeName = "Land",
            City = "Lusail", State = "Ad Dawhah", Street = "Qetaifan Island North, Plot 214",
            Longitude = "51.5472", Latitude = "25.4534",
            LocationDescription = "Qetaifan Island North — beachfront row",
            AreaSlug = "qetaifan-island", AgentSlug = "hassan-barakat",
            Rooms = 0, Bathrooms = 0, AreaInSquareMeters = 1_050m,
            Kind = ListingKind.Sale, SalePrice = 9_800_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, IsFeatured = true, PriceOnRequest = true,
            Media =
            [
                new() { Url = Img("1613977257363-707ba9348227"), Order = 0, IsPrimary = true },
                new() { Url = Img("1497366216548-37526070297c"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Beach Access" },
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "24/7 Security" },
            ],
        },

        // ----------------------------------------------------- 9. Msheireb duplex sale (off-plan)
        new()
        {
            Title = "Duplex Loft Above Msheireb Metro Interchange",
            Description = "A double-height duplex in Msheireb Downtown, directly above the only "
                        + "point where three metro lines meet.\n\n"
                        + "The space:\n"
                        + "Five-metre living room with a mezzanine study, two bedroom suites and "
                        + "a shaded courtyard balcony cut into the facade.\n\n"
                        + "Msheireb is the one part of Doha built to be walked, and this is the "
                        + "closest residential floor to the interchange itself.",
            PropertyTypeName = "Duplex",
            City = "Doha", State = "Ad Dawhah", Street = "Msheireb Downtown, Barahat Quarter",
            Longitude = "51.5249", Latitude = "25.2871",
            LocationDescription = "Msheireb Downtown, above the metro interchange",
            AreaSlug = "msheireb-downtown", AgentSlug = "mariam-fakhri",
            Rooms = 2, Bathrooms = 3, AreaInSquareMeters = 212m,
            Kind = ListingKind.Sale, SalePrice = 3_950_000m, PaymentMethod = PaymentMethod.Installment,
            Installment = new()
            {
                DownPayment = 790_000m,
                NumberOfInstallments = 36,
                InstallmentAmount = 87_800m,
                Frequency = Frequency.Monthly,
            },
            Publish = true, IsOffPlan = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1512917774080-9991f1c4c750"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600607687939-ce8a6c25118c"), Order = 1 },
                new() { Url = Img("1615874959474-d609969a20ed"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Smart Home" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Concierge" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Distance To Metro", Value = "0" },
                new() { FeatureName = "Floor Number",      Value = "9" },
                new() { FeatureName = "Furnishing",        Value = "Unfurnished" },
            ],
        },

        // ---------------------------------------------------------- 10. Al Sadd studio rent
        new()
        {
            Title = "Furnished Studio in Al Sadd, Walk to Metro",
            Description = "A compact, well-kept studio in Al Sadd — the most rentable postcode in "
                        + "central Doha.\n\n"
                        + "Suits:\n"
                        + "A single professional who wants to skip the car. Al Sadd metro is a "
                        + "five-minute walk and the whole of C-Ring is on the doorstep. Bills for "
                        + "chiller and internet are already in the rent.",
            PropertyTypeName = "Studio",
            City = "Doha", State = "Ad Dawhah", Street = "Al Sadd Street, Building 47",
            Longitude = "51.5060", Latitude = "25.2790",
            LocationDescription = "Al Sadd, near Al Sadd metro station",
            AreaSlug = "al-sadd", AgentSlug = "dana-suleiman",
            Rooms = 0, Bathrooms = 1, AreaInSquareMeters = 46m,
            Kind = ListingKind.Rent, RentPrice = 3_900m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1522708323590-d24dbb6b0267"), Order = 0, IsPrimary = true },
                new() { Url = Img("1560185007-cde436f6a4d0"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Wi-Fi" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Distance To Metro", Value = "380" },
                new() { FeatureName = "Furnishing",        Value = "Furnished" },
            ],
        },

        // -------------------------------------------------------- 11. Al Waab compound villa rent
        new()
        {
            Title = "Four Bedroom Compound Villa in Al Waab",
            Description = "A family villa inside a managed Al Waab compound, with the shared pool "
                        + "and gym two doors down.\n\n"
                        + "Family logistics:\n"
                        + "Three international schools inside a ten-minute drive, Aspire Park at "
                        + "the end of the road, and Villaggio for the rainy-day plan.\n\n"
                        + "Compound staff handle garden and pool maintenance.",
            PropertyTypeName = "Villa",
            City = "Doha", State = "Ad Dawhah", Street = "Al Waab Street, Compound 14",
            Longitude = "51.4720", Latitude = "25.2559",
            LocationDescription = "Al Waab — gated compound near Aspire Park",
            AreaSlug = "al-waab", AgentSlug = "tariq-nassar",
            Rooms = 4, Bathrooms = 5, AreaInSquareMeters = 385m,
            Kind = ListingKind.Rent, RentPrice = 15_500m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1600585154340-be6161a56a0c"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600596542815-ffad4c1539a9"), Order = 1 },
                new() { Url = Img("1600566753190-17f0baa2a6c3"), Order = 2 },
                new() { Url = Img("1563013544-824ae1b704d3"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Playground" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Semi-furnished" },
            ],
        },

        // ------------------------------------------------------- 12. Al Dafna office floor sale
        new()
        {
            Title = "Whole Office Floor in Al Dafna Business Tower",
            Description = "A full, fitted floor in an Al Dafna tower — ready to occupy rather than "
                        + "a shell to spend a year on.\n\n"
                        + "Already in place:\n"
                        + "Raised floors, LAN cabling, twelve offices, two meeting rooms, a "
                        + "boardroom and a pantry. Sixty-two workstations in the current layout.\n\n"
                        + "Twelve titled parking bays in the basement transfer with the floor.",
            PropertyTypeName = "Office",
            City = "Doha", State = "Ad Dawhah", Street = "Al Funduq Street, Al Dafna",
            Longitude = "51.5270", Latitude = "25.3230",
            LocationDescription = "Al Dafna, West Bay business district",
            AreaSlug = "west-bay", AgentSlug = "faisal-rahim",
            Rooms = 0, Bathrooms = 4, AreaInSquareMeters = 940m,
            Kind = ListingKind.Sale, SalePrice = 16_900_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true,
            Media =
            [
                new() { Url = Img("1497366811353-6870744d04b2"), Order = 0, IsPrimary = true },
                new() { Url = Img("1497366216548-37526070297c"), Order = 1 },
                new() { Url = Img("1497366754035-f200968a6e72"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "CCTV" },
                new() { FeatureName = "Wi-Fi" },
                new() { FeatureName = "Covered Parking",   Value = "12" },
                new() { FeatureName = "Distance To Metro", Value = "600" },
                new() { FeatureName = "Furnishing",        Value = "Fitted" },
            ],
        },

        // --------------------------------------------------------- 13. Simaisma beach villa sale
        new()
        {
            Title = "Beachfront Weekend Villa in Simaisma",
            Description = "A low, wide beach house twenty-five minutes north of Doha, on a plot "
                        + "that runs to the waterline.\n\n"
                        + "Built for the weekend:\n"
                        + "Everything faces the sea. Covered majlis for winter evenings, outdoor "
                        + "kitchen, freshwater pool set back from the sand and a boat store.\n\n"
                        + "Quiet even in season — this stretch of coast has no hotels on it.",
            PropertyTypeName = "Villa",
            City = "Al Khor", State = "Al Khawr wa adh Dhakhirah", Street = "Simaisma Coast Road",
            Longitude = "51.5334", Latitude = "25.6481",
            LocationDescription = "Simaisma — private beach frontage",
            AreaSlug = "simaisma", AgentSlug = "reem-qadi",
            Rooms = 5, Bathrooms = 6, AreaInSquareMeters = 780m,
            Kind = ListingKind.Sale, SalePrice = 9_250_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1493809842364-78817add7ffb"), Order = 0, IsPrimary = true },
                new() { Url = Img("1613490493576-7fde63acd811"), Order = 1 },
                new() { Url = Img("1502005229762-cf1b2da7c5d6"), Order = 2 },
                new() { Url = Img("1580489944761-15a19d654956"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Beach Access" },
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Covered Parking", Value = "3" },
                new() { FeatureName = "Furnishing",      Value = "Furnished" },
            ],
        },

        // ---------------------------------------------------------- 14. Al Wakrah townhouse rent
        new()
        {
            Title = "Three Bedroom Townhouse in Al Wakrah",
            Description = "A modern townhouse in Al Wakrah, minutes from the restored souq and the "
                        + "public beach.\n\n"
                        + "The trade-off, honestly:\n"
                        + "You are twenty minutes further from West Bay than you would be in Al "
                        + "Sadd — and you get roughly a third more space for the same rent, on a "
                        + "street where children actually play outside.",
            PropertyTypeName = "Townhouse",
            City = "Al Wakrah", State = "Al Wakrah", Street = "Al Wakrah Beach Road",
            Longitude = "51.6030", Latitude = "25.1650",
            LocationDescription = "Al Wakrah, near the souq",
            AreaSlug = "al-wakrah", AgentSlug = "omar-haddad",
            Rooms = 3, Bathrooms = 4, AreaInSquareMeters = 260m,
            Kind = ListingKind.Rent, RentPrice = 9_800m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1570129477492-45c003edd2be"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600585154340-be6161a56a0c"), Order = 1 },
                new() { Url = Img("1568605114967-8130f3a36994"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Playground" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Pets Allowed" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // ------------------------------------------------------ 15. Onaiza apartment sale
        new()
        {
            Title = "Renovated Three Bedroom in Onaiza",
            Description = "A quietly located three-bedroom in Onaiza, fully renovated last year "
                        + "and a short drive from the diplomatic quarter.\n\n"
                        + "What was replaced:\n"
                        + "Kitchen, all bathrooms, flooring throughout and the entire AC system. "
                        + "Nothing left to do before moving in.\n\n"
                        + "Onaiza sits between West Bay and Katara, so both are inside ten minutes.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Onaiza Street 21",
            Longitude = "51.5250", Latitude = "25.3400",
            LocationDescription = "Onaiza, near Katara Cultural Village",
            AreaSlug = "west-bay", AgentSlug = "mariam-fakhri",
            Rooms = 3, Bathrooms = 3, AreaInSquareMeters = 205m,
            Kind = ListingKind.Sale, SalePrice = 3_150_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true,
            Media =
            [
                new() { Url = Img("1512699355324-f07e3106dae5"), Order = 0, IsPrimary = true },
                new() { Url = Img("1545324418-cc1a3fa10c00"), Order = 1 },
                new() { Url = Img("1560448204-e02f11c3d0e2"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Balconies",    Value = "2" },
                new() { FeatureName = "Kitchen Type", Value = "Closed, fully fitted" },
                new() { FeatureName = "Furnishing",   Value = "Unfurnished" },
            ],
        },

        // -------------------------------------------------------- 16. Al Gharrafa villa sale
        new()
        {
            Title = "Family Villa with Garden in Al Gharrafa",
            Description = "A generous six-bedroom on a corner plot in Al Gharrafa, the district "
                        + "families move to when they want space without leaving the city.\n\n"
                        + "Ground floor:\n"
                        + "Two majlis, a formal dining room, a family living room and the kitchen. "
                        + "All bedrooms sit upstairs, with a separate staff wing at the back.\n\n"
                        + "Walled garden on three sides and covered parking for four cars.",
            PropertyTypeName = "Villa",
            City = "Al Rayyan", State = "Ar Rayyan", Street = "Al Gharrafa Street 55",
            Longitude = "51.4243", Latitude = "25.2919",
            LocationDescription = "Al Gharrafa, near Qatar Academy",
            AreaSlug = "al-waab", AgentSlug = "hassan-barakat",
            Rooms = 6, Bathrooms = 7, AreaInSquareMeters = 690m,
            Kind = ListingKind.Sale, SalePrice = 5_400_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true,
            Media =
            [
                new() { Url = Img("1580587771525-78b9dba3b914"), Order = 0, IsPrimary = true },
                new() { Url = Img("1613490493576-7fde63acd811"), Order = 1 },
                new() { Url = Img("1600607687920-4e2a09cf159d"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "CCTV" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Hospital Nearby" },
                new() { FeatureName = "Covered Parking", Value = "4" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // ------------------------------------------------ 17. Legtaifiya off-plan apartment rent
        new()
        {
            Title = "Two Bedroom at Legtaifiya Metro Heights",
            Description = "A new two-bedroom beside Legtaifiya station, on the line that runs "
                        + "straight into West Bay and out to Lusail.\n\n"
                        + "Building amenities:\n"
                        + "Rooftop pool, gym, residents' lounge and covered parking. Retail and a "
                        + "pharmacy on the ground floor.\n\n"
                        + "First tenancy — the unit has never been occupied.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Legtaifiya Station Road",
            Longitude = "51.5140", Latitude = "25.3620",
            LocationDescription = "Legtaifiya, beside the metro station",
            AreaSlug = "the-pearl", AgentSlug = "noor-al-thani",
            Rooms = 2, Bathrooms = 2, AreaInSquareMeters = 124m,
            Kind = ListingKind.Rent, RentPrice = 8_600m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1519085360753-af0119f7cbe7"), Order = 0, IsPrimary = true },
                new() { Url = Img("1502672260266-1c1ef2d93688"), Order = 1 },
                new() { Url = Img("1522708323590-d24dbb6b0267"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Distance To Metro", Value = "150" },
                new() { FeatureName = "Covered Parking",   Value = "1" },
                new() { FeatureName = "Furnishing",        Value = "Semi-furnished" },
            ],
        },

        // ------------------------------------------------------- 18. Abu Hamour apartment rent
        new()
        {
            Title = "Affordable Two Bedroom in Abu Hamour",
            Description = "An honest, well-maintained two-bedroom in Abu Hamour — no sea view, no "
                        + "concierge, and a rent that reflects that.\n\n"
                        + "Why it lets fast:\n"
                        + "Family building, resident caretaker, covered parking included and a "
                        + "supermarket downstairs. Chiller is on the tenant's account, which is "
                        + "why the headline rent sits below the district average.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Abu Hamour Main Road",
            Longitude = "51.4870", Latitude = "25.2320",
            LocationDescription = "Abu Hamour, off Al Waab Street",
            AreaSlug = "al-waab", AgentSlug = "dana-suleiman",
            Rooms = 2, Bathrooms = 2, AreaInSquareMeters = 105m,
            Kind = ListingKind.Rent, RentPrice = 5_400m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1497366754035-f200968a6e72"), Order = 0, IsPrimary = true },
                new() { Url = Img("1524758631624-e2822e304c36"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Covered Parking", Value = "1" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // ------------------------------------------------------- 19. Education City duplex rent
        new()
        {
            Title = "Academic Duplex Near Education City",
            Description = "A quiet duplex laid out for someone who works in Education City and "
                        + "would rather not commute.\n\n"
                        + "Layout:\n"
                        + "Study and living space downstairs, three bedrooms upstairs, and a small "
                        + "walled terrace off the kitchen.\n\n"
                        + "Ten minutes to the university cluster, and the tram is walkable.",
            PropertyTypeName = "Duplex",
            City = "Al Rayyan", State = "Ar Rayyan", Street = "Education City Ring Road",
            Longitude = "51.4380", Latitude = "25.3150",
            LocationDescription = "Near Education City, Al Rayyan",
            AreaSlug = "al-waab", AgentSlug = "layla-kassem",
            Rooms = 3, Bathrooms = 3, AreaInSquareMeters = 235m,
            Kind = ListingKind.Rent, RentPrice = 11_200m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1615529182904-14819c35db37"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600566753190-17f0baa2a6c3"), Order = 1 },
                new() { Url = Img("1615874959474-d609969a20ed"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Wi-Fi" },
                new() { FeatureName = "Pets Allowed" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Semi-furnished" },
            ],
        },

        // ------------------------------------------------------- 20. Medina Centrale studio rent
        new()
        {
            Title = "Studio Apartment in Medina Centrale, The Pearl",
            Description = "A neat studio in Medina Centrale, the most walkable quarter of The "
                        + "Pearl.\n\n"
                        + "Everything downstairs:\n"
                        + "Cafes, a supermarket, a pharmacy and the cinema are all on the piazza "
                        + "below the building. Chiller and building fees are included in the rent.",
            PropertyTypeName = "Studio",
            City = "Doha", State = "Ad Dawhah", Street = "Medina Centrale Piazza",
            Longitude = "51.5482", Latitude = "25.3742",
            LocationDescription = "Medina Centrale, The Pearl",
            AreaSlug = "the-pearl", AgentSlug = "sara-el-amin",
            Rooms = 0, Bathrooms = 1, AreaInSquareMeters = 58m,
            Kind = ListingKind.Rent, RentPrice = 5_800m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1560185007-cde436f6a4d0"), Order = 0, IsPrimary = true },
                new() { Url = Img("1522708323590-d24dbb6b0267"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Wi-Fi" },
                new() { FeatureName = "Furnishing", Value = "Furnished" },
            ],
        },

        // ------------------------------------------------------------ 21. Fox Hills 1-bed rent
        new()
        {
            Title = "One Bedroom with Balcony in Fox Hills",
            Description = "A tidy one-bedroom in Fox Hills with a proper balcony rather than a "
                        + "token ledge.\n\n"
                        + "Best for:\n"
                        + "A couple or a single professional working in Lusail who wants a new "
                        + "building without Marina District pricing.",
            PropertyTypeName = "Apartment",
            City = "Lusail", State = "Ad Dawhah", Street = "Fox Hills North Street 4",
            Longitude = "51.4872", Latitude = "25.4183",
            LocationDescription = "Fox Hills, Lusail",
            AreaSlug = "fox-hills", AgentSlug = "noor-al-thani",
            Rooms = 1, Bathrooms = 1, AreaInSquareMeters = 74m,
            Kind = ListingKind.Rent, RentPrice = 5_200m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1519085360753-af0119f7cbe7"), Order = 0, IsPrimary = true },
                new() { Url = Img("1497366754035-f200968a6e72"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Balconies",       Value = "1" },
                new() { FeatureName = "Covered Parking", Value = "1" },
                new() { FeatureName = "Furnishing",      Value = "Semi-furnished" },
            ],
        },

        // --------------------------------------------------- 22. Lusail Marina 3-bed sale
        new()
        {
            Title = "Three Bedroom with Marina View, Lusail Marina",
            Description = "A completed three-bedroom in the Marina District, facing the water "
                        + "rather than the boulevard.\n\n"
                        + "Why this floor:\n"
                        + "High enough for an uninterrupted marina view, low enough to avoid the "
                        + "premium the top ten floors carry.\n\n"
                        + "Title deed is ready and the unit is vacant, so completion can be quick.",
            PropertyTypeName = "Apartment",
            City = "Lusail", State = "Ad Dawhah", Street = "Marina Boulevard Tower 3",
            Longitude = "51.4908", Latitude = "25.4312",
            LocationDescription = "Lusail Marina District — water side",
            AreaSlug = "lusail-marina", AgentSlug = "yousef-darwish",
            Rooms = 3, Bathrooms = 4, AreaInSquareMeters = 224m,
            Kind = ListingKind.Sale, SalePrice = 4_650_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1449824913935-59a10b8d2000"), Order = 0, IsPrimary = true },
                new() { Url = Img("1512699355324-f07e3106dae5"), Order = 1 },
                new() { Url = Img("1560448204-e02f11c3d0e2"), Order = 2 },
                new() { Url = Img("1615874959474-d609969a20ed"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Concierge" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Floor Number",    Value = "17" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // --------------------------------------------------------- 23. West Bay penthouse rent
        new()
        {
            Title = "Penthouse with Private Terrace in West Bay",
            Description = "The top two floors of a West Bay tower, let furnished to a standard "
                        + "that suits a relocating executive.\n\n"
                        + "Upstairs:\n"
                        + "A private roof terrace with an outdoor kitchen and seating for twelve, "
                        + "looking down the Corniche.\n\n"
                        + "Two titled parking bays and a dedicated lift lobby.",
            PropertyTypeName = "Penthouse",
            City = "Doha", State = "Ad Dawhah", Street = "Majlis Al Taawon Street",
            Longitude = "51.5288", Latitude = "25.3245",
            LocationDescription = "West Bay, near City Center Doha",
            AreaSlug = "west-bay", AgentSlug = "khalid-al-mansour",
            Rooms = 4, Bathrooms = 5, AreaInSquareMeters = 430m,
            Kind = ListingKind.Rent, RentPrice = 38_000m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1577717903315-1691ae25ab3f"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600607687939-ce8a6c25118c"), Order = 1 },
                new() { Url = Img("1545324418-cc1a3fa10c00"), Order = 2 },
                new() { Url = Img("1512917774080-9991f1c4c750"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Concierge" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Smart Home" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Furnished" },
            ],
        },

        // ------------------------------------------------------------- 24. Al Rayyan villa sale
        new()
        {
            Title = "Six Bedroom Villa in Al Rayyan Compound",
            Description = "A substantial villa inside an established Al Rayyan compound, sold "
                        + "with the tenant's contract in place if the buyer wants the income.\n\n"
                        + "Compound facilities:\n"
                        + "Shared pool, gym, playground and 24-hour gate security, all covered by "
                        + "the service charge.\n\n"
                        + "Currently returning about 6.4% gross on the asking price.",
            PropertyTypeName = "Villa",
            City = "Al Rayyan", State = "Ar Rayyan", Street = "Al Rayyan Road, Compound 8",
            Longitude = "51.4180", Latitude = "25.2860",
            LocationDescription = "Al Rayyan — gated compound",
            AreaSlug = "al-rayyan", AgentSlug = "tariq-nassar",
            Rooms = 6, Bathrooms = 7, AreaInSquareMeters = 540m,
            Kind = ListingKind.Sale, SalePrice = 4_850_000m, PaymentMethod = PaymentMethod.Installment,
            Installment = new()
            {
                DownPayment = 970_000m,
                NumberOfInstallments = 48,
                InstallmentAmount = 80_900m,
                Frequency = Frequency.Monthly,
            },
            Publish = true,
            Media =
            [
                new() { Url = Img("1580587771525-78b9dba3b914"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600596542815-ffad4c1539a9"), Order = 1 },
                new() { Url = Img("1563013544-824ae1b704d3"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Playground" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Covered Parking", Value = "3" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // -------------------------------------------------------- 25. Fox Hills townhouse sale
        new()
        {
            Title = "Corner Townhouse in Fox Hills, Lusail",
            Description = "An end-of-terrace townhouse in Fox Hills with windows on three sides "
                        + "instead of two.\n\n"
                        + "Across three floors:\n"
                        + "Open-plan ground floor, three bedrooms above, and a roof room that "
                        + "works as a study or a fourth bedroom.\n\n"
                        + "Small private garden and two covered bays.",
            PropertyTypeName = "Townhouse",
            City = "Lusail", State = "Ad Dawhah", Street = "Fox Hills West Street 9",
            Longitude = "51.4855", Latitude = "25.4142",
            LocationDescription = "Fox Hills, Lusail — corner plot",
            AreaSlug = "fox-hills", AgentSlug = "mariam-fakhri",
            Rooms = 3, Bathrooms = 4, AreaInSquareMeters = 275m,
            Kind = ListingKind.Sale, SalePrice = 3_380_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true,
            Media =
            [
                new() { Url = Img("1568605114967-8130f3a36994"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600566753190-17f0baa2a6c3"), Order = 1 },
                new() { Url = Img("1615529182904-14819c35db37"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Playground" },
                new() { FeatureName = "Pets Allowed" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // ------------------------------------------------------------- 26. Al Sadd office rent
        new()
        {
            Title = "Fitted Office Suite in Al Sadd Tower",
            Description = "A ready-to-occupy office suite in Al Sadd, sized for a team of "
                        + "fifteen to twenty.\n\n"
                        + "Handed over with:\n"
                        + "Partitioned offices, a meeting room, a reception area and a pantry. "
                        + "Data cabling and AC are already commissioned.\n\n"
                        + "Rent includes service charge and three parking bays.",
            PropertyTypeName = "Office",
            City = "Doha", State = "Ad Dawhah", Street = "Al Sadd Street, Business Tower",
            Longitude = "51.5042", Latitude = "25.2812",
            LocationDescription = "Al Sadd, central Doha",
            AreaSlug = "al-sadd", AgentSlug = "faisal-rahim",
            Rooms = 0, Bathrooms = 2, AreaInSquareMeters = 210m,
            Kind = ListingKind.Rent, RentPrice = 21_000m, ContractDurationMonths = 24,
            Publish = true,
            Media =
            [
                new() { Url = Img("1497366216548-37526070297c"), Order = 0, IsPrimary = true },
                new() { Url = Img("1497366811353-6870744d04b2"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Wi-Fi" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "CCTV" },
                new() { FeatureName = "Covered Parking",   Value = "3" },
                new() { FeatureName = "Distance To Metro", Value = "400" },
                new() { FeatureName = "Furnishing",        Value = "Fitted" },
            ],
        },

        // ---------------------------------------------------------- 27. Old Airport 2-bed rent
        new()
        {
            Title = "Two Bedroom Near Old Airport Metro",
            Description = "A practical two-bedroom in the Old Airport area, four minutes' walk "
                        + "from the metro.\n\n"
                        + "Straight talk:\n"
                        + "The building is from the 2010s and the finishes are plain. What you get "
                        + "instead is genuine space, a landlord who maintains the place, and a rent "
                        + "well under anything comparable closer to the bay.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Old Airport Road",
            Longitude = "51.5620", Latitude = "25.2560",
            LocationDescription = "Old Airport, near the metro station",
            AreaSlug = "old-airport", AgentSlug = "dana-suleiman",
            Rooms = 2, Bathrooms = 2, AreaInSquareMeters = 118m,
            Kind = ListingKind.Rent, RentPrice = 4_800m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1524758631624-e2822e304c36"), Order = 0, IsPrimary = true },
                new() { Url = Img("1497366754035-f200968a6e72"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Distance To Metro", Value = "320" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Furnishing",        Value = "Unfurnished" },
            ],
        },

        // -------------------------------------------------------- 28. Al Khor land plot, POA
        new()
        {
            Title = "Residential Land Plot on the Al Khor Coast",
            Description = "A large coastal plot near Al Khor, suitable for a single estate or a "
                        + "small compound subject to municipality approval.\n\n"
                        + "Status:\n"
                        + "Title clean, boundaries surveyed, utilities available at the road. No "
                        + "structures to demolish.\n\n"
                        + "The owner prefers to discuss price directly with serious buyers.",
            PropertyTypeName = "Land",
            City = "Al Khor", State = "Al Khawr wa adh Dhakhirah", Street = "Al Khor Coast Road",
            Longitude = "51.4970", Latitude = "25.6812",
            LocationDescription = "Al Khor — coastal plot",
            AreaSlug = "al-khor", AgentSlug = "hassan-barakat",
            Rooms = 0, Bathrooms = 0, AreaInSquareMeters = 2_400m,
            Kind = ListingKind.Sale, SalePrice = 6_800_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, PriceOnRequest = true,
            Media =
            [
                new() { Url = Img("1502005229762-cf1b2da7c5d6"), Order = 0, IsPrimary = true },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Beach Access" },
            ],
        },

        // -------------------------------------------------------- 29. Porto Arabia duplex sale
        new()
        {
            Title = "Marina Duplex in Porto Arabia, The Pearl",
            Description = "A two-storey duplex at the base of a Porto Arabia tower, opening "
                        + "directly onto the marina boardwalk.\n\n"
                        + "Unusual for The Pearl:\n"
                        + "Your own street door, so you reach the boardwalk without the lift "
                        + "lobby. Double-height living room facing the water.\n\n"
                        + "Rare stock — a handful of these exist across the whole crescent.",
            PropertyTypeName = "Duplex",
            City = "Doha", State = "Ad Dawhah", Street = "Porto Arabia Boardwalk",
            Longitude = "51.5497", Latitude = "25.3688",
            LocationDescription = "Porto Arabia, The Pearl — boardwalk level",
            AreaSlug = "porto-arabia", AgentSlug = "omar-haddad",
            Rooms = 3, Bathrooms = 4, AreaInSquareMeters = 330m,
            Kind = ListingKind.Sale, SalePrice = 8_900_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1518684079-3c830dcef090"), Order = 0, IsPrimary = true },
                new() { Url = Img("1512453979798-5ea266f8880c"), Order = 1 },
                new() { Url = Img("1600607687920-4e2a09cf159d"), Order = 2 },
                new() { Url = Img("1502672260266-1c1ef2d93688"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Beach Access" },
                new() { FeatureName = "Concierge" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Semi-furnished" },
            ],
        },

        // ----------------------------------------------------- 30. West Bay Lagoon villa rent
        new()
        {
            Title = "Family Villa for Rent in West Bay Lagoon",
            Description = "A large family villa in West Bay Lagoon, available unfurnished on a "
                        + "long lease.\n\n"
                        + "Grounds and staff:\n"
                        + "Private pool, walled garden and a separate two-room staff annexe. "
                        + "Gardener and pool service are arranged by the landlord.\n\n"
                        + "Five minutes to two international schools.",
            PropertyTypeName = "Villa",
            City = "Doha", State = "Ad Dawhah", Street = "West Bay Lagoon Street 42",
            Longitude = "51.4948", Latitude = "25.3788",
            LocationDescription = "West Bay Lagoon",
            AreaSlug = "west-bay-lagoon", AgentSlug = "layla-kassem",
            Rooms = 5, Bathrooms = 6, AreaInSquareMeters = 620m,
            Kind = ListingKind.Rent, RentPrice = 32_000m, ContractDurationMonths = 12,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1613490493576-7fde63acd811"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600585154340-be6161a56a0c"), Order = 1 },
                new() { Url = Img("1580489944761-15a19d654956"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Pets Allowed" },
                new() { FeatureName = "Covered Parking", Value = "3" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // ------------------------------------------------------- 31. Msheireb apartment sale
        new()
        {
            Title = "Two Bedroom in Msheireb Downtown Doha",
            Description = "A two-bedroom in Msheireb's low-rise fabric, where the architecture "
                        + "is Qatari rather than generic tower.\n\n"
                        + "The district:\n"
                        + "Shaded pedestrian streets, museums, the tram and three metro lines. "
                        + "Cars are optional here in a way they are nowhere else in Doha.\n\n"
                        + "Freehold, open to all nationalities.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Msheireb Downtown, Wadi Quarter",
            Longitude = "51.5261", Latitude = "25.2884",
            LocationDescription = "Msheireb Downtown Doha",
            AreaSlug = "msheireb-downtown", AgentSlug = "mariam-fakhri",
            Rooms = 2, Bathrooms = 3, AreaInSquareMeters = 156m,
            Kind = ListingKind.Sale, SalePrice = 2_780_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true,
            Media =
            [
                new() { Url = Img("1512917774080-9991f1c4c750"), Order = 0, IsPrimary = true },
                new() { Url = Img("1560448204-e02f11c3d0e2"), Order = 1 },
                new() { Url = Img("1522708323590-d24dbb6b0267"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Smart Home" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Distance To Metro", Value = "200" },
                new() { FeatureName = "Furnishing",        Value = "Unfurnished" },
            ],
        },

        // ---------------------------------------------------------- 32. Msheireb studio rent
        new()
        {
            Title = "Compact Studio in Msheireb, Downtown Doha",
            Description = "A small, very well located studio in Msheireb for someone who values "
                        + "the address over the floor area.\n\n"
                        + "Trade-off stated plainly:\n"
                        + "Fifty-two square metres. In exchange you are inside the only fully "
                        + "walkable district in Doha, on top of the metro interchange.",
            PropertyTypeName = "Studio",
            City = "Doha", State = "Ad Dawhah", Street = "Msheireb Downtown, Sahat Quarter",
            Longitude = "51.5244", Latitude = "25.2866",
            LocationDescription = "Msheireb Downtown Doha",
            AreaSlug = "msheireb-downtown", AgentSlug = "dana-suleiman",
            Rooms = 0, Bathrooms = 1, AreaInSquareMeters = 52m,
            Kind = ListingKind.Rent, RentPrice = 6_400m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1560518883-ce09059eeffa"), Order = 0, IsPrimary = true },
                new() { Url = Img("1560185007-cde436f6a4d0"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Wi-Fi" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Concierge" },
                new() { FeatureName = "Distance To Metro", Value = "80" },
                new() { FeatureName = "Furnishing",        Value = "Furnished" },
            ],
        },

        // -------------------------------------------------- 33. Viva Bahriya 4-bed sale
        new()
        {
            Title = "Four Bedroom Sea-Facing Home in Viva Bahriya",
            Description = "A large four-bedroom on a high floor in Viva Bahriya, with the sea on "
                        + "two sides.\n\n"
                        + "Layout:\n"
                        + "Four bedroom suites, a separate majlis, a maid's room with its own "
                        + "entrance, and a wrap balcony running the length of the living space.\n\n"
                        + "Sold with two titled parking bays and a beach club membership.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Viva Bahriya Tower 24",
            Longitude = "51.5452", Latitude = "25.3775",
            LocationDescription = "Viva Bahriya, The Pearl",
            AreaSlug = "the-pearl", AgentSlug = "reem-qadi",
            Rooms = 4, Bathrooms = 5, AreaInSquareMeters = 342m,
            Kind = ListingKind.Sale, SalePrice = 7_100_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1502672260266-1c1ef2d93688"), Order = 0, IsPrimary = true },
                new() { Url = Img("1512453979798-5ea266f8880c"), Order = 1 },
                new() { Url = Img("1600607687939-ce8a6c25118c"), Order = 2 },
                new() { Url = Img("1512699355324-f07e3106dae5"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Beach Access" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Concierge" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Balconies",       Value = "3" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Semi-furnished" },
            ],
        },

        // ------------------------------------------------------------- 34. Al Waab villa sale
        new()
        {
            Title = "Detached Villa with Pool in Al Waab",
            Description = "A detached villa on its own plot in Al Waab — no shared walls, no "
                        + "compound service charge.\n\n"
                        + "Outside:\n"
                        + "Mature garden, a proper pool rather than a plunge, and a shaded majlis "
                        + "block by the gate for guests.\n\n"
                        + "Aspire Park and Villaggio are both under ten minutes away.",
            PropertyTypeName = "Villa",
            City = "Doha", State = "Ad Dawhah", Street = "Al Waab Street 71",
            Longitude = "51.4698", Latitude = "25.2534",
            LocationDescription = "Al Waab — detached plot",
            AreaSlug = "al-waab", AgentSlug = "hassan-barakat",
            Rooms = 5, Bathrooms = 6, AreaInSquareMeters = 580m,
            Kind = ListingKind.Sale, SalePrice = 6_300_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true,
            Media =
            [
                new() { Url = Img("1600596542815-ffad4c1539a9"), Order = 0, IsPrimary = true },
                new() { Url = Img("1613490493576-7fde63acd811"), Order = 1 },
                new() { Url = Img("1600566753190-17f0baa2a6c3"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "CCTV" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Covered Parking", Value = "3" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // -------------------------------------------------- 35. Qetaifan apartment rent (off-plan)
        new()
        {
            Title = "Island Apartment for Rent on Qetaifan Island",
            Description = "A two-bedroom on Qetaifan Island, handed over this year and offered "
                        + "for its first tenancy.\n\n"
                        + "Island living:\n"
                        + "Beach club access, the waterpark next door and a short causeway drive "
                        + "into Lusail Marina.\n\n"
                        + "Furnished, with chiller and building fees included.",
            PropertyTypeName = "Apartment",
            City = "Lusail", State = "Ad Dawhah", Street = "Qetaifan Island South Promenade",
            Longitude = "51.5448", Latitude = "25.4498",
            LocationDescription = "Qetaifan Island, Lusail",
            AreaSlug = "qetaifan-island", AgentSlug = "yousef-darwish",
            Rooms = 2, Bathrooms = 3, AreaInSquareMeters = 142m,
            Kind = ListingKind.Rent, RentPrice = 13_500m, ContractDurationMonths = 12,
            Publish = true, IsOffPlan = true,
            Media =
            [
                new() { Url = Img("1613977257363-707ba9348227"), Order = 0, IsPrimary = true },
                new() { Url = Img("1493809842364-78817add7ffb"), Order = 1 },
                new() { Url = Img("1560448204-e02f11c3d0e2"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Beach Access" },
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Covered Parking", Value = "1" },
                new() { FeatureName = "Furnishing",      Value = "Furnished" },
            ],
        },

        // -------------------------------------------------------- 36. Al Rayyan townhouse rent
        new()
        {
            Title = "Three Bedroom Townhouse in Al Rayyan",
            Description = "A modern townhouse in a small Al Rayyan development, let unfurnished "
                        + "on an annual contract.\n\n"
                        + "Suits a family that wants:\n"
                        + "A garden, a quiet street, and schools within a short drive — without "
                        + "paying compound rates for facilities they would not use.",
            PropertyTypeName = "Townhouse",
            City = "Al Rayyan", State = "Ar Rayyan", Street = "Al Rayyan North Street 16",
            Longitude = "51.4102", Latitude = "25.2948",
            LocationDescription = "Al Rayyan",
            AreaSlug = "al-rayyan", AgentSlug = "tariq-nassar",
            Rooms = 3, Bathrooms = 4, AreaInSquareMeters = 240m,
            Kind = ListingKind.Rent, RentPrice = 8_900m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1570129477492-45c003edd2be"), Order = 0, IsPrimary = true },
                new() { Url = Img("1568605114967-8130f3a36994"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "School Nearby" },
                new() { FeatureName = "Playground" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // --------------------------------------------- 37. Lusail penthouse sale (off-plan)
        new()
        {
            Title = "Off-Plan Sky Penthouse in Lusail Marina",
            Description = "The single penthouse in a Marina District tower completing in 2028, "
                        + "released at pre-launch pricing.\n\n"
                        + "What is reserved:\n"
                        + "The entire 42nd floor, a private plunge pool on the terrace, two "
                        + "parking bays and a storage room.\n\n"
                        + "Escrow-backed, with 30% payable across construction and 70% on handover.",
            PropertyTypeName = "Penthouse",
            City = "Lusail", State = "Ad Dawhah", Street = "Marina District Plot 12",
            Longitude = "51.4922", Latitude = "25.4335",
            LocationDescription = "Lusail Marina District",
            AreaSlug = "lusail-marina", AgentSlug = "khalid-al-mansour",
            Rooms = 4, Bathrooms = 6, AreaInSquareMeters = 520m,
            Kind = ListingKind.Sale, SalePrice = 15_400_000m, PaymentMethod = PaymentMethod.Installment,
            Installment = new()
            {
                DownPayment = 4_620_000m,          // 30% across construction
                NumberOfInstallments = 36,
                InstallmentAmount = 128_333m,
                Frequency = Frequency.Monthly,
            },
            Publish = true, IsOffPlan = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1449824913935-59a10b8d2000"), Order = 0, IsPrimary = true },
                new() { Url = Img("1577717903315-1691ae25ab3f"), Order = 1 },
                new() { Url = Img("1600607687920-4e2a09cf159d"), Order = 2 },
                new() { Url = Img("1615874959474-d609969a20ed"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Smart Home" },
                new() { FeatureName = "Concierge" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Floor Number",    Value = "42" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // ---------------------------------------------------------- 38. Lusail office sale
        new()
        {
            Title = "Commercial Office Unit in Lusail Marina",
            Description = "A mid-floor office unit in a Marina District commercial tower, sold "
                        + "as a shell for the buyer's own fit-out.\n\n"
                        + "Why buy rather than lease here:\n"
                        + "Lusail's commercial supply is finite and the district is still filling "
                        + "in. Ownership also removes the annual rent review.\n\n"
                        + "Four titled basement bays included.",
            PropertyTypeName = "Office",
            City = "Lusail", State = "Ad Dawhah", Street = "Marina Commercial Boulevard",
            Longitude = "51.4895", Latitude = "25.4276",
            LocationDescription = "Lusail Marina District — commercial tower",
            AreaSlug = "lusail-marina", AgentSlug = "faisal-rahim",
            Rooms = 0, Bathrooms = 2, AreaInSquareMeters = 320m,
            Kind = ListingKind.Sale, SalePrice = 5_200_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true,
            Media =
            [
                new() { Url = Img("1497366754035-f200968a6e72"), Order = 0, IsPrimary = true },
                new() { Url = Img("1497366216548-37526070297c"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "CCTV" },
                new() { FeatureName = "Covered Parking", Value = "4" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // ---------------------------------------------------------- 39. Simaisma villa rent
        new()
        {
            Title = "Beach Villa for Rent in Simaisma",
            Description = "A four-bedroom beach villa north of Doha, available furnished on a "
                        + "twelve-month contract.\n\n"
                        + "The reality of the commute:\n"
                        + "Thirty to forty minutes into West Bay depending on traffic. People "
                        + "take this one because they want to wake up on the sea and are willing "
                        + "to drive for it.",
            PropertyTypeName = "Villa",
            City = "Al Khor", State = "Al Khawr wa adh Dhakhirah", Street = "Simaisma Beach Road",
            Longitude = "51.5341", Latitude = "25.6452",
            LocationDescription = "Simaisma — beachfront",
            AreaSlug = "simaisma", AgentSlug = "reem-qadi",
            Rooms = 4, Bathrooms = 5, AreaInSquareMeters = 465m,
            Kind = ListingKind.Rent, RentPrice = 19_500m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1493809842364-78817add7ffb"), Order = 0, IsPrimary = true },
                new() { Url = Img("1580489944761-15a19d654956"), Order = 1 },
                new() { Url = Img("1502005229762-cf1b2da7c5d6"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Beach Access" },
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Pets Allowed" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Furnished" },
            ],
        },

        // ------------------------------------------- 40. Al Khor villa — DRAFT (admin-only row)
        new()
        {
            Title = "Draft Listing - Al Khor Waterfront Villa",
            Description = "Held back from the public site until the owner confirms the asking "
                        + "price and the photography is reshot.\n\n"
                        + "Exists so the admin properties table always has a Draft row to "
                        + "demonstrate the publish flow against. It is deliberately not published, "
                        + "so it never appears anywhere on the public site.",
            PropertyTypeName = "Villa",
            City = "Al Khor", State = "Al Khawr wa adh Dhakhirah", Street = "Al Khor Corniche",
            Longitude = "51.4970", Latitude = "25.6840",
            LocationDescription = "Al Khor waterfront",
            AreaSlug = "simaisma", AgentSlug = "reem-qadi",
            Rooms = 5, Bathrooms = 6, AreaInSquareMeters = 720m,
            Kind = ListingKind.Sale, SalePrice = 6_100_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = false,
            Media =
            [
                new() { Url = Img("1502005229762-cf1b2da7c5d6"), Order = 0, IsPrimary = true },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Central A/C" },
            ],
        },
    ];
}
