namespace RealEstate.Application.Developments;

// Same field names the frontend already uses for Property locations (country/city/street/
// state/x/y/description) — one location dialect across the whole API. X = longitude,
// Y = latitude, as strings, exactly as the Location value object stores them.
public sealed record DevelopmentLocationDto(
    string Country,
    string City,
    string Street,
    string State,
    string X,
    string Y,
    string? Description);

public sealed record DevelopmentDto(
    Guid Id,
    string Name,
    string Slug,
    DevelopmentLocationDto Location,
    int DeliveryYear,
    string CoverImageUrl,
    string? Description,
    int UnitsCount,
    string? DeveloperName,
    decimal StartingPrice,
    string? PaymentPlan);
