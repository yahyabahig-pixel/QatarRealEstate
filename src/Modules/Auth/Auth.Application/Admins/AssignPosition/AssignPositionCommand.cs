using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.AssignPosition;

public sealed record AssignPositionCommand(Guid AdminId, Guid PositionId) : ICommand<Updated>;
