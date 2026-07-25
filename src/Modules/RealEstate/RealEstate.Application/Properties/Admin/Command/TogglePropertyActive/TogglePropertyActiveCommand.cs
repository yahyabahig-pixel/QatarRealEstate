using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

public sealed record TogglePropertyActiveCommand(Guid Id, bool IsActive) : ICommand<Updated>;