using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.RemovePosition;

public sealed record RemovePositionCommand(Guid AdminId) : ICommand<Updated>;
