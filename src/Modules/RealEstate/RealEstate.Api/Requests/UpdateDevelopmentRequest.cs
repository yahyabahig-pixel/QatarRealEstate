using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;

namespace RealEstate.Api.Requests;

// PUT body — the id comes from the route, everything else from here.
public sealed record UpdateDevelopmentRequest(
    string Name,
    LocationInput Location,
    int DeliveryYear,
    string CoverImageUrl,
    string? Slug,
    string? Description,
    int UnitsCount,
    string? DeveloperName,
    decimal StartingPrice,
    string? PaymentPlan);
