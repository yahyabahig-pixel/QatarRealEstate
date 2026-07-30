using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;

namespace RealEstate.Application.Developments.Admin.Command.UpdateDevelopment;

public sealed record UpdateDevelopmentCommand(
    Guid Id,
    string Name,
    LocationInput Location,   // X = lng, Y = lat — same shape as property commands
    int DeliveryYear,
    string CoverImageUrl,
    string? Slug,
    string? Description,
    int UnitsCount,
    string? DeveloperName,
    decimal StartingPrice,
    string? PaymentPlan) : ICommand<Updated>;
