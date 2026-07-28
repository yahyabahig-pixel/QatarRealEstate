using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.RemovePermission;

public sealed record RemovePermissionCommand(Guid PositionId, string Permission) : ICommand<Updated>;
