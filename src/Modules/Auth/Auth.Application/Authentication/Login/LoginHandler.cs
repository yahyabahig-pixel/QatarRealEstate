using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Messaging;
using Auth.Contracts.Responses;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Authentication.Login;

public sealed class LoginHandler : ICommandHandler<LoginCommand, AuthTokenResponse>
{
    private readonly IIdentityService _identity;
    private readonly IAuthTokenService _tokens;

    public LoginHandler(IIdentityService identity, IAuthTokenService tokens)
    {
        _identity = identity;
        _tokens = tokens;
    }

    public async Task<Result<AuthTokenResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        // CheckCredentialsAsync does Identity's password verification + lockout counting,
        // rejects deactivated accounts, and returns ONE generic error for anything wrong —
        // user enumeration prevention lives there, not here.
        var check = await _identity.CheckCredentialsAsync(request.Email, request.Password, cancellationToken);
        if (check.IsError) return check.Errors;

        return await _tokens.CreateTokenAsync(check.Value.Id, cancellationToken);
    }
}
