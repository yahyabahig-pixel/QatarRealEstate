using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Developments.Admin.Command.CreateDevelopment;

public sealed record CreateDevelopmentCommand(
    string Name,
    string AreaName,
    int DeliveryYear,
    string CoverImageUrl,
    string? Slug = null,          // omitted → derived from Name
    string? Description = null,
    int UnitsCount = 0,
    string? DeveloperName = null,
    decimal StartingPrice = 0m,
    string? PaymentPlan = null) : ICommand<Guid>;
