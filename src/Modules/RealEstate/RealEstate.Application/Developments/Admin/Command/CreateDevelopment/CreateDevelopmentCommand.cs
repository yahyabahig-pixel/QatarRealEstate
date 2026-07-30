using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;

namespace RealEstate.Application.Developments.Admin.Command.CreateDevelopment;

public sealed record CreateDevelopmentCommand(
    string Name,
    LocationInput Location,   // the SAME input shape properties use; X = lng, Y = lat
    int DeliveryYear,
    string CoverImageUrl,
    string? Slug = null,          // omitted → derived from Name
    string? Description = null,
    int UnitsCount = 0,
    string? DeveloperName = null,
    decimal StartingPrice = 0m,
    string? PaymentPlan = null) : ICommand<Guid>;
