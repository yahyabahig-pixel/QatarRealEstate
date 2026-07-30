using Auth.Application.Abstractions.Messaging;
using Auth.Contracts.Responses;

namespace Auth.Application.Authentication.Login;

public sealed record LoginCommand(string Email, string Password) : ICommand<AuthTokenResponse>;
