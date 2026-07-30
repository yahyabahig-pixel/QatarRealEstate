namespace Auth.Application.Abstractions.Authentication;

// The caller, as proven by the validated JWT. Richer than RealEstate's ICurrentUser
// because auth handlers reason about permissions and Main-Admin status.
// NEVER derived from request payloads — only from HttpContext.User claims.
public interface ICurrentAdmin
{
    Guid UserId { get; }
    bool IsAuthenticated { get; }
    bool IsMainAdmin { get; }
    bool HasPermission(string permission);
    bool IsInRole(string role);
}
