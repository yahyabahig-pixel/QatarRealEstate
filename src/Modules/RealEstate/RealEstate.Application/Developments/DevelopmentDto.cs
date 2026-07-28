namespace RealEstate.Application.Developments;

public sealed record DevelopmentDto(
    Guid Id,
    string Name,
    string Slug,
    string AreaName,
    int DeliveryYear,
    string CoverImageUrl,
    string? Description,
    int UnitsCount,
    string? DeveloperName,
    decimal StartingPrice,
    string? PaymentPlan);
