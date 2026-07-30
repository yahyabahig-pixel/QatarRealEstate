using Auth.Application.Abstractions.Messaging;

namespace Auth.Application.Admins.CreateAdmin;

public sealed record CreateAdminCommand(
    string Email,
    string Password,
    string FullName,
    Guid? PositionId) : ICommand<Guid>;
