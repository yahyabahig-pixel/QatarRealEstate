using RealEstate.Domain.Enums;

namespace RealEstate.Infrastructure.Data.Seeding;

// ---------------------------------------------------------------------------------------------
//  RAW SEED DATA ONLY.
//
//  Nothing in this file knows about EF Core or about the domain entities. It is a plain list of
//  values. RealEstateDbSeeder is the only place that turns these values into real aggregates
//  through the domain factories, so every seeded row goes through the same validation a real
//  API request would.
//
//  Adding a new listing/feature/type here and re-running the seeder inserts only the new rows —
//  the seeder is idempotent (see RealEstateDbSeeder).
// ---------------------------------------------------------------------------------------------

/// <summary>Mirrors <see cref="MediaType"/> so the stored string can never drift from the enum.</summary>
internal static class SeedMediaTypes
{
    internal static readonly string Photo = MediaType.photo.ToString();
    internal static readonly string Video = MediaType.video.ToString();
}

internal sealed class PropertyTypeSeed
{
    public required string Name { get; init; }
    public required string Description { get; init; }   // PropertyType.Create rejects an empty description
}

internal sealed class FeatureSeed
{
    public required string Name { get; init; }
    public FeatureValueType ValueType { get; init; } = FeatureValueType.Boolean;
    public string? Icon { get; init; }
}

internal sealed class MediaSeed
{
    public required string Url { get; init; }
    public int Width { get; init; } = 1600;
    public int Height { get; init; } = 1067;
    public int Order { get; init; }
    public bool IsPrimary { get; init; }
    public string Kind { get; init; } = SeedMediaTypes.Photo;
}

internal sealed class PropertyFeatureSeed
{
    public required string FeatureName { get; init; }   // resolved to the catalog Feature's Guid at seed time
    public string? Value { get; init; }                 // null for Boolean features. Max 200 chars.
}

internal sealed class InstallmentSeed
{
    public decimal DownPayment { get; init; }
    public int NumberOfInstallments { get; init; }
    public decimal InstallmentAmount { get; init; }
    public Frequency Frequency { get; init; } = Frequency.Monthly;
}

internal sealed class PropertySeed
{
    // Title must be between PropertyConstants.MinTitleLength (10) and MaxTitleLength (100).
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string PropertyTypeName { get; init; }

    // --- location. XCoordinate/YCoordinate are strings but MUST parse as double. ---
    public string Country { get; init; } = "Qatar";
    public required string City { get; init; }
    public required string Street { get; init; }
    public required string PostalCode { get; init; }
    public string State { get; init; } = string.Empty;
    public required string Longitude { get; init; }   // -> Location.XCoordinate
    public required string Latitude { get; init; }    // -> Location.YCoordinate
    public string? LocationDescription { get; init; }

    // --- specs ---
    public int Rooms { get; init; }
    public int Bathrooms { get; init; }
    public decimal AreaInSquareMeters { get; init; }

    // --- listing terms ---
    public ListingKind Kind { get; init; }
    public decimal SalePrice { get; init; }
    public PaymentMethod PaymentMethod { get; init; } = global::RealEstate.Domain.Enums.PaymentMethod.Cash;
    public InstallmentSeed? Installment { get; init; }     // required when PaymentMethod == Installment
    public decimal RentPrice { get; init; }
    public int ContractDurationMonths { get; init; }
    public string Currency { get; init; } = "QAR";

    // --- lifecycle ---
    public bool Publish { get; init; } = true;
    public bool IsFeatured { get; init; }                 // only possible on a published listing

    public MediaSeed[] Media { get; init; } = [];
    public PropertyFeatureSeed[] Features { get; init; } = [];
}

internal static class SeedCatalog
{
    // -----------------------------------------------------------------------------------------
    //  Property types — Name is uniquely indexed (UX on PropertyTypes.Name).
    // -----------------------------------------------------------------------------------------
    internal static readonly PropertyTypeSeed[] PropertyTypes =
    [
        new() { Name = "Apartment", Description = "A self-contained unit inside a residential building." },
        new() { Name = "Villa",     Description = "A standalone house with its own plot, usually with a garden." },
        new() { Name = "Townhouse", Description = "A multi-floor home sharing one or two walls with its neighbours." },
        new() { Name = "Penthouse", Description = "The top-floor unit of a tower, usually with a private terrace." },
        new() { Name = "Studio",    Description = "A compact single-room unit with an open living and sleeping area." },
        new() { Name = "Office",    Description = "Commercial space intended for business use." },
    ];

    // -----------------------------------------------------------------------------------------
    //  Feature catalog — Name is uniquely indexed (UX_Features_Name).
    // -----------------------------------------------------------------------------------------
    internal static readonly FeatureSeed[] Features =
    [
        new() { Name = "Swimming Pool",     ValueType = FeatureValueType.Boolean, Icon = "swimming-pool" },
        new() { Name = "Private Garden",    ValueType = FeatureValueType.Boolean, Icon = "garden" },
        new() { Name = "Maid's Room",       ValueType = FeatureValueType.Boolean, Icon = "bedroom" },
        new() { Name = "Sea View",          ValueType = FeatureValueType.Boolean, Icon = "sea-view" },
        new() { Name = "Central A/C",       ValueType = FeatureValueType.Boolean, Icon = "air-conditioning" },
        new() { Name = "Gym Access",        ValueType = FeatureValueType.Boolean, Icon = "gym" },
        new() { Name = "24/7 Security",     ValueType = FeatureValueType.Boolean, Icon = "security" },
        new() { Name = "Elevator",          ValueType = FeatureValueType.Boolean, Icon = "elevator" },
        new() { Name = "Pets Allowed",      ValueType = FeatureValueType.Boolean, Icon = "pets-allowed" },
        new() { Name = "Covered Parking",   ValueType = FeatureValueType.Number,  Icon = "covered-parking" },
        new() { Name = "Balconies",         ValueType = FeatureValueType.Number,  Icon = "balcony" },
        new() { Name = "Floor Number",      ValueType = FeatureValueType.Number,  Icon = "floor" },
        new() { Name = "Distance To Metro", ValueType = FeatureValueType.Number,  Icon = "metro" },
        new() { Name = "Furnishing",        ValueType = FeatureValueType.Text,    Icon = "living-room" },
        new() { Name = "Kitchen Type",      ValueType = FeatureValueType.Text,    Icon = "kitchen" },
        new() { Name = "CCTV",              ValueType = FeatureValueType.Boolean, Icon = "cctv" },
        new() { Name = "Beach Access",      ValueType = FeatureValueType.Boolean, Icon = "beach-access" },
        new() { Name = "Playground",        ValueType = FeatureValueType.Boolean, Icon = "playground" },
        new() { Name = "School Nearby",     ValueType = FeatureValueType.Boolean, Icon = "near-school" },
        new() { Name = "Hospital Nearby",   ValueType = FeatureValueType.Boolean, Icon = "near-hospital" },
        new() { Name = "Wi-Fi",             ValueType = FeatureValueType.Boolean, Icon = "wifi" },
        new() { Name = "Smart Home",        ValueType = FeatureValueType.Boolean, Icon = "smart-home" },
        new() { Name = "Concierge",         ValueType = FeatureValueType.Boolean, Icon = "concierge" },
    ];

    // -----------------------------------------------------------------------------------------
    //  Media.
    //
    //  These are public Unsplash CDN URLs of villas / apartments / offices. They are stored as
    //  plain strings, so a URL that ever stops resolving does NOT break seeding or the API —
    //  only the picture in the client. Swap them for your own CDN whenever you like.
    // -----------------------------------------------------------------------------------------
    private const string U = "https://images.unsplash.com/photo-";
    private const string Q = "?auto=format&fit=crop&w=1600&q=80";

    private static string Img(string id) => $"{U}{id}{Q}";

    // -----------------------------------------------------------------------------------------
    //  Listings.
    // -----------------------------------------------------------------------------------------
    internal static readonly PropertySeed[] Properties =
    [
        // ---------------------------------------------------------------- 1. villa, cash sale
        new()
        {
            Title = "Modern 5-Bedroom Villa in Al Waab",
            Description = "A bright contemporary villa on a corner plot in Al Waab, with a landscaped "
                        + "garden, private pool, driver's and maid's quarters and covered parking for "
                        + "three cars. Walking distance to Aspire Park.",
            PropertyTypeName = "Villa",
            City = "Doha", State = "Ad Dawhah", Street = "Al Waab Street", PostalCode = "00974",
            Longitude = "51.4720", Latitude = "25.2559",
            LocationDescription = "Al Waab, next to Aspire Park",
            Rooms = 5, Bathrooms = 6, AreaInSquareMeters = 620m,
            Kind = ListingKind.Sale, SalePrice = 6_950_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1613490493576-7fde63acd811"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600596542815-ffad4c1539a9"), Order = 1 },
                new() { Url = Img("1600607687939-ce8a6c25118c"), Order = 2 },
                new() { Url = Img("1600566753190-17f0baa2a6c3"), Order = 3 },
            ],
            Features =
            [
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Covered Parking", Value = "3" },
                new() { FeatureName = "Furnishing",      Value = "Semi-furnished" },
            ],
        },

        // ------------------------------------------------- 2. villa, sale with installment plan
        new()
        {
            Title = "Spacious Family Villa in Al Rayyan",
            Description = "Four-bedroom family villa in a quiet Al Rayyan compound. Large majlis, "
                        + "separate dining room, maid's room and a shaded back garden. Flexible "
                        + "payment plan available directly with the owner.",
            PropertyTypeName = "Villa",
            City = "Al Rayyan", State = "Ar Rayyan", Street = "Al Gharrafa Road", PostalCode = "00974",
            Longitude = "51.4243", Latitude = "25.2919",
            LocationDescription = "Al Gharrafa, inside a gated compound",
            Rooms = 4, Bathrooms = 5, AreaInSquareMeters = 450m,
            Kind = ListingKind.Sale, SalePrice = 4_200_000m, PaymentMethod = PaymentMethod.Installment,
            Installment = new()
            {
                DownPayment = 840_000m,          // 20% down
                NumberOfInstallments = 60,
                InstallmentAmount = 56_000m,
                Frequency = Frequency.Monthly,
            },
            Publish = true,
            Media =
            [
                new() { Url = Img("1580587771525-78b9dba3b914"), Order = 0, IsPrimary = true },
                new() { Url = Img("1568605114967-8130f3a36994"), Order = 1 },
                new() { Url = Img("1600585154340-be6161a56a0c"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Private Garden" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Covered Parking", Value = "2" },
            ],
        },

        // ------------------------------------------------------------ 3. apartment, monthly rent
        new()
        {
            Title = "Furnished 2-Bedroom Apartment at The Pearl",
            Description = "Fully furnished two-bedroom apartment in Porto Arabia with a marina view, "
                        + "access to the residents' gym and pool, and one covered parking bay. "
                        + "Utilities and building maintenance included.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Porto Arabia Drive", PostalCode = "00974",
            Longitude = "51.5510", Latitude = "25.3707",
            LocationDescription = "The Pearl Island, Porto Arabia",
            Rooms = 2, Bathrooms = 3, AreaInSquareMeters = 145m,
            Kind = ListingKind.Rent, RentPrice = 12_500m, ContractDurationMonths = 12,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1502672260266-1c1ef2d93688"), Order = 0, IsPrimary = true },
                new() { Url = Img("1522708323590-d24dbb6b0267"), Order = 1 },
                new() { Url = Img("1560448204-e02f11c3d0e2"),    Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Covered Parking", Value = "1" },
                new() { FeatureName = "Balconies",       Value = "2" },
                new() { FeatureName = "Floor Number",    Value = "8" },
                new() { FeatureName = "Furnishing",      Value = "Fully furnished" },
            ],
        },

        // ------------------------------------------------------------ 4. apartment, cash sale
        new()
        {
            Title = "Bright 3-Bedroom Apartment in West Bay",
            Description = "High-floor three-bedroom apartment in a West Bay tower, with floor-to-"
                        + "ceiling windows, an open-plan kitchen and a wide balcony overlooking the "
                        + "corniche. Building offers a gym, pool and 24/7 concierge.",
            PropertyTypeName = "Apartment",
            City = "Doha", State = "Ad Dawhah", Street = "Al Funduq Street", PostalCode = "00974",
            Longitude = "51.5310", Latitude = "25.3200",
            LocationDescription = "West Bay, close to City Center Doha",
            Rooms = 3, Bathrooms = 3, AreaInSquareMeters = 190m,
            Kind = ListingKind.Sale, SalePrice = 2_750_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true,
            Media =
            [
                new() { Url = Img("1493809842364-78817add7ffb"), Order = 0, IsPrimary = true },
                new() { Url = Img("1502005229762-cf1b2da7c5d6"), Order = 1 },
                new() { Url = Img("1600585154340-be6161a56a0c"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Balconies",       Value = "1" },
                new() { FeatureName = "Floor Number",    Value = "21" },
                new() { FeatureName = "Covered Parking", Value = "2" },
            ],
        },

        // -------------------------------------------------------------- 5. penthouse, sale
        new()
        {
            Title = "Lusail Marina Penthouse with Private Terrace",
            Description = "Duplex penthouse on the top two floors of a Lusail Marina tower. Private "
                        + "roof terrace with a plunge pool, four en-suite bedrooms, a private lift "
                        + "lobby and four dedicated parking bays.",
            PropertyTypeName = "Penthouse",
            City = "Lusail", State = "Ad Dawhah", Street = "Marina District Boulevard", PostalCode = "00974",
            Longitude = "51.5290", Latitude = "25.4288",
            LocationDescription = "Lusail Marina District",
            Rooms = 4, Bathrooms = 5, AreaInSquareMeters = 410m,
            Kind = ListingKind.Sale, SalePrice = 9_800_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = true, IsFeatured = true,
            Media =
            [
                new() { Url = Img("1512917774080-9991f1c4c750"), Order = 0, IsPrimary = true },
                new() { Url = Img("1600607687939-ce8a6c25118c"), Order = 1 },
                new() { Url = Img("1570129477492-45c003edd2be"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Maid's Room" },
                new() { FeatureName = "Gym Access" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Covered Parking", Value = "4" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
                new() { FeatureName = "Kitchen Type",    Value = "Open plan, fitted" },
            ],
        },

        // -------------------------------------------------------------- 6. townhouse, rent
        new()
        {
            Title = "Townhouse for Rent in Al Wakrah Compound",
            Description = "Three-bedroom townhouse in a family compound in Al Wakrah with a shared "
                        + "pool and children's play area. Ground floor majlis, upstairs living room "
                        + "and a small private yard.",
            PropertyTypeName = "Townhouse",
            City = "Al Wakrah", State = "Al Wakrah", Street = "Al Wukair Road", PostalCode = "00974",
            Longitude = "51.6033", Latitude = "25.1715",
            LocationDescription = "Al Wakrah, family compound",
            Rooms = 3, Bathrooms = 4, AreaInSquareMeters = 260m,
            Kind = ListingKind.Rent, RentPrice = 9_000m, ContractDurationMonths = 24,
            Publish = true,
            Media =
            [
                new() { Url = Img("1545324418-cc1a3fa10c00"), Order = 0, IsPrimary = true },
                new() { Url = Img("1512699355324-f07e3106dae5"), Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Pets Allowed" },
                new() { FeatureName = "Covered Parking", Value = "2" },
                new() { FeatureName = "Furnishing",      Value = "Unfurnished" },
            ],
        },

        // -------------------------------------------------------------- 7. studio, rent
        new()
        {
            Title = "Cosy Studio Near Msheireb Metro Station",
            Description = "Compact furnished studio in Msheireb Downtown, a two-minute walk from the "
                        + "metro station. Ideal for a single professional. Rent includes water, "
                        + "electricity and weekly cleaning.",
            PropertyTypeName = "Studio",
            City = "Doha", State = "Ad Dawhah", Street = "Msheireb Downtown", PostalCode = "00974",
            Longitude = "51.5222", Latitude = "25.2867",
            LocationDescription = "Msheireb Downtown Doha",
            Rooms = 1, Bathrooms = 1, AreaInSquareMeters = 55m,
            Kind = ListingKind.Rent, RentPrice = 4_800m, ContractDurationMonths = 12,
            Publish = true,
            Media =
            [
                new() { Url = Img("1522708323590-d24dbb6b0267"), Order = 0, IsPrimary = true },
                new() { Url = Img("1560448204-e02f11c3d0e2"),    Order = 1 },
            ],
            Features =
            [
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Floor Number",      Value = "4" },
                new() { FeatureName = "Distance To Metro", Value = "150" },
                new() { FeatureName = "Furnishing",        Value = "Fully furnished" },
            ],
        },

        // -------------------------------------------------------------- 8. office, rent
        new()
        {
            Title = "Fitted Office Floor in West Bay Tower",
            Description = "Open-plan fitted office floor in a grade-A West Bay tower. Raised access "
                        + "flooring, two meeting rooms, a pantry and six reserved basement parking "
                        + "bays. Available immediately.",
            PropertyTypeName = "Office",
            City = "Doha", State = "Ad Dawhah", Street = "Majlis Al Taawon Street", PostalCode = "00974",
            Longitude = "51.5240", Latitude = "25.3234",
            LocationDescription = "West Bay diplomatic area",
            Rooms = 6, Bathrooms = 2, AreaInSquareMeters = 320m,
            Kind = ListingKind.Rent, RentPrice = 38_000m, ContractDurationMonths = 36,
            Publish = true,
            Media =
            [
                new() { Url = Img("1497366216548-37526070297c"), Order = 0, IsPrimary = true },
                new() { Url = Img("1497366754035-f200968a6e72"), Order = 1 },
                new() { Url = Img("1524758631624-e2822e304c36"), Order = 2 },
            ],
            Features =
            [
                new() { FeatureName = "Central A/C" },
                new() { FeatureName = "Elevator" },
                new() { FeatureName = "24/7 Security" },
                new() { FeatureName = "Covered Parking",   Value = "6" },
                new() { FeatureName = "Floor Number",      Value = "14" },
                new() { FeatureName = "Distance To Metro", Value = "400" },
            ],
        },

        // -------------------------------------------- 9. draft listing (stays unpublished)
        new()
        {
            Title = "Draft Listing - Beachfront Villa in Simaisma",
            Description = "Work-in-progress listing kept in Draft on purpose, so you always have one "
                        + "unpublished row to test the publish flow and the status filters against.",
            PropertyTypeName = "Villa",
            City = "Simaisma", State = "Al Khor", Street = "Al Khor Coastal Road", PostalCode = "00974",
            Longitude = "51.5364", Latitude = "25.6069",
            LocationDescription = "Simaisma beachfront",
            Rooms = 6, Bathrooms = 7, AreaInSquareMeters = 780m,
            Kind = ListingKind.Sale, SalePrice = 12_000_000m, PaymentMethod = PaymentMethod.Cash,
            Publish = false,
            Media =
            [
                new() { Url = Img("1502005229762-cf1b2da7c5d6"), Order = 0, IsPrimary = true },
            ],
            Features =
            [
                new() { FeatureName = "Sea View" },
                new() { FeatureName = "Swimming Pool" },
                new() { FeatureName = "Private Garden" },
            ],
        },
    ];
}
