namespace Auth.Infrastructure.Identity;

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;

    // MUST be at least 32 characters. Comes from configuration —
    // dev value in appsettings.Development.json, production value from
    // user-secrets / environment variables. NEVER commit a production secret.
    public string Secret { get; init; } = string.Empty;

    public int AccessTokenMinutes { get; init; } = 60;
}
