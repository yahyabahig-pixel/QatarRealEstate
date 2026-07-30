using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Abstractions.Identity;

// Wraps ASP.NET Core Identity so the Application layer never references UserManager
// directly (clean architecture boundary). Infrastructure implements this with Identity.
public interface IIdentityService
{
    /// <summary>The security-relevant snapshot of one admin, loaded from the DATABASE
    /// (never from the request) — the basis of every Main-Admin protection check.</summary>
    Task<AdminSnapshot?> FindByIdAsync(Guid userId, CancellationToken ct = default);

    Task<AdminSnapshot?> FindByEmailAsync(string email, CancellationToken ct = default);

    /// <summary>Password check with lockout counting. Returns Unauthorized-kind errors only —
    /// never reveals whether the email exists.</summary>
    Task<Result<AdminSnapshot>> CheckCredentialsAsync(string email, string password, CancellationToken ct = default);

    /// <summary>Creates a REGULAR admin (role "Admin"). There is deliberately no parameter
    /// that could produce a Main Admin or a SuperAdmin.</summary>
    Task<Result<Guid>> CreateAdminAsync(string email, string password, string fullName,
        Guid? positionId, CancellationToken ct = default);

    Task<Result<Updated>> UpdateFullNameAsync(Guid userId, string fullName, CancellationToken ct = default);
    Task<Result<Updated>> SetActiveAsync(Guid userId, bool isActive, CancellationToken ct = default);
    Task<Result<Deleted>> DeleteAsync(Guid userId, CancellationToken ct = default);
    Task<Result<Updated>> SetPositionAsync(Guid userId, Guid? positionId, CancellationToken ct = default);

    Task<IReadOnlyList<string>> GetRolesAsync(Guid userId, CancellationToken ct = default);
}

/// <summary>Read model of an admin as Identity + our columns know them.</summary>
public sealed record AdminSnapshot(
    Guid Id,
    string Email,
    string FullName,
    bool IsMainAdmin,
    bool IsActive,
    Guid? PositionId);
