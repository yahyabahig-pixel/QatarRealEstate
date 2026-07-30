namespace BuildingBlocks.Authorization;

// Custom claim types carried inside OUR signed JWT. Prefixed to never collide with
// the standard claim URIs.
public static class AuthClaimTypes
{
    /// <summary>One claim per permission the user's position grants.</summary>
    public const string Permission = "auth:permission";

    /// <summary>Present (value "true") ONLY on the single Main Admin. Set from the DB row at
    /// token time — no API can request it, and the signature makes it tamper-proof.</summary>
    public const string MainAdmin = "auth:main_admin";
}
