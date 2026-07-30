using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.UpdatePosition;

public sealed record UpdatePositionCommand(Guid PositionId, string Name, string Description) : ICommand<Updated>;
