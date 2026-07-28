namespace RealEstate.Api.Requests;

// PUT body — the id comes from the route, everything else from here.
public sealed record UpdateDevelopmentRequest(
    string Name,
    string AreaName,
    int DeliveryYear,
    string CoverImageUrl,
    string? Slug,
    string? Description,
    int UnitsCount,
    string? DeveloperName,
    decimal StartingPrice,
    string? PaymentPlan);
