using Auth.Contracts.Responses;

namespace Auth.Application.Abstractions.Identity;

public interface IAuthTokenService
{
    /// <summary>Builds the signed JWT for an authenticated admin: id, roles,
    /// permission claims from their position, and the main-admin claim if applicable.</summary>
    Task<AuthTokenResponse> CreateTokenAsync(Guid userId, CancellationToken ct = default);
}
