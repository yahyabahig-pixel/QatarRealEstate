using BuildingBlocks.Domain.Common.Results.Errors;

namespace Auth.Domain.DomainErrors;

public static class PositionErrors
{
    public static readonly Error NameRequired =
        Error.Validation("Position.NameRequired", "Position name is required.");

    public static readonly Error NameTooLong =
        Error.Validation("Position.NameTooLong", "Position name is too long.");

    public static readonly Error DescriptionTooLong =
        Error.Validation("Position.DescriptionTooLong", "Position description is too long.");

    public static readonly Error NotFound =
        Error.NotFound("Position.NotFound", "Position was not found.");

    public static readonly Error DuplicateName =
        Error.Conflict("Position.DuplicateName", "A position with this name already exists.");

    public static readonly Error UnknownPermission =
        Error.Validation("Position.UnknownPermission", "The permission is not in the catalog.");

    public static readonly Error DuplicatePermission =
        Error.Conflict("Position.DuplicatePermission", "The position already has this permission.");

    public static readonly Error PermissionNotAssigned =
        Error.NotFound("Position.PermissionNotAssigned", "The position does not have this permission.");

    public static readonly Error AlreadyActive =
        Error.Conflict("Position.AlreadyActive", "The position is already active.");

    public static readonly Error AlreadyInactive =
        Error.Conflict("Position.AlreadyInactive", "The position is already inactive.");

    public static readonly Error InUse =
        Error.Conflict("Position.InUse", "The position is assigned to one or more admins and cannot be deleted.");
}
