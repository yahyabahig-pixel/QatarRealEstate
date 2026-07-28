namespace RealEstate.Domain.Constants;

// ---------------------------------------------------------------------------------------------
//  The curated real-estate icon catalog — the ONLY icon keys a Feature may store.
//  Mirrors frontend/src/lib/featureIcons.jsx (the visual registry). Keys are stable kebab-case
//  identifiers; the frontend resolves them to icon components. Legacy keys (from rows seeded
//  before the picker existed) remain valid so old data keeps working without a migration.
// ---------------------------------------------------------------------------------------------
public static class FeatureIconCatalog
{
    public static readonly IReadOnlySet<string> Keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        // Amenities
        "swimming-pool", "gym", "spa", "sauna", "jacuzzi", "playground", "bbq", "garden",
        "rooftop", "clubhouse",
        // Property
        "house", "apartment", "villa", "bedroom", "bathroom", "kitchen", "living-room",
        "balcony", "terrace", "storage", "walk-in-closet", "floor",
        // Parking & transport
        "parking", "garage", "covered-parking", "ev-charging", "public-transport", "metro",
        // Security
        "security", "cctv", "access-control", "gated-community", "concierge",
        // Building
        "elevator", "air-conditioning", "heating", "generator", "fire-safety",
        // Connectivity
        "wifi", "internet", "smart-home", "intercom",
        // Location & view
        "sea-view", "beach-access", "city-view", "garden-view", "pool-view",
        "near-school", "near-hospital", "near-metro",
        // Family & education
        "school", "nursery", "kids-area", "family-area",
        // Lifestyle
        "restaurant", "cafe", "shopping", "supermarket", "mosque", "hospital", "pets-allowed",
        // Outdoor
        "beach", "park", "walking-area", "cycling", "sports-court",
        // Legacy keys from the original seed data (aliased in the frontend registry)
        "pool", "bed", "waves", "ac", "shield", "pet", "car", "stairs", "sofa",
    };

    public static bool IsValid(string? key) =>
        string.IsNullOrWhiteSpace(key) || Keys.Contains(key.Trim());
}
