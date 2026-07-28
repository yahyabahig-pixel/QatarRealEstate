using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Developments.Admin.Command.UpdateDevelopment;

public sealed record UpdateDevelopmentCommand(
    Guid Id,
    string Name,
    string AreaName,
    int DeliveryYear,
    string CoverImageUrl,
    string? Slug,
    string? Description,
    int UnitsCount,
    string? DeveloperName,
    decimal StartingPrice,
    string? PaymentPlan) : ICommand<Updated>;
