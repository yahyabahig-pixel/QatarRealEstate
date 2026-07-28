using BuildingBlocks.Domain.Common.Results.Errors;

namespace Auth.Domain.DomainErrors;

public static class AuthErrors
{
    // ONE error for wrong email AND wrong password — user enumeration prevention:
    // an attacker can never learn whether an email exists from the response.
    public static readonly Error InvalidCredentials =
        Error.Unauthorized("Auth.InvalidCredentials", "Invalid email or password.");

    public static readonly Error AccountLocked =
        Error.Unauthorized("Auth.AccountLocked", "The account is temporarily locked. Try again later.");

    public static readonly Error AccountDeactivated =
        Error.Unauthorized("Auth.AccountDeactivated", "The account has been deactivated.");

    public static readonly Error NotAuthenticated =
        Error.Unauthorized("Auth.NotAuthenticated", "User is not authenticated.");
}
