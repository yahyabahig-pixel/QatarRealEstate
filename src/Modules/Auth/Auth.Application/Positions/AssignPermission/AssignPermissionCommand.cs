using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.AssignPermission;

public sealed record AssignPermissionCommand(Guid PositionId, string Permission) : ICommand<Updated>;
