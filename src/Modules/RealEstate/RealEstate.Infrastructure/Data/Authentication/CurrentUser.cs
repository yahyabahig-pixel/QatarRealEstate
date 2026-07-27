using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using RealEstate.Application.Abstractions.Authentication;

namespace RealEstate.Infrastructure.Data.Authentication;
//THIS CLASS IS USED TO GET THE CURRENT USER INFORMATION FROM THE HTTP CONTEXT
public sealed class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUser(IHttpContextAccessor accessor) => _accessor = accessor;

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

    public IReadOnlyCollection<string> Roles =>
        Principal?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray()
        ?? Array.Empty<string>();

    public bool IsInRole(string role) => Principal?.IsInRole(role) == true;
}