using BuildingBlocks.Authorization;
using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using Auth.Domain.DomainErrors;

namespace Auth.Domain.Entities;

// ---------------------------------------------------------------------------------------------
//  Position — a named bundle of permissions ("Property Manager").
//
//  The aggregate owns its permission set the same way Property owns Media: private list,
//  read-only view out, every mutation goes through a method that enforces the rules.
//  Permission names are validated against AppPermissions.Catalog — a string that is not in
//  the catalog can NEVER be stored, so a typo can never silently grant nothing (or, worse,
//  wait in the table until a permission with that name appears).
// ---------------------------------------------------------------------------------------------
public sealed class Position : AuditableEntity
{
    public const int MaxNameLength = 100;
    public const int MaxDescriptionLength = 500;

    private readonly List<PositionPermission> _permissions = new();

    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;

    public IReadOnlyCollection<PositionPermission> Permissions => _permissions.AsReadOnly();

    private Position() { }   // EF Core

    public static Result<Position> Create(string name, string description)
    {
        if (string.IsNullOrWhiteSpace(name))
            return PositionErrors.NameRequired;

        if (name.Trim().Length > MaxNameLength)
            return PositionErrors.NameTooLong;

        if (description is { Length: > MaxDescriptionLength })
            return PositionErrors.DescriptionTooLong;

        return new Position
        {
            Name = name.Trim(),
            Description = description?.Trim() ?? string.Empty,
            IsActive = true
        };
    }

    public Result<Updated> Update(string name, string description)
    {
        if (string.IsNullOrWhiteSpace(name))
            return PositionErrors.NameRequired;

        if (name.Trim().Length > MaxNameLength)
            return PositionErrors.NameTooLong;

        if (description is { Length: > MaxDescriptionLength })
            return PositionErrors.DescriptionTooLong;

        Name = name.Trim();
        Description = description?.Trim() ?? string.Empty;
        return Result.Updated;
    }

    public Result<Updated> AssignPermission(string permission)
    {
        if (string.IsNullOrWhiteSpace(permission) || !AppPermissions.IsValid(permission))
            return PositionErrors.UnknownPermission;

        if (_permissions.Any(p => p.PermissionName == permission))
            return PositionErrors.DuplicatePermission;

        _permissions.Add(PositionPermission.Create(permission));
        return Result.Updated;
    }

    public Result<Updated> RemovePermission(string permission)
    {
        var existing = _permissions.FirstOrDefault(p => p.PermissionName == permission);
        if (existing is null)
            return PositionErrors.PermissionNotAssigned;

        _permissions.Remove(existing);
        return Result.Updated;
    }

    public Result<Updated> Activate()
    {
        if (IsActive) return PositionErrors.AlreadyActive;
        IsActive = true;
        return Result.Updated;
    }

    public Result<Updated> Deactivate()
    {
        if (!IsActive) return PositionErrors.AlreadyInactive;
        IsActive = false;
        return Result.Updated;
    }
}
