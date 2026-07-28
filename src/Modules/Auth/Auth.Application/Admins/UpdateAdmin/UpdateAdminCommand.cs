using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.UpdateAdmin;

public sealed record UpdateAdminCommand(Guid AdminId, string FullName) : ICommand<Updated>;
