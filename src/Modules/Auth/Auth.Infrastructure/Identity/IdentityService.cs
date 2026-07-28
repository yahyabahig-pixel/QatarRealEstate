using Auth.Application.Abstractions.Identity;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using Microsoft.AspNetCore.Identity;

namespace Auth.Infrastructure.Identity;

// The ONLY class that touches UserManager/SignInManager. Application talks to the
// IIdentityService interface; Identity does all password/lockout/store work.
public sealed class IdentityService : IIdentityService
{
    private readonly UserManager<AppUser> _users;
    private readonly SignInManager<AppUser> _signIn;

    public IdentityService(UserManager<AppUser> users, SignInManager<AppUser> signIn)
    {
        _users = users;
        _signIn = signIn;
    }

    public async Task<AdminSnapshot?> FindByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        return user is null ? null : ToSnapshot(user);
    }

    public async Task<AdminSnapshot?> FindByEmailAsync(string email, CancellationToken ct = default)
    {
        var user = await _users.FindByEmailAsync(email);
        return user is null ? null : ToSnapshot(user);
    }

    public async Task<Result<AdminSnapshot>> CheckCredentialsAsync(
        string email, string password, CancellationToken ct = default)
    {
        var user = await _users.FindByEmailAsync(email);

        // Unknown email → the SAME error as wrong password. Enumeration prevention.
        if (user is null) return AuthErrors.InvalidCredentials;

        // lockoutOnFailure: true → Identity counts failures and locks the account.
        var check = await _signIn.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);

        if (check.IsLockedOut) return AuthErrors.AccountLocked;
        if (!check.Succeeded) return AuthErrors.InvalidCredentials;

        // Deactivated admins authenticate correctly but are still turned away.
        if (!user.IsActive) return AuthErrors.AccountDeactivated;

        return ToSnapshot(user);
    }

    public async Task<Result<Guid>> CreateAdminAsync(
        string email, string password, string fullName, Guid? positionId, CancellationToken ct = default)
    {
        var existing = await _users.FindByEmailAsync(email);
        if (existing is not null) return AdminErrors.EmailTaken;

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            FullName = fullName.Trim(),
            IsActive = true,
            IsMainAdmin = false,          // structurally: created admins are NEVER the Main Admin
            PositionId = positionId,
        };

        var created = await _users.CreateAsync(user, password);
        if (!created.Succeeded) return ToError(created);

        // Role fixed to "Admin" — no parameter exists to choose SuperAdmin. By design.
        var roled = await _users.AddToRoleAsync(user, AuthRoles.Admin);
        if (!roled.Succeeded)
        {
            await _users.DeleteAsync(user);   // don't leave a role-less half-created account
            return ToError(roled);
        }

        return user.Id;
    }

    public async Task<Result<Updated>> UpdateFullNameAsync(Guid userId, string fullName, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return AdminErrors.NotFound;

        user.FullName = fullName.Trim();
        var updated = await _users.UpdateAsync(user);
        return updated.Succeeded ? Result.Updated : ToError(updated);
    }

    public async Task<Result<Updated>> SetActiveAsync(Guid userId, bool isActive, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return AdminErrors.NotFound;

        // Belt-and-braces: the handler already refused Main-Admin targets; refuse again
        // here so no future code path can deactivate the Main Admin by accident.
        if (user.IsMainAdmin) return AdminErrors.MainAdminProtected;

        user.IsActive = isActive;
        var updated = await _users.UpdateAsync(user);
        return updated.Succeeded ? Result.Updated : ToError(updated);
    }

    public async Task<Result<Deleted>> DeleteAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return AdminErrors.NotFound;

        if (user.IsMainAdmin) return AdminErrors.MainAdminProtected;   // second lock on the same door

        var deleted = await _users.DeleteAsync(user);
        return deleted.Succeeded ? Result.Deleted : ToError(deleted);
    }

    public async Task<Result<Updated>> SetPositionAsync(Guid userId, Guid? positionId, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return AdminErrors.NotFound;

        if (user.IsMainAdmin) return AdminErrors.MainAdminProtected;

        user.PositionId = positionId;
        var updated = await _users.UpdateAsync(user);
        return updated.Succeeded ? Result.Updated : ToError(updated);
    }

    public async Task<IReadOnlyList<string>> GetRolesAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return Array.Empty<string>();
        var roles = await _users.GetRolesAsync(user);
        return roles.ToArray();
    }

    private static AdminSnapshot ToSnapshot(AppUser u) =>
        new(u.Id, u.Email ?? string.Empty, u.FullName, u.IsMainAdmin, u.IsActive, u.PositionId);

    private static Error ToError(IdentityResult result)
    {
        var first = result.Errors.FirstOrDefault();
        return first is null
            ? AdminErrors.IdentityFailure
            : Error.Validation($"Identity.{first.Code}", first.Description);
    }
}
