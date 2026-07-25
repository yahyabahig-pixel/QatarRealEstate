namespace RealEstate.Application.Abstractions.Authentication;

public interface ICurrentUser
{
    Guid UserId { get; }
    bool IsAuthenticated { get; }
    IReadOnlyCollection<string> Roles { get; }
    bool IsInRole(string role);
}