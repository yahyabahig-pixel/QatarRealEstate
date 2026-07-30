using BuildingBlocks.Domain.Common.Results.Errors;

namespace Auth.Domain.DomainErrors;

public static class AdminErrors
{
    public static readonly Error NotFound =
        Error.NotFound("Admin.NotFound", "Admin was not found.");

    public static readonly Error EmailTaken =
        Error.Conflict("Admin.EmailTaken", "An account with this email already exists.");

    // THE protection rule. Every management handler checks the TARGET row for IsMainAdmin
    // before doing anything else — payloads and ids are never trusted.
    public static readonly Error MainAdminProtected =
        Error.Forbidden("Admin.MainAdminProtected", "The Main Admin account cannot be modified, deactivated, or deleted.");

    public static readonly Error AlreadyActive =
        Error.Conflict("Admin.AlreadyActive", "The admin account is already active.");

    public static readonly Error AlreadyInactive =
        Error.Conflict("Admin.AlreadyInactive", "The admin account is already deactivated.");

    public static readonly Error NoPositionAssigned =
        Error.NotFound("Admin.NoPositionAssigned", "The admin has no position assigned.");

    public static readonly Error IdentityFailure =
        Error.Failure("Admin.IdentityFailure", "The identity operation failed.");
}
