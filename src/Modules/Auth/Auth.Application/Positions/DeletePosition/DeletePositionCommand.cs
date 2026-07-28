using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.DeletePosition;

public sealed record DeletePositionCommand(Guid PositionId) : ICommand<Deleted>;
