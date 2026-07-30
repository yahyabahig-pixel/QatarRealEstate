using BuildingBlocks.Domain.Common;

namespace Auth.Domain.Entities;

// One granted permission on a Position. Lives INSIDE the Position aggregate —
// no public factory validation here because Position.AssignPermission is the only door in,
// and it already validated against the catalog.
public sealed class PositionPermission : AuditableEntity
{
    public Guid PositionId { get; private set; }
    public string PermissionName { get; private set; } = string.Empty;

    private PositionPermission() { }   // EF Core

    internal static PositionPermission Create(string permissionName) =>
        new() { PermissionName = permissionName };
}
