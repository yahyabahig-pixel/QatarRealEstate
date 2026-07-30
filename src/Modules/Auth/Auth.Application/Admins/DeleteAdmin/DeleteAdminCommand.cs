using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.DeleteAdmin;

public sealed record DeleteAdminCommand(Guid AdminId) : ICommand<Deleted>;
