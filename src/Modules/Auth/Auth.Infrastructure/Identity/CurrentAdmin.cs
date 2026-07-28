using System.Security.Claims;
using Auth.Application.Abstractions.Authentication;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Http;

namespace Auth.Infrastructure.Identity;

// The caller, read from the VALIDATED token's claims — never from payloads.
public sealed class CurrentAdmin : ICurrentAdmin
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentAdmin(IHttpContextAccessor accessor) => _accessor = accessor;

    private ClaimsPrincipal? Principal => _accessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public Guid UserId
    {
        get
        {
            var raw = Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
        }
    }

    public bool IsMainAdmin => Principal?.HasClaim(AuthClaimTypes.MainAdmin, "true") == true;

    public bool HasPermission(string permission) =>
        IsMainAdmin || Principal?.HasClaim(AuthClaimTypes.Permission, permission) == true;

    public bool IsInRole(string role) => Principal?.IsInRole(role) == true;
}
