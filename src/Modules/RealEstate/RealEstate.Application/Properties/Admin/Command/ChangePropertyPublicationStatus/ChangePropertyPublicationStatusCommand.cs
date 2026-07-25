using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Properties.Admin.ChangePropertyPublicationStatus;

public sealed record ChangePropertyPublicationStatusCommand(
    Guid Id,
    PublicationAction Action,
    string? Reason = null) : ICommand<Updated>;