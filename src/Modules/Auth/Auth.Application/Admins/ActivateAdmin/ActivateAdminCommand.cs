using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.ActivateAdmin;

public sealed record ActivateAdminCommand(Guid AdminId) : ICommand<Updated>;
