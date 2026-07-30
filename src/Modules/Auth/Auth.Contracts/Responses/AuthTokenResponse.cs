namespace Auth.Contracts.Responses;

public sealed record AuthTokenResponse(
    string AccessToken,
    DateTimeOffset ExpiresAtUtc);
