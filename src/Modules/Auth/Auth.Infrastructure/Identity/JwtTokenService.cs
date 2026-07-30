using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Auth.Application.Abstractions.Identity;
using Auth.Contracts.Responses;
using Auth.Infrastructure.Data;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Auth.Infrastructure.Identity;

public sealed class JwtTokenService : IAuthTokenService
{
    private readonly UserManager<AppUser> _users;
    private readonly AuthDbContext _db;
    private readonly JwtSettings _settings;
    private readonly TimeProvider _clock;

    public JwtTokenService(
        UserManager<AppUser> users, AuthDbContext db,
        IOptions<JwtSettings> settings, TimeProvider clock)
    {
        _users = users;
        _db = db;
        _settings = settings.Value;
        _clock = clock;
    }

    public async Task<AuthTokenResponse> CreateTokenAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString())
                   ?? throw new InvalidOperationException($"User {userId} not found while issuing a token.");

        var claims = new List<Claim>
        {
            // Long-form claim types on purpose: the existing RealEstate CurrentUser
            // reads ClaimTypes.NameIdentifier / ClaimTypes.Role — this feeds it unchanged.
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, user.FullName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        foreach (var role in await _users.GetRolesAsync(user))
            claims.Add(new Claim(ClaimTypes.Role, role));

        // Permissions from the user's position → one claim each.
        if (user.PositionId is { } positionId)
        {
            var permissions = await _db.Positions
                .Where(p => p.Id == positionId && p.IsActive)
                .SelectMany(p => p.Permissions.Select(pp => pp.PermissionName))
                .ToListAsync(ct);

            foreach (var permission in permissions)
                claims.Add(new Claim(AuthClaimTypes.Permission, permission));
        }

        // The bypass claim — set from the DATABASE row, tamper-proofed by the signature.
        if (user.IsMainAdmin)
            claims.Add(new Claim(AuthClaimTypes.MainAdmin, "true"));

        var now = _clock.GetUtcNow();
        var expires = now.AddMinutes(_settings.AccessTokenMinutes);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expires.UtcDateTime,
            signingCredentials: credentials);

        var encoded = new JwtSecurityTokenHandler().WriteToken(token);
        return new AuthTokenResponse(encoded, expires);
    }
}
