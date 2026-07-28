using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.DeactivateAdmin;

public sealed record DeactivateAdminCommand(Guid AdminId) : ICommand<Updated>;
